-- ============================================================
-- DILLO QUI — Installazione completa del database
-- ============================================================
--
-- Unico script di installazione. Si esegue una volta sola, dall'inizio
-- alla fine, su un progetto Supabase vuoto.
--
-- È ordinato per DIPENDENZE, non per cronologia: ogni oggetto compare
-- dopo tutto ciò che gli serve e prima di tutto ciò che lo usa. Quella
-- che leggi è quindi la forma definitiva di ogni tabella, policy e
-- funzione — non ci sono versioni intermedie da cui diffidare.
--
-- Indice:
--    0. Prerequisiti
--    1. Tabelle
--    2. Indici
--    3. Row Level Security
--    4. Funzioni di supporto (servono alle policy)
--    5. Policy
--    6. Permessi di colonna
--    7. Viste
--    8. Trigger
--    9. RPC — registrazione e profilo
--   10. RPC — forum
--   11. RPC — segnalazioni anonime
--   12. RPC — pannello di piattaforma
--   13. RPC — privacy, conservazione, notifiche
--   14. Realtime
--   15. Dati iniziali
--   16. Ricarica dello schema
--
-- Dopo l'esecuzione:
--   1. `verifica_stato.sql` — non deve comparire nessun «DA SISTEMARE»
--   2. registrati dall'app: lo sportello 'demo' esiste già (sezione 15)
--   3. per il pannello di piattaforma, dal SQL Editor:
--        SELECT public.set_platform_password('tua@email', 'password-lunga');
--
-- Per ripartire da zero su un database già popolato: `reset_completo.sql`.
-- ============================================================


-- ============================================================
-- 0. PREREQUISITI
-- ============================================================

-- crypt() e gen_salt() servono all'hash bcrypt della password del
-- pannello (sezione 12). Su Supabase pgcrypto è già presente nello
-- schema `extensions`: il blocco serve ai database creati a mano.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
      CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    ELSE
      CREATE EXTENSION pgcrypto;
    END IF;
  END IF;
END $$;


-- ============================================================
-- 1. TABELLE
-- In ordine di dipendenza: ogni chiave esterna punta a qualcosa che
-- esiste già.
-- ============================================================

-- Gli sportelli: uno per scuola.
--
-- `verified` nasce FALSE. Chiunque può aprire uno sportello, ma gli
-- studenti vedono lo stato dichiarato prima di iscriversi, così una box
-- aperta da uno sconosciuto non può spacciarsi per ufficiale. Le scuole
-- con dominio .edu.it si verificano da sole (trigger nella sezione 8):
-- quel dominio è assegnato dal Registro .it solo a scuole statali e
-- paritarie, previa verifica del codice meccanografico.
--
-- `suspended` blocca le scritture senza cancellare niente: serve a
-- fermare uno sportello problematico conservando ciò che gli studenti
-- gli hanno affidato.
CREATE TABLE public.boxes (
  slug              TEXT        PRIMARY KEY,
  name              TEXT        NOT NULL,
  whitelist         TEXT[]      NOT NULL DEFAULT '{}',
  categories        TEXT[]      NOT NULL DEFAULT '{}',
  email_filter_mode TEXT        NOT NULL DEFAULT 'exact',
  require_class     BOOLEAN     NOT NULL DEFAULT FALSE,
  notif_emails      TEXT[]      NOT NULL DEFAULT '{}',
  regolamento       TEXT        NOT NULL DEFAULT '',
  verified          BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  verified_note     TEXT,
  suspended         BOOLEAN     NOT NULL DEFAULT FALSE,
  suspended_at      TIMESTAMPTZ,
  suspended_note    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.boxes.regolamento IS
  'Testo del regolamento dello sportello, modificabile dagli admin e visibile agli studenti.';

COMMENT ON COLUMN public.boxes.whitelist IS
  'Email o domini ammessi alla registrazione. Vuota = nessun filtro. Non leggibile dal client: esposta solo la vista boxes_public, che la esclude.';

-- I profili, specchio di auth.users.
--
-- `role` include 'banned': il ban è applicato dal database (vedi
-- is_active_user nella sezione 4), non dall'interfaccia.
--
-- `email` è una copia di comodo per le query: la fonte autorevole resta
-- auth.users, e un trigger (sezione 8) impedisce al client di scostarla.
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  role          TEXT        NOT NULL CHECK (role IN ('student', 'admin', 'banned')),
  nome          TEXT,
  cognome       TEXT,
  classe        TEXT,
  box_slug      TEXT        REFERENCES public.boxes(slug) ON DELETE SET NULL ON UPDATE CASCADE,
  default_anon  BOOLEAN     NOT NULL DEFAULT TRUE,
  notifications BOOLEAN     NOT NULL DEFAULT TRUE,
  notif_prefs   JSONB       NOT NULL DEFAULT '{
    "push_enabled": false,
    "new_report": true,
    "chat_message": true,
    "status_change": true,
    "forum_comment": true
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Le segnalazioni.
--
-- COME FUNZIONA L'ANONIMATO
--   identificata: author_id = UUID reale,  anon_token = NULL
--   anonima:      author_id = NULL,        anon_token = UUID casuale
--
-- Nelle anonime author_id è NULL nella tabella stessa, non solo nelle
-- viste: il legame con l'autore vive in report_owners, che nessun admin
-- può leggere. L'anonimato è quindi reale anche verso il database.
--
-- anon_token sopravvive solo per soddisfare chk_author_xor_token. NON è
-- più una credenziale: l'autore anonimo si autentica col proprio JWT
-- (sezione 11) e la colonna non è leggibile da nessun client (sezione 6).
CREATE TABLE public.reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  box_slug     TEXT        NOT NULL REFERENCES public.boxes(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  anon_token   UUID,
  type         TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  is_public    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_anonymous BOOLEAN     NOT NULL DEFAULT TRUE,
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- O l'autore O il token, mai entrambi e mai nessuno.
  -- Conseguenza da tenere a mente: cancellare un utente NON può limitarsi
  -- a lasciare author_id a NULL, perché violerebbe questo vincolo. Vedi
  -- delete_my_account e apply_retention nella sezione 13.
  CONSTRAINT chk_author_xor_token CHECK (
    (author_id IS NOT NULL AND anon_token IS NULL) OR
    (author_id IS NULL AND anon_token IS NOT NULL)
  )
);

-- I commenti del forum. author_id è NULLABLE: nei commenti anonimi vale
-- NULL, esattamente come nelle segnalazioni.
CREATE TABLE public.comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id    UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_token   UUID,
  is_anonymous BOOLEAN     NOT NULL DEFAULT TRUE,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comment_author CHECK (
    (author_id IS NOT NULL AND anon_token IS NULL) OR
    (author_id IS NULL AND anon_token IS NOT NULL)
  )
);

-- Un voto per utente per segnalazione: lo garantisce la chiave primaria.
CREATE TABLE public.votes (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, report_id)
);

-- La chat privata fra chi segnala e l'admin dello sportello.
-- Nei messaggi dell'autore anonimo author_id resta NULL: è ciò che
-- l'admin vede, e non deve cambiare solo perché la conversazione è in corso.
CREATE TABLE public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  anon_token UUID,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Il legame privato fra una segnalazione anonima e il suo autore.
--
-- È il cuore dell'anonimato: l'admin non la legge mai, e serve al
-- database per riconoscere l'autore (sezione 11) e al server per
-- instradargli le notifiche, senza rivelarne l'identità.
--
-- report_id è la CHIAVE PRIMARIA, quindi una segnalazione ha un solo
-- proprietario e nessuno può aggiungersene un secondo.
CREATE TABLE public.report_owners (
  report_id  UUID        PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chi gestisce la piattaforma, non la singola scuola. Si popola solo
-- dal SQL Editor con set_platform_password (sezione 12).
CREATE TABLE public.platform_admins (
  user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  note            TEXT,
  password_hash   TEXT,
  failed_attempts INT         NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gli sblocchi del pannello. Vivono qui e non in localStorage: il
-- client non può fingere di essere sbloccato.
CREATE TABLE public.platform_sessions (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Il centro notifiche in-app. Le scrive solo la Edge Function con il
-- service role: per `authenticated` non esiste nessuna policy di INSERT.
CREATE TABLE public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,   -- chat_message | status_change | new_report | forum_comment
  title       TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL DEFAULT '',
  url         TEXT        NOT NULL DEFAULT '/',
  report_id   UUID        REFERENCES public.reports(id) ON DELETE CASCADE,
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- I dispositivi iscritti alle Web Push: un utente può averne più di uno.
CREATE TABLE public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registro delle cancellazioni automatiche: senza una traccia, una
-- retention è indistinguibile da una perdita di dati.
CREATE TABLE public.retention_log (
  id                     BIGSERIAL PRIMARY KEY,
  eseguito_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  simulazione            BOOLEAN NOT NULL,
  mesi                   INT NOT NULL,
  account_eliminati      INT NOT NULL DEFAULT 0,
  segnalazioni_eliminate INT NOT NULL DEFAULT 0
);

-- Evita che la Edge Function mandi due volte la notifica dello stesso
-- evento. La chiave primaria è l'evento, non la riga.
CREATE TABLE public.notification_event_log (
  actor_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('new_report', 'chat_message', 'forum_comment')),
  event_id   UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_type, event_id)
);


-- ============================================================
-- 2. INDICI
-- ============================================================

CREATE INDEX idx_reports_box_slug   ON public.reports(box_slug);
CREATE INDEX idx_reports_author_id  ON public.reports(author_id);
CREATE INDEX idx_reports_anon_token ON public.reports(anon_token);
CREATE INDEX idx_comments_report_id ON public.comments(report_id);
CREATE INDEX idx_votes_report_id    ON public.votes(report_id);
CREATE INDEX idx_chat_report_id     ON public.chat_messages(report_id);

-- Serve a get_my_anon_reports (sezione 11), che parte dall'utente.
CREATE INDEX idx_report_owners_user ON public.report_owners(user_id);

-- Il forum chiede i post più recenti di uno sportello. Senza questo
-- indice parziale, prendere i primi 50 costringe comunque a leggere e
-- ordinare tutti i post pubblici: il tetto risparmierebbe la rete ma
-- non il database, e la pagina si aggiorna da sola ogni 45 secondi.
CREATE INDEX idx_reports_forum_recenti
  ON public.reports (box_slug, created_at DESC)
  WHERE is_public = true;

CREATE INDEX idx_notif_user_read    ON public.notifications(user_id, read);
CREATE INDEX idx_notif_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_push_subs_user     ON public.push_subscriptions(user_id);


-- ============================================================
-- 3. ROW LEVEL SECURITY
--
-- Prima delle policy, e su OGNI tabella. In PostgreSQL una policy
-- esiste ma non viene applicata finché la RLS è disattiva: senza queste
-- righe tutta la sezione 5 sarebbe decorativa e qualsiasi utente
-- autenticato leggerebbe tutto.
--
-- Le quattro tabelle di servizio (platform_admins, platform_sessions,
-- retention_log, notification_event_log) hanno la RLS attiva e NESSUNA
-- policy: è voluto. Sono invisibili e non scrivibili dal client, che le
-- raggiunge solo attraverso le funzioni SECURITY DEFINER.
-- ============================================================

ALTER TABLE public.boxes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_owners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_event_log ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. FUNZIONI DI SUPPORTO
--
-- Stanno qui perché le policy della sezione 5 le richiamano, e
-- PostgreSQL valida l'espressione di una policy quando la crea: se
-- queste funzioni arrivassero dopo, la sezione 5 fallirebbe.
--
-- Sono quasi tutte SECURITY DEFINER e STABLE. SECURITY DEFINER non è un
-- vezzo: `get_my_role` legge `profiles`, e se girasse coi privilegi del
-- chiamante le policy su `profiles` chiamerebbero se stesse in ricorsione
-- infinita. Tutte fissano `search_path`, altrimenti un utente potrebbe
-- creare oggetti omonimi in uno schema che precede `public` e dirottarle.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_box_slug()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT box_slug FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- L'email del profilo è un dato di visualizzazione, non una fonte di
-- autorizzazione: il client potrebbe provare a modificarla. Questa legge
-- la sorgente verificata di Supabase Auth, e solo per l'utente corrente.
CREATE OR REPLACE FUNCTION public.get_authenticated_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, auth
AS $$
  SELECT lower(email) FROM auth.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_authenticated_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_authenticated_email() TO authenticated;

-- Confronto email ↔ whitelist dello sportello, lato server.
--   whitelist vuota  → true (nessun filtro attivo)
--   mode 'domain'    → l'email finisce con @dominio
--   mode 'exact'     → corrispondenza esatta
CREATE OR REPLACE FUNCTION public.check_email_allowed(p_slug TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_whitelist TEXT[];
  v_mode      TEXT;
  v_email     TEXT;
  v_entry     TEXT;
  v_domain    TEXT;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  IF p_slug IS NULL OR trim(p_slug) = '' OR v_email = '' THEN
    RETURN false;
  END IF;

  SELECT b.whitelist, COALESCE(b.email_filter_mode, 'exact')
  INTO v_whitelist, v_mode
  FROM public.boxes b
  WHERE b.slug = p_slug;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Nessuna voce → filtro disattivo.
  -- Attenzione: cardinality('{}') in PostgreSQL è NULL, non 0.
  IF v_whitelist IS NULL OR COALESCE(cardinality(v_whitelist), 0) = 0 THEN
    RETURN true;
  END IF;

  FOREACH v_entry IN ARRAY v_whitelist LOOP
    v_entry := lower(trim(v_entry));
    IF v_entry = '' THEN
      CONTINUE;
    END IF;

    IF v_mode = 'domain' THEN
      v_domain := ltrim(v_entry, '@');
      IF right(v_email, length(v_domain) + 1) = '@' || v_domain THEN
        RETURN true;
      END IF;
    ELSIF v_email = v_entry THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.check_email_allowed(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_allowed(TEXT, TEXT) TO anon, authenticated;

-- Autenticato e non bannato. Il ban era applicato solo nell'interfaccia:
-- chi veniva bloccato continuava a scrivere chiamando l'API con la
-- propria sessione. Da qui il blocco è nel database.
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role <> 'banned'
  );
$$;

-- Sportello non sospeso. La sospensione non è un avviso grafico: la
-- applicano le policy, quindi vale anche per chi chiama l'API a mano.
CREATE OR REPLACE FUNCTION public.is_box_open(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boxes b
    WHERE b.slug = p_slug
      AND b.suspended = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_platform_session()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_sessions s
    WHERE s.user_id = auth.uid()
      AND s.expires_at > NOW()
  );
$$;

-- Unico punto in cui si decide «questa segnalazione anonima è tua».
-- Tutte le RPC anonime (sezione 11) e la policy di lettura della chat
-- passano da qui, così la regola sta scritta una volta sola.
-- Se auth.uid() è NULL il confronto non produce righe e risponde false.
CREATE OR REPLACE FUNCTION public.owns_anon_report(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.report_owners ro
    JOIN public.reports r ON r.id = ro.report_id
    WHERE ro.report_id = p_report_id
      AND ro.user_id = auth.uid()
      AND r.is_anonymous
  );
$$;

REVOKE ALL ON FUNCTION public.owns_anon_report(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_anon_report(UUID) TO authenticated;


-- ============================================================
-- 5. POLICY
-- ============================================================

-- ------------------------------------------------------------
-- boxes
-- Nessuna policy di lettura pubblica: whitelist e notif_emails sono
-- email di studenti e dirigenti. Chi non è admin passa dalla vista
-- boxes_public (sezione 7), che espone solo colonne innocue.
-- ------------------------------------------------------------

CREATE POLICY "Admin legge il proprio box" ON public.boxes
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    AND public.get_my_box_slug() = boxes.slug
  );

CREATE POLICY "Admin puo aggiornare il proprio box" ON public.boxes
  FOR UPDATE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = boxes.slug
  ) WITH CHECK (true);

-- Serve al pulsante «elimina lo sportello» delle impostazioni admin:
-- senza questa policy la DELETE partiva e la RLS la respingeva in
-- silenzio. Distinta da delete_box (sezione 12), che è del gestore
-- della piattaforma. Le segnalazioni seguono in CASCADE, i profili
-- degli studenti restano con box_slug a NULL.
CREATE POLICY "Admin puo eliminare il proprio box" ON public.boxes
  FOR DELETE USING (
    public.get_my_role() = 'admin'
    AND public.get_my_box_slug() = boxes.slug
  );

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

CREATE POLICY "Utente legge il proprio profilo" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin legge i profili del proprio box" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = profiles.box_slug
  );

-- Alla registrazione: sempre studente, email obbligatoriamente quella
-- verificata da Auth, e lo sportello solo se la whitelist lo consente.
CREATE POLICY "Utente crea il proprio profilo" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND role = 'student'
    AND lower(email) = public.get_authenticated_email()
    AND (
      box_slug IS NULL
      OR public.check_email_allowed(box_slug, public.get_authenticated_email())
    )
  );

-- Il confronto con l'email verificata impedisce un'escalation in due
-- richieste: cambiare l'email del profilo, poi usarla per entrare in uno
-- sportello la cui whitelist non ammetteva quella vera.
CREATE POLICY "Utente aggiorna il proprio profilo" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_my_role()          -- il ruolo non si cambia da soli
    AND lower(email) = public.get_authenticated_email()
    AND (
      public.get_my_box_slug() IS NULL       -- prima assegnazione
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
    )
    AND (
      box_slug IS NULL
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
      OR public.check_email_allowed(box_slug, public.get_authenticated_email())
    )
  );

-- L'admin della scuola può bannare e sbannare, nient'altro. Il WITH
-- CHECK su role è essenziale: senza, un admin promuoverebbe ad admin
-- uno studente qualsiasi, dandogli accesso a tutte le segnalazioni.
-- Il proprio profilo lo modifica dalla policy precedente.
CREATE POLICY "Admin aggiorna i profili del proprio box" ON public.profiles
  FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND public.get_my_box_slug() = profiles.box_slug
    AND profiles.id <> auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND public.get_my_box_slug() = profiles.box_slug
    AND role IN ('student', 'banned')
  );

-- ------------------------------------------------------------
-- reports
-- ------------------------------------------------------------

CREATE POLICY "Studente vede le proprie segnalazioni" ON public.reports
  FOR SELECT USING (author_id = auth.uid());

CREATE POLICY "Studente vede i post pubblici del suo box" ON public.reports
  FOR SELECT USING (
    is_public = true AND
    box_slug = public.get_my_box_slug()
  );

-- L'admin legge tutto il proprio sportello. È la policy su cui si
-- appoggia reports_admin_view (sezione 7): la vista ha
-- security_invoker = true proprio per far valere questa riga.
CREATE POLICY "Admin vede tutte le segnalazioni del suo box" ON public.reports
  FOR SELECT USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = reports.box_slug
  );

-- La coppia author_id / anon_token non è negoziabile: impedisce sia di
-- firmare una segnalazione a nome di un altro, sia di crearne una
-- «anonima» conservando il proprio identificativo.
CREATE POLICY "Utente puo inviare segnalazioni" ON public.reports
  FOR INSERT WITH CHECK (
    public.is_active_user() AND
    box_slug = public.get_my_box_slug() AND
    public.is_box_open(box_slug) AND
    (
      (is_anonymous = false AND author_id = auth.uid() AND anon_token IS NULL) OR
      (is_anonymous = true  AND author_id IS NULL      AND anon_token IS NOT NULL)
    )
  );

-- L'autore identificato può dire «per me è finita», non riportare in
-- lavorazione una pratica archiviata. Quali campi può toccare lo decide
-- il trigger trg_restrict_author_report_update (sezione 8): una policy
-- non sa confrontare il valore nuovo col vecchio.
CREATE POLICY "Autore aggiorna le proprie segnalazioni" ON public.reports
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND status IN ('resolved', 'closed')
  );

CREATE POLICY "Admin puo aggiornare segnalazioni del suo box" ON public.reports
  FOR UPDATE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = reports.box_slug
  );

CREATE POLICY "Admin puo eliminare segnalazioni del suo box" ON public.reports
  FOR DELETE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = reports.box_slug
  );

-- ------------------------------------------------------------
-- comments
-- ------------------------------------------------------------

CREATE POLICY "Utenti leggono commenti dei post pubblici" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = comments.report_id
        AND r.is_public = true
        AND r.box_slug = public.get_my_box_slug()
    )
  );

-- Il vincolo sul report non è ridondante: senza, conoscendo l'UUID di
-- una segnalazione di un'altra scuola (o privata) si inserivano commenti
-- invisibili in lettura ma presenti nel database.
CREATE POLICY "Utente autenticato puo commentare" ON public.comments
  FOR INSERT WITH CHECK (
    public.is_active_user() AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = comments.report_id
        AND r.box_slug = public.get_my_box_slug()
        AND r.is_public = true
        AND public.is_box_open(r.box_slug)
    ) AND
    (
      (is_anonymous = false AND author_id = auth.uid() AND anon_token IS NULL) OR
      (is_anonymous = true  AND author_id IS NULL      AND anon_token IS NOT NULL)
    )
  );

CREATE POLICY "Admin puo eliminare commenti del suo box" ON public.comments
  FOR DELETE USING (
    public.get_my_role() = 'admin' AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = comments.report_id
        AND r.box_slug = public.get_my_box_slug()
    )
  );

-- ------------------------------------------------------------
-- votes
-- ------------------------------------------------------------

CREATE POLICY "Utenti leggono i voti nel loro box" ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = votes.report_id
        AND r.box_slug = public.get_my_box_slug()
    )
  );

CREATE POLICY "Utente puo votare" ON public.votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    public.is_active_user() AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = votes.report_id
        AND r.box_slug = public.get_my_box_slug()
        AND r.is_public = true
        AND public.is_box_open(r.box_slug)
    )
  );

CREATE POLICY "Utente puo togliere il proprio voto" ON public.votes
  FOR DELETE USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- chat_messages
-- ------------------------------------------------------------

CREATE POLICY "Autore o admin puo leggere la chat" ON public.chat_messages
  FOR SELECT USING (
    (public.get_my_role() = 'admin' AND
      EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.id = chat_messages.report_id
          AND r.box_slug = public.get_my_box_slug()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = chat_messages.report_id
        AND r.author_id = auth.uid()
    )
  );

-- Indispensabile per l'autore anonimo: per la tabella non è l'autore di
-- niente, perché author_id è NULL. L'iscrizione Realtime rispetta la
-- RLS, quindi senza questa policy la risposta dell'admin arriverebbe
-- solo ricaricando la pagina.
CREATE POLICY "Autore anonimo legge la propria chat" ON public.chat_messages
  FOR SELECT USING (public.owns_anon_report(report_id));

CREATE POLICY "Autore o admin puo inviare messaggi in chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    public.is_active_user() AND
    (
      (public.get_my_role() = 'admin' AND
        EXISTS (
          SELECT 1 FROM public.reports r
          WHERE r.id = chat_messages.report_id
            AND r.box_slug = public.get_my_box_slug()
            AND public.is_box_open(r.box_slug)
        )
      )
      OR
      EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.id = chat_messages.report_id
          AND r.author_id = auth.uid()
          AND public.is_box_open(r.box_slug)
      )
    )
  );

-- ------------------------------------------------------------
-- report_owners
--
-- Una sola policy, di lettura, e nessuna di scrittura: è deliberato.
-- L'unica scrittura ammessa è quella del trigger claim_report_owner
-- (sezione 8), che è SECURITY DEFINER e quindi non passa dalla RLS.
--
-- Una policy di INSERT per il client aprirebbe una falla grave: basterebbe
-- inserire una riga che associa il proprio utente alla segnalazione di
-- qualcun altro per diventarne «proprietario», e da lì owns_anon_report
-- concederebbe la chat privata dell'autore e il cambio di stato.
-- ------------------------------------------------------------

CREATE POLICY "Studente vede le proprie ownership" ON public.report_owners
  FOR SELECT USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- notifications e push_subscriptions
-- ------------------------------------------------------------

CREATE POLICY "Utente legge le proprie notifiche" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Utente aggiorna le proprie notifiche" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Utente gestisce le proprie subscription" ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 6. PERMESSI DI COLONNA — anon_token
--
-- La RLS decide quali RIGHE si leggono, non quali colonne. Finché
-- anon_token era leggibile, un `SELECT *` su reports restituiva il
-- token dell'autore anonimo a chiunque potesse vedere quella riga, e col
-- token in mano si impersonava l'autore.
--
-- Dalla sezione 11 il token non autorizza più niente, ma resta
-- illeggibile: un segreto che nessuno può rileggere non può nemmeno
-- essere rubato. L'INSERT invece serve, perché chk_author_xor_token
-- pretende un token su ogni contenuto anonimo.
-- ============================================================

REVOKE SELECT (anon_token) ON public.reports       FROM PUBLIC, anon, authenticated;
REVOKE SELECT (anon_token) ON public.comments      FROM PUBLIC, anon, authenticated;
REVOKE SELECT (anon_token) ON public.chat_messages FROM PUBLIC, anon, authenticated;

GRANT INSERT (anon_token) ON public.reports       TO authenticated;
GRANT INSERT (anon_token) ON public.comments      TO authenticated;
GRANT INSERT (anon_token) ON public.chat_messages TO authenticated;


-- ============================================================
-- 7. VISTE
-- ============================================================

-- Quello che vede l'admin. author_id e anon_token sono sempre NULL per
-- le segnalazioni anonime: il mascheramento sta nel database, non
-- nell'interfaccia.
--
-- security_invoker = true è la parte che conta. Col comportamento
-- predefinito la vista girerebbe coi privilegi del proprietario e
-- salterebbe la RLS di reports: l'autore resterebbe mascherato, ma un
-- admin leggerebbe le segnalazioni di TUTTE le scuole semplicemente
-- cambiando il filtro nella chiamata all'API. Con security_invoker la
-- policy «Admin vede tutte le segnalazioni del suo box» continua a valere.
CREATE VIEW public.reports_admin_view
WITH (security_invoker = true) AS
  SELECT
    id,
    box_slug,
    CASE WHEN is_anonymous THEN NULL ELSE author_id END AS author_id,
    NULL::UUID AS anon_token,
    type,
    title,
    content,
    is_public,
    is_anonymous,
    status,
    created_at
  FROM public.reports;

GRANT SELECT ON public.reports_admin_view TO authenticated;

-- Lo sportello visto da fuori, prima del login. Qui security_invoker è
-- volutamente disattivo: la vista gira come proprietario e scavalca la
-- RLS ristretta di boxes, ma seleziona solo colonne innocue. Serve così,
-- perché la pagina di accesso deve poter dire a chi arriva se lo
-- sportello è verificato o sospeso senza obbligarlo a registrarsi.
-- whitelist, notif_emails e le note interne restano fuori.
CREATE VIEW public.boxes_public AS
  SELECT
    slug,
    name,
    categories,
    require_class,
    email_filter_mode,
    regolamento,
    verified,
    suspended
  FROM public.boxes;

GRANT SELECT ON public.boxes_public TO anon, authenticated;


-- ============================================================
-- 8. TRIGGER
--
-- Fanno il lavoro che una policy non sa fare: confrontare il valore
-- nuovo col vecchio, calcolare un campo che il client non deve decidere,
-- validare la lunghezza di un testo.
-- ============================================================

-- ------------------------------------------------------------
-- Creazione del profilo alla registrazione
--
-- Il ruolo è SEMPRE 'student' e non viene MAI letto dai metadata: se lo
-- fosse, basterebbe passare role='admin' alla chiamata di signup per
-- nascere amministratore. La promozione passa solo da
-- become_admin_and_link_box (sezione 9).
--
-- Lo sportello dei metadata viene verificato contro la whitelist: un
-- signInWithOtp diretto via API, che non attraversa la pagina di
-- accesso, entrerebbe altrimenti in qualsiasi sportello. Se l'email non
-- è ammessa l'utente nasce senza sportello e le route guard lo tengono
-- fuori, invece di fallire la registrazione con un errore opaco.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box_slug TEXT;
BEGIN
  v_box_slug := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'box_slug', '')), '');

  IF v_box_slug IS NOT NULL
     AND NOT public.check_email_allowed(v_box_slug, NEW.email) THEN
    v_box_slug := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    role,
    nome,
    cognome,
    box_slug
  )
  VALUES (
    NEW.id,
    NEW.email,
    'student',
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'cognome',
    v_box_slug
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- L'email del profilo resta agganciata a quella di Auth
-- Il client non può scostarla. Le operazioni senza sessione (SQL Editor,
-- service_role) restano libere: auth.uid() è NULL e il trigger non agisce.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.keep_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.id = auth.uid() THEN
    NEW.email := public.get_authenticated_email();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_keep_profile_email_from_auth
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_profile_email_from_auth();

-- ------------------------------------------------------------
-- L'autore cambia lo stato, non il contenuto
--
-- La policy «Autore aggiorna le proprie segnalazioni» limita lo stato
-- ammesso, ma non può impedire di riscrivere titolo e testo nella stessa
-- UPDATE: una policy valuta la riga nuova, non la differenza. Qui sì.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restrict_author_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- L'admin del proprio sportello non ha vincoli aggiuntivi: la RLS lo
  -- ha già limitato alle righe della sua scuola.
  IF public.get_my_role() = 'admin'
     AND public.get_my_box_slug() IS NOT DISTINCT FROM OLD.box_slug THEN
    RETURN NEW;
  END IF;

  IF OLD.author_id IS NOT NULL AND OLD.author_id = auth.uid() THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('resolved', 'closed') THEN
      RAISE EXCEPTION 'Authors can only set status to resolved or closed';
    END IF;

    IF NEW.title        IS DISTINCT FROM OLD.title
       OR NEW.content     IS DISTINCT FROM OLD.content
       OR NEW.box_slug    IS DISTINCT FROM OLD.box_slug
       OR NEW.is_public   IS DISTINCT FROM OLD.is_public
       OR NEW.type        IS DISTINCT FROM OLD.type
       OR NEW.is_anonymous IS DISTINCT FROM OLD.is_anonymous
       OR NEW.author_id   IS DISTINCT FROM OLD.author_id
       OR NEW.anon_token  IS DISTINCT FROM OLD.anon_token
    THEN
      RAISE EXCEPTION 'Authors can only update report status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_author_report_update
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_author_report_update();

-- ------------------------------------------------------------
-- Validazione dei contenuti
-- Gli stessi limiti che mostra l'interfaccia, applicati dove contano:
-- la UI non è un confine di sicurezza.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_user_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'reports' THEN
    -- Le funzioni della sezione 13 aggiornano solo autore e token su dati
    -- storici: non devono fallire se un vecchio record non rispetta
    -- regole introdotte dopo. Ogni scrittura nuova invece è validata.
    IF TG_OP = 'INSERT'
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.box_slug IS DISTINCT FROM OLD.box_slug THEN
      IF char_length(btrim(NEW.title)) NOT BETWEEN 3 AND 80
         OR char_length(btrim(NEW.content)) NOT BETWEEN 10 AND 1000
         OR char_length(btrim(NEW.type)) NOT BETWEEN 1 AND 80 THEN
        RAISE EXCEPTION 'Contenuto della segnalazione non valido';
      END IF;
      -- La categoria deve essere una di quelle dichiarate dallo
      -- sportello: il client manda una stringa libera.
      IF NOT EXISTS (
        SELECT 1
        FROM public.boxes b
        CROSS JOIN unnest(b.categories) AS categoria(nome)
        WHERE b.slug = NEW.box_slug
          AND lower(btrim(categoria.nome)) = lower(btrim(NEW.type))
      ) THEN
        RAISE EXCEPTION 'Categoria non prevista dallo sportello';
      END IF;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.status <> 'new' THEN
      RAISE EXCEPTION 'Una nuova segnalazione deve avere stato new';
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' OR TG_TABLE_NAME = 'chat_messages' THEN
    IF char_length(btrim(NEW.content)) NOT BETWEEN 1 AND 2000 THEN
      RAISE EXCEPTION 'Messaggio non valido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_reports_content
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

CREATE TRIGGER trg_validate_comments_content
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

CREATE TRIGGER trg_validate_chat_content
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

-- ------------------------------------------------------------
-- Verifica e sospensione non passano dal client
--
-- Senza questo trigger l'admin della scuola si verificherebbe da solo, o
-- si toglierebbe la sospensione, con un normale update dalle
-- impostazioni. In INSERT il valore lo calcola il database dal dominio
-- email; in UPDATE resta congelato.
--
-- Fanno eccezione le operazioni senza sessione (SQL Editor, service_role)
-- e i gestori della piattaforma, che verificano dal pannello.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_box_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT lower(trim(email)) INTO v_email
    FROM public.profiles WHERE id = auth.uid();

    -- '%@%.edu.it' pretende un dominio davanti a .edu.it:
    -- @liceorossi.edu.it passa, @edu.it e @finto-edu.it no.
    NEW.verified := COALESCE(v_email LIKE '%@%.edu.it', FALSE);
    NEW.verified_at := CASE WHEN NEW.verified THEN NOW() END;
    NEW.verified_note := CASE WHEN NEW.verified
      THEN 'Dominio .edu.it verificato automaticamente' END;

    -- Nessuno nasce sospeso
    NEW.suspended      := FALSE;
    NEW.suspended_at   := NULL;
    NEW.suspended_note := NULL;
  ELSE
    NEW.verified       := OLD.verified;
    NEW.verified_at    := OLD.verified_at;
    NEW.verified_note  := OLD.verified_note;
    NEW.suspended      := OLD.suspended;
    NEW.suspended_at   := OLD.suspended_at;
    NEW.suspended_note := OLD.suspended_note;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_box_verification
  BEFORE INSERT OR UPDATE ON public.boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_box_verification();

-- ------------------------------------------------------------
-- Registrazione dell'ownership di una segnalazione anonima
--
-- È l'UNICA via di scrittura su report_owners, ed è il motivo per cui
-- quella tabella non ha policy di INSERT (sezione 5). SECURITY DEFINER:
-- gira come proprietario della funzione, quindi la RLS non lo ferma.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_report_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.report_owners (report_id, user_id)
    VALUES (NEW.id, auth.uid())
    ON CONFLICT (report_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_claim_report_owner
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_report_owner();


-- ============================================================
-- 9. RPC — REGISTRAZIONE E PROFILO
-- ============================================================

-- Apertura di uno sportello: crea la box, promuove il chiamante ad
-- admin e lo collega, tutto in una transazione. Fallisce se lo slug
-- esiste già, così nessuno può agganciarsi allo sportello di un altro.
CREATE OR REPLACE FUNCTION public.become_admin_and_link_box(
  p_slug   TEXT,
  p_name   TEXT,
  p_nome   TEXT DEFAULT NULL,
  p_cognome TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_slug    TEXT;
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lo slug finisce in un URL: niente spazi, accenti o maiuscole.
  v_slug := lower(trim(both '-' FROM regexp_replace(
    regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  )));

  IF v_slug IS NULL OR v_slug = '' THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Invalid box name';
  END IF;

  IF EXISTS (SELECT 1 FROM public.boxes WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug already exists: %', v_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- FOR UPDATE: due richieste contemporanee non devono poter aprire due
  -- sportelli per lo stesso utente.
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.role = 'admin' AND v_profile.box_slug IS NOT NULL THEN
    RAISE EXCEPTION 'Already admin of box: %', v_profile.box_slug;
  END IF;

  INSERT INTO public.boxes (slug, name, categories)
  VALUES (
    v_slug,
    trim(p_name),
    ARRAY['Bullismo', 'Infrastrutture', 'Didattica', 'Proposte', 'Altro']
  );

  UPDATE public.profiles
  SET
    role     = 'admin',
    box_slug = v_slug,
    nome     = COALESCE(NULLIF(trim(p_nome), ''), nome),
    cognome  = COALESCE(NULLIF(trim(p_cognome), ''), cognome)
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.become_admin_and_link_box(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_admin_and_link_box(TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- Rinominare il proprio sportello.
--
-- Serve una RPC e non un UPDATE perché lo slug è la chiave primaria:
-- cambiarlo propaga in cascata su profiles.box_slug e reports.box_slug,
-- quindi a metà operazione l'admin risulterebbe agganciato a uno
-- sportello che non esiste ancora. Tutte le policy si basano su
-- get_my_box_slug() e comincerebbero a rifiutare le righe proprio mentre
-- le si sta spostando. SECURITY DEFINER svolge tutto fuori dalla RLS.
--
-- Il vecchio link smette di funzionare: per questo la pagina delle
-- impostazioni chiede conferma prima di chiamarla.
CREATE OR REPLACE FUNCTION public.update_box_slug(old_slug TEXT, new_slug TEXT)
RETURNS public.boxes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_box  public.boxes;
BEGIN
  IF public.get_my_role() <> 'admin'
     OR public.get_my_box_slug() IS DISTINCT FROM old_slug THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  IF NOT public.is_box_open(old_slug) THEN
    RAISE EXCEPTION 'Sportello sospeso';
  END IF;

  v_slug := lower(trim(both '-' FROM regexp_replace(
    regexp_replace(lower(trim(COALESCE(new_slug, ''))), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  )));

  IF v_slug = '' OR char_length(v_slug) < 3 THEN
    RAISE EXCEPTION 'Indirizzo non valido: servono almeno 3 caratteri';
  END IF;

  IF v_slug = old_slug THEN
    SELECT * INTO v_box FROM public.boxes WHERE slug = old_slug;
    RETURN v_box;
  END IF;

  IF EXISTS (SELECT 1 FROM public.boxes WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Indirizzo già in uso: %', v_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- reports.box_slug e profiles.box_slug seguono da soli: entrambe le
  -- chiavi esterne sono ON UPDATE CASCADE (sezione 1).
  UPDATE public.boxes
  SET slug = v_slug
  WHERE slug = old_slug
  RETURNING * INTO v_box;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sportello inesistente: %', old_slug;
  END IF;

  RETURN v_box;
END;
$$;

REVOKE ALL ON FUNCTION public.update_box_slug(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_box_slug(TEXT, TEXT) TO authenticated;


-- Passaggio dello sportello al rappresentante legittimo, per quando
-- qualcun altro della stessa scuola l'ha aperto per primo. Il nuovo
-- admin deve essersi già registrato almeno una volta.
-- Mai dal client: si esegue solo dal SQL Editor.
CREATE OR REPLACE FUNCTION public.transfer_box_admin(
  p_slug            TEXT,
  p_new_admin_email TEXT,
  p_demote_current  BOOLEAN DEFAULT TRUE
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new public.profiles;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.boxes WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Sportello inesistente: %', p_slug;
  END IF;

  SELECT * INTO v_new FROM public.profiles
  WHERE lower(email) = lower(trim(p_new_admin_email));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nessun profilo registrato con email %', p_new_admin_email;
  END IF;

  IF p_demote_current THEN
    UPDATE public.profiles
    SET role = 'student'
    WHERE box_slug = p_slug
      AND role = 'admin'
      AND id <> v_new.id;
  END IF;

  UPDATE public.profiles
  SET role = 'admin', box_slug = p_slug
  WHERE id = v_new.id
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_box_admin(TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

-- Uso:
--   SELECT public.transfer_box_admin('liceo-rossi', 'nuovo@liceorossi.edu.it');
-- Per aggiungere un secondo admin senza rimuovere il primo:
--   SELECT public.transfer_box_admin('liceo-rossi', 'altro@liceorossi.edu.it', FALSE);


-- ============================================================
-- 10. RPC — FORUM
--
-- Entrambe esistono per la stessa ragione: la RLS su profiles impedisce
-- a uno studente di leggere il profilo di un compagno, quindi un join
-- fatto dal client restituirebbe sempre nomi vuoti. Queste funzioni
-- girano come proprietario e decidono loro quali campi mostrare —
-- NULL per i contenuti anonimi. La decisione sta nel database.
-- ============================================================

-- I post pubblici, dal più recente, con un tetto.
-- Il tetto è imposto anche lato database: un client manomesso non può
-- usare questa funzione per scaricare in blocco l'archivio della scuola.
CREATE OR REPLACE FUNCTION public.get_public_reports_with_authors(
  p_box_slug TEXT,
  p_limit    INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, box_slug TEXT, type TEXT, title TEXT, content TEXT,
  is_public BOOLEAN, is_anonymous BOOLEAN, status TEXT, created_at TIMESTAMPTZ,
  author_nome TEXT, author_cognome TEXT, author_classe TEXT,
  votes_count BIGINT, comments_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    r.id, r.box_slug, r.type, r.title, r.content,
    r.is_public, r.is_anonymous, r.status, r.created_at,
    CASE WHEN r.is_anonymous THEN NULL ELSE p.nome    END,
    CASE WHEN r.is_anonymous THEN NULL ELSE p.cognome END,
    CASE WHEN r.is_anonymous THEN NULL ELSE p.classe  END,
    (SELECT COUNT(*) FROM public.votes    v WHERE v.report_id = r.id),
    (SELECT COUNT(*) FROM public.comments c WHERE c.report_id = r.id)
  FROM public.reports r
  LEFT JOIN public.profiles p ON p.id = r.author_id
  WHERE r.box_slug = p_box_slug
    AND r.is_public = true
    AND p_box_slug = public.get_my_box_slug()   -- solo membri dello sportello
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500));
$$;

REVOKE ALL ON FUNCTION public.get_public_reports_with_authors(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_reports_with_authors(TEXT, INT) TO authenticated;


-- I commenti di una segnalazione. L'accesso è legato al post: si leggono
-- solo i commenti di una segnalazione pubblica del proprio sportello, o
-- di qualsiasi segnalazione del proprio sportello se si è admin.
CREATE OR REPLACE FUNCTION public.get_comments_with_authors(p_report_id UUID)
RETURNS TABLE (
  id UUID, report_id UUID, is_anonymous BOOLEAN, content TEXT, created_at TIMESTAMPTZ,
  author_nome TEXT, author_cognome TEXT, author_classe TEXT, author_role TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id, c.report_id, c.is_anonymous, c.content, c.created_at,
    CASE WHEN c.is_anonymous THEN NULL ELSE p.nome    END,
    CASE WHEN c.is_anonymous THEN NULL ELSE p.cognome END,
    CASE WHEN c.is_anonymous THEN NULL ELSE p.classe  END,
    CASE WHEN c.is_anonymous THEN NULL ELSE p.role    END
  FROM public.comments c
  LEFT JOIN public.profiles p ON p.id = c.author_id
  WHERE c.report_id = p_report_id
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = p_report_id
        AND r.box_slug = public.get_my_box_slug()
        AND (r.is_public = true OR public.get_my_role() = 'admin')
    )
  ORDER BY c.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_comments_with_authors(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_comments_with_authors(UUID) TO authenticated;


-- ============================================================
-- 11. RPC — SEGNALAZIONI ANONIME
--
-- PERCHÉ L'ANONIMATO NON SI APPOGGIA A UN TOKEN
--
-- Nel modello iniziale l'autore di una segnalazione anonima si
-- riconosceva esibendo anon_token, un UUID salvato nel localStorage.
-- Era un segreto lungo, ma restava una password al portatore: chi lo
-- intercettava diventava l'autore a tutti gli effetti, e cambiando
-- dispositivo l'autore perdeva l'accesso alla propria segnalazione.
--
-- Qui l'identità la stabilisce il JWT di Supabase Auth, e il legame con
-- la segnalazione vive in report_owners, scritta solo dal trigger della
-- sezione 8. Nessuna di queste funzioni accetta un token.
--
-- Tutte sono SECURITY DEFINER, quindi saltano le policy: i controlli su
-- proprietà, ban e sospensione dello sportello vanno ripetuti dentro.
-- ============================================================

-- Le proprie segnalazioni anonime.
--
-- Non sono leggibili dalla tabella: le policy su reports concedono le
-- righe con author_id = auth.uid(), che nelle anonime è NULL. Va bene
-- così — l'assenza di quel legame è ciò che rende l'anonimato reale
-- anche verso il database.
--
-- I conteggi escono nella forma annidata degli embed PostgREST perché la
-- pagina «Le mie segnalazioni» mostra insieme anonime e identificate e
-- le tratta con lo stesso codice.
CREATE OR REPLACE FUNCTION public.get_my_anon_reports()
RETURNS TABLE (
  id UUID, box_slug TEXT, author_id UUID, type TEXT, title TEXT, content TEXT,
  is_public BOOLEAN, is_anonymous BOOLEAN, status TEXT, created_at TIMESTAMPTZ,
  votes JSONB, comments JSONB, chat_messages JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    r.id, r.box_slug,
    NULL::UUID AS author_id,   -- mai esposto, nemmeno al legittimo autore
    r.type, r.title, r.content,
    r.is_public, r.is_anonymous, r.status, r.created_at,
    jsonb_build_array(jsonb_build_object('count',
      (SELECT COUNT(*) FROM public.votes v WHERE v.report_id = r.id))),
    jsonb_build_array(jsonb_build_object('count',
      (SELECT COUNT(*) FROM public.comments c WHERE c.report_id = r.id))),
    jsonb_build_array(jsonb_build_object('count',
      (SELECT COUNT(*) FROM public.chat_messages m WHERE m.report_id = r.id)))
  FROM public.reports r
  JOIN public.report_owners ro ON ro.report_id = r.id
  WHERE ro.user_id = auth.uid()
    AND r.is_anonymous
  ORDER BY r.created_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_my_anon_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_anon_reports() TO authenticated;


-- Lettura della chat.
-- Restituisce colonne esplicite e non SETOF chat_messages: il tipo della
-- tabella comprende anon_token, e una funzione SECURITY DEFINER lo
-- consegnerebbe al client scavalcando il REVOKE della sezione 6.
CREATE OR REPLACE FUNCTION public.get_anon_chat(p_report_id UUID)
RETURNS TABLE (
  id UUID, report_id UUID, author_id UUID, content TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.id, m.report_id, m.author_id, m.content, m.created_at
  FROM public.chat_messages m
  WHERE m.report_id = p_report_id
    AND public.owns_anon_report(p_report_id)
  ORDER BY m.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_anon_chat(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_anon_chat(UUID) TO authenticated;


-- Invio di un messaggio come autore anonimo.
-- author_id resta NULL: è ciò che l'admin vede, e non deve cambiare solo
-- perché la conversazione è in corso. Il destinatario della notifica lo
-- ricava il server da report_owners, senza passare dall'interfaccia.
--
-- Restituisce box_slug perché al client serve per instradare la
-- notifica, e senza di esso dovrebbe interrogare reports — riga che, per
-- una segnalazione anonima, le policy non gli concedono.
CREATE OR REPLACE FUNCTION public.send_anon_chat_message(p_report_id UUID, p_content TEXT)
RETURNS TABLE (
  id UUID, report_id UUID, author_id UUID, content TEXT, created_at TIMESTAMPTZ,
  box_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box TEXT;
  v_msg public.chat_messages;
BEGIN
  IF NOT public.owns_anon_report(p_report_id) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  SELECT r.box_slug INTO v_box FROM public.reports r WHERE r.id = p_report_id;

  IF NOT public.is_box_open(v_box) THEN
    RAISE EXCEPTION 'Sportello sospeso';
  END IF;

  INSERT INTO public.chat_messages (report_id, author_id, content)
  VALUES (p_report_id, NULL, p_content)
  RETURNING * INTO v_msg;

  -- Il messaggio passa per una variabile invece di uscire da RETURNING:
  -- i nomi dichiarati in RETURNS TABLE sono variabili a tutti gli effetti,
  -- e un riferimento non qualificato a id o report_id sarebbe ambiguo.
  RETURN QUERY SELECT
    v_msg.id, v_msg.report_id, v_msg.author_id,
    v_msg.content, v_msg.created_at, v_box;
END;
$$;

REVOKE ALL ON FUNCTION public.send_anon_chat_message(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_anon_chat_message(UUID, TEXT) TO authenticated;


-- Chiusura della propria segnalazione anonima.
-- Solo resolved/closed, come per l'autore identificato: lo studente può
-- dire «per me è finita», non riportare in lavorazione una pratica che
-- l'admin ha archiviato.
CREATE OR REPLACE FUNCTION public.update_anon_report_status(p_report_id UUID, p_status TEXT)
RETURNS TABLE (
  id UUID, box_slug TEXT, status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rep public.reports;
BEGIN
  IF NOT public.owns_anon_report(p_report_id) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  IF p_status NOT IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Stato non ammesso: %', p_status;
  END IF;

  UPDATE public.reports AS r
  SET status = p_status
  WHERE r.id = p_report_id
    AND public.is_box_open(r.box_slug)
  RETURNING * INTO v_rep;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sportello sospeso';
  END IF;

  RETURN QUERY SELECT v_rep.id, v_rep.box_slug, v_rep.status;
END;
$$;

REVOKE ALL ON FUNCTION public.update_anon_report_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_anon_report_status(UUID, TEXT) TO authenticated;


-- ============================================================
-- 12. RPC — PANNELLO DI PIATTAFORMA
--
-- Alimentano /admin/piattaforma. Ogni funzione richiede DUE condizioni:
-- essere gestore della piattaforma E avere uno sblocco attivo.
-- Nascondere la voce di menu nel frontend non è una difesa.
--
-- Lo sblocco è una seconda password, diversa da quella di accesso: così
-- una sessione admin rubata non arriva a toccare gli sportelli.
-- ============================================================

-- Nomina il gestore e ne imposta la password, in un comando solo. È da
-- qui che si parte su un database nuovo, e serve anche per cambiarla:
-- gli sblocchi in corso cadono. Revocata al client per costruzione.
CREATE OR REPLACE FUNCTION public.set_platform_password(
  p_email    TEXT,
  p_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF length(COALESCE(p_password, '')) < 12 THEN
    RAISE EXCEPTION 'La password deve avere almeno 12 caratteri';
  END IF;

  SELECT id INTO v_id FROM public.profiles
  WHERE lower(email) = lower(trim(p_email));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nessun profilo registrato con email %', p_email;
  END IF;

  INSERT INTO public.platform_admins (user_id, password_hash)
  VALUES (v_id, crypt(p_password, gen_salt('bf', 12)))
  ON CONFLICT (user_id) DO UPDATE
    SET password_hash   = EXCLUDED.password_hash,
        failed_attempts = 0,
        locked_until    = NULL;

  DELETE FROM public.platform_sessions WHERE user_id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_password(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Sblocco.
-- Non solleva eccezioni sui tentativi falliti, e non è una svista: un
-- RAISE annullerebbe la transazione e con essa l'incremento del
-- contatore, rendendo inutile il blocco dopo cinque tentativi. Risponde
-- sempre con un JSON.
CREATE OR REPLACE FUNCTION public.platform_unlock(
  p_email    TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin  public.platform_admins;
  v_email  TEXT;
  v_failed INT;
  v_exp    TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_admin FROM public.platform_admins
  WHERE user_id = auth.uid();

  -- Stessa risposta di una password sbagliata: chi non è gestore non
  -- scopre da qui che la sezione esiste.
  IF NOT FOUND OR v_admin.password_hash IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE);
  END IF;

  IF v_admin.locked_until IS NOT NULL AND v_admin.locked_until > NOW() THEN
    RETURN jsonb_build_object('ok', FALSE, 'locked_until', v_admin.locked_until);
  END IF;

  SELECT lower(email) INTO v_email FROM public.profiles WHERE id = auth.uid();

  IF lower(trim(COALESCE(p_email, ''))) IS DISTINCT FROM v_email
     OR v_admin.password_hash IS DISTINCT FROM crypt(COALESCE(p_password, ''), v_admin.password_hash)
  THEN
    v_failed := v_admin.failed_attempts + 1;
    UPDATE public.platform_admins
    SET failed_attempts = v_failed,
        locked_until    = CASE WHEN v_failed >= 5
                               THEN NOW() + INTERVAL '15 minutes' END
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object(
      'ok', FALSE,
      'locked_until', CASE WHEN v_failed >= 5 THEN NOW() + INTERVAL '15 minutes' END
    );
  END IF;

  UPDATE public.platform_admins
  SET failed_attempts = 0, locked_until = NULL
  WHERE user_id = auth.uid();

  v_exp := NOW() + INTERVAL '30 minutes';
  INSERT INTO public.platform_sessions (user_id, expires_at)
  VALUES (auth.uid(), v_exp)
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at, created_at = NOW();

  RETURN jsonb_build_object('ok', TRUE, 'expires_at', v_exp);
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_unlock(TEXT, TEXT) TO authenticated;

-- Stato dello sblocco: serve alla pagina per decidere se chiedere la
-- password. A chi non è gestore risponde sempre «chiuso».
CREATE OR REPLACE FUNCTION public.platform_session_status()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('unlocked', TRUE, 'expires_at', s.expires_at)
     FROM public.platform_sessions s
     WHERE s.user_id = auth.uid()
       AND s.expires_at > NOW()
       AND public.is_platform_admin()),
    jsonb_build_object('unlocked', FALSE)
  );
$$;

GRANT EXECUTE ON FUNCTION public.platform_session_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_lock()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.platform_sessions WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.platform_lock() TO authenticated;

-- Serve al frontend per decidere se mostrare la voce di menu.
-- Non espone nulla: risponde solo sì/no sull'utente corrente.
CREATE OR REPLACE FUNCTION public.am_i_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_platform_admin();
$$;

GRANT EXECUTE ON FUNCTION public.am_i_platform_admin() TO authenticated;

-- L'elenco per la coda di verifica: dati dello sportello, contatti di chi
-- l'ha aperto e qualche numero per capire se è vivo o abbandonato.
-- I non verificati per primi: sono quelli su cui c'è da decidere.
CREATE OR REPLACE FUNCTION public.list_boxes_overview()
RETURNS TABLE (
  slug          TEXT,
  name          TEXT,
  created_at    TIMESTAMPTZ,
  verified      BOOLEAN,
  verified_at   TIMESTAMPTZ,
  verified_note TEXT,
  suspended     BOOLEAN,
  admin_email   TEXT,
  admin_nome    TEXT,
  admin_cognome TEXT,
  students      BIGINT,
  reports       BIGINT,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_admin() AND public.has_platform_session()) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  RETURN QUERY
  SELECT
    b.slug,
    b.name,
    b.created_at,
    b.verified,
    b.verified_at,
    b.verified_note,
    b.suspended,
    a.email,
    a.nome,
    a.cognome,
    (SELECT count(*) FROM public.profiles s
      WHERE s.box_slug = b.slug AND s.role = 'student'),
    (SELECT count(*) FROM public.reports r WHERE r.box_slug = b.slug),
    (SELECT max(r.created_at) FROM public.reports r WHERE r.box_slug = b.slug)
  FROM public.boxes b
  LEFT JOIN LATERAL (
    SELECT p.email, p.nome, p.cognome
    FROM public.profiles p
    WHERE p.box_slug = b.slug AND p.role = 'admin'
    ORDER BY p.created_at
    LIMIT 1
  ) a ON TRUE
  ORDER BY b.verified ASC, b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_boxes_overview() TO authenticated;

-- La scheda di dettaglio. Un solo JSON invece di venti colonne: così
-- aggiungere una statistica non cambia la firma della funzione.
CREATE OR REPLACE FUNCTION public.get_box_detail(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_box    public.boxes;
  v_out    JSONB;
  v_attivi BIGINT;
BEGIN
  IF NOT (public.is_platform_admin() AND public.has_platform_session()) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  SELECT * INTO v_box FROM public.boxes WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sportello inesistente: %', p_slug;
  END IF;

  -- Quanti studenti hanno scritto almeno una volta. Passa da
  -- report_owners per contare anche le anonime, che non hanno author_id.
  SELECT count(DISTINCT ro.user_id) INTO v_attivi
  FROM public.report_owners ro
  JOIN public.reports r ON r.id = ro.report_id
  WHERE r.box_slug = v_box.slug;

  SELECT jsonb_build_object(
    'slug',           v_box.slug,
    'name',           v_box.name,
    'created_at',     v_box.created_at,
    'verified',       v_box.verified,
    'verified_at',    v_box.verified_at,
    'verified_note',  v_box.verified_note,
    'suspended',      v_box.suspended,
    'suspended_at',   v_box.suspended_at,
    'suspended_note', v_box.suspended_note,
    'categories',     to_jsonb(v_box.categories),
    'require_class',  v_box.require_class,
    'filtro_email',   v_box.email_filter_mode,
    'whitelist_voci', COALESCE(array_length(v_box.whitelist, 1), 0),
    'ha_regolamento', length(COALESCE(v_box.regolamento, '')) > 0,
    'notif_emails',   COALESCE(array_length(v_box.notif_emails, 1), 0),

    'admin', (
      SELECT jsonb_agg(jsonb_build_object(
        'email', p.email, 'nome', p.nome, 'cognome', p.cognome,
        'dal', p.created_at))
      FROM public.profiles p
      WHERE p.box_slug = v_box.slug AND p.role = 'admin'
    ),

    'studenti',        (SELECT count(*) FROM public.profiles p
                          WHERE p.box_slug = v_box.slug AND p.role = 'student'),
    'studenti_bannati',(SELECT count(*) FROM public.profiles p
                          WHERE p.box_slug = v_box.slug AND p.role = 'banned'),
    'studenti_attivi', v_attivi,

    'segnalazioni',    (SELECT count(*) FROM public.reports r
                          WHERE r.box_slug = v_box.slug),
    'per_stato', (
      SELECT COALESCE(jsonb_object_agg(t.status, t.n), '{}'::jsonb)
      FROM (SELECT r.status, count(*) AS n FROM public.reports r
             WHERE r.box_slug = v_box.slug GROUP BY r.status) t
    ),
    'pubbliche',       (SELECT count(*) FROM public.reports r
                          WHERE r.box_slug = v_box.slug AND r.is_public),
    'ultima_attivita', (SELECT max(r.created_at) FROM public.reports r
                          WHERE r.box_slug = v_box.slug),
    'ultimi_7_giorni', (SELECT count(*) FROM public.reports r
                          WHERE r.box_slug = v_box.slug
                            AND r.created_at > NOW() - INTERVAL '7 days'),
    'commenti',        (SELECT count(*) FROM public.comments c
                          JOIN public.reports r ON r.id = c.report_id
                         WHERE r.box_slug = v_box.slug)
  ) INTO v_out;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_box_detail(TEXT) TO authenticated;

-- Verifica o revoca. Il trigger della sezione 8 lascia passare la
-- scrittura perché chi arriva qui ha già superato is_platform_admin().
CREATE OR REPLACE FUNCTION public.set_box_verified(
  p_slug     TEXT,
  p_verified BOOLEAN,
  p_note     TEXT DEFAULT NULL
)
RETURNS public.boxes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box public.boxes;
BEGIN
  IF NOT (public.is_platform_admin() AND public.has_platform_session()) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  UPDATE public.boxes
  SET verified      = p_verified,
      verified_at   = CASE WHEN p_verified THEN NOW() ELSE NULL END,
      verified_note = NULLIF(trim(COALESCE(p_note, '')), '')
  WHERE slug = p_slug
  RETURNING * INTO v_box;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sportello inesistente: %', p_slug;
  END IF;

  RETURN v_box;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_box_verified(TEXT, BOOLEAN, TEXT) TO authenticated;

-- Sospendere o riattivare. Sospeso ≠ eliminato: i dati restano, gli
-- studenti continuano a leggere le proprie segnalazioni e le chat, ma
-- nessuno può più scrivere.
CREATE OR REPLACE FUNCTION public.set_box_suspended(
  p_slug      TEXT,
  p_suspended BOOLEAN,
  p_note      TEXT DEFAULT NULL
)
RETURNS public.boxes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box public.boxes;
BEGIN
  IF NOT (public.is_platform_admin() AND public.has_platform_session()) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  UPDATE public.boxes
  SET suspended      = p_suspended,
      suspended_at   = CASE WHEN p_suspended THEN NOW() ELSE NULL END,
      suspended_note = CASE WHEN p_suspended
                            THEN NULLIF(trim(COALESCE(p_note, '')), '') END
  WHERE slug = p_slug
  RETURNING * INTO v_box;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sportello inesistente: %', p_slug;
  END IF;

  RETURN v_box;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_box_suspended(TEXT, BOOLEAN, TEXT) TO authenticated;

-- Eliminazione definitiva. Il secondo argomento deve ripetere lo slug:
-- senza una conferma esplicita un click sbagliato porterebbe via tutte
-- le segnalazioni di una scuola, e non esiste un annulla.
CREATE OR REPLACE FUNCTION public.delete_box(
  p_slug    TEXT,
  p_conferma TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reports  BIGINT;
  v_profili  BIGINT;
BEGIN
  IF NOT (public.is_platform_admin() AND public.has_platform_session()) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  IF p_conferma IS DISTINCT FROM p_slug THEN
    RAISE EXCEPTION 'Conferma mancante: riscrivi lo slug dello sportello';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.boxes WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Sportello inesistente: %', p_slug;
  END IF;

  SELECT count(*) INTO v_reports FROM public.reports WHERE box_slug = p_slug;
  SELECT count(*) INTO v_profili FROM public.profiles WHERE box_slug = p_slug;

  -- L'admin resta senza sportello: riportarlo a studente evita un
  -- account con privilegi che non hanno più un oggetto su cui valere.
  UPDATE public.profiles
  SET role = 'student'
  WHERE box_slug = p_slug AND role = 'admin';

  -- reports segue in CASCADE, profiles.box_slug torna NULL
  DELETE FROM public.boxes WHERE slug = p_slug;

  RETURN jsonb_build_object(
    'slug', p_slug,
    'segnalazioni_eliminate', v_reports,
    'profili_scollegati', v_profili
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_box(TEXT, TEXT) TO authenticated;


-- ============================================================
-- 13. RPC — PRIVACY, CONSERVAZIONE, NOTIFICHE
--
-- Le due promesse della privacy policy che devono essere vere anche nel
-- database, non solo nel testo: «elimina account» e «i dati vengono
-- cancellati entro 24 mesi dall'ultimo accesso».
--
-- Entrambe le funzioni devono fare i conti con chk_author_xor_token
-- (sezione 1): una segnalazione non può restare senza autore E senza
-- token, quindi staccare l'utente lasciando author_id a NULL non è
-- possibile. L'ordine delle operazioni qui sotto non è arbitrario.
-- ============================================================

-- Cancellazione dell'account su richiesta dell'utente.
--
-- Le segnalazioni restano sul forum ma diventano anonime, con un token
-- nuovo: è quanto promette la schermata di conferma, ed è anche l'unico
-- modo di renderle davvero non riconducibili. Convertirle PRIMA di
-- cancellare l'utente è ciò che evita la violazione del vincolo.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_report    INT := 0;
  v_commenti  INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  UPDATE public.reports
  SET author_id    = NULL,
      anon_token   = gen_random_uuid(),
      is_anonymous = TRUE
  WHERE author_id = v_uid;
  GET DIAGNOSTICS v_report = ROW_COUNT;

  -- Senza questo il collegamento sopravviverebbe alla cancellazione, e
  -- le segnalazioni appena rese anonime resterebbero riconducibili.
  DELETE FROM public.report_owners WHERE user_id = v_uid;

  SELECT count(*) INTO v_commenti FROM public.comments WHERE author_id = v_uid;

  -- Porta via profilo, commenti, voti e sessioni in CASCADE
  DELETE FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object(
    'segnalazioni_rese_anonime', v_report,
    'commenti_eliminati', v_commenti
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- Cancellazione dei dati vecchi.
--
-- Non parte da sola: va pianificata a mano (istruzioni in fondo alla
-- sezione), e conviene guardare prima cosa toglierebbe eseguendola in
-- simulazione. Rifiuta soglie sotto i sei mesi: una soglia bassa per
-- errore cancellerebbe dati ancora in uso, e non c'è un annulla.
CREATE OR REPLACE FUNCTION public.apply_retention(
  p_simulazione BOOLEAN DEFAULT TRUE,
  p_mesi        INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_soglia   TIMESTAMPTZ;
  v_utenti   UUID[];
  v_reports  UUID[];
  v_extra    UUID[];
  v_n_utenti INT := 0;
  v_n_report INT := 0;
BEGIN
  IF p_mesi IS NULL OR p_mesi < 6 THEN
    RAISE EXCEPTION 'Soglia troppo bassa (% mesi): il minimo accettato è 6', p_mesi;
  END IF;

  v_soglia := NOW() - make_interval(months => p_mesi);

  -- last_sign_in_at è NULL per chi non ha mai completato l'accesso: in
  -- quel caso vale la data di creazione. I gestori della piattaforma
  -- sono esclusi: un account di servizio usato raramente non va perso.
  SELECT COALESCE(array_agg(u.id), ARRAY[]::UUID[])
    INTO v_utenti
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE COALESCE(u.last_sign_in_at, u.created_at) < v_soglia
    AND NOT EXISTS (
      SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = u.id
    );

  SELECT COALESCE(array_agg(r.id), ARRAY[]::UUID[])
    INTO v_reports
  FROM public.reports r
  WHERE r.author_id = ANY(v_utenti);

  -- Anche le anonime di quegli utenti: il collegamento in report_owners
  -- le rende comunque riconducibili, quindi rientrano nella promessa.
  SELECT COALESCE(array_agg(ro.report_id), ARRAY[]::UUID[])
    INTO v_extra
  FROM public.report_owners ro
  WHERE ro.user_id = ANY(v_utenti);

  SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::UUID[])
    INTO v_reports
  FROM unnest(v_reports || v_extra) AS x;

  IF p_simulazione THEN
    v_n_utenti := COALESCE(array_length(v_utenti, 1), 0);
    v_n_report := COALESCE(array_length(v_reports, 1), 0);
  ELSE
    -- Prima le segnalazioni: cancellando l'utente per primo, il vincolo
    -- chk_author_xor_token farebbe fallire tutto.
    DELETE FROM public.reports WHERE id = ANY(v_reports);
    GET DIAGNOSTICS v_n_report = ROW_COUNT;

    DELETE FROM auth.users WHERE id = ANY(v_utenti);
    GET DIAGNOSTICS v_n_utenti = ROW_COUNT;
  END IF;

  INSERT INTO public.retention_log
    (simulazione, mesi, account_eliminati, segnalazioni_eliminate)
  VALUES (p_simulazione, p_mesi, v_n_utenti, v_n_report);

  RETURN jsonb_build_object(
    'simulazione', p_simulazione,
    'soglia', v_soglia,
    'account', v_n_utenti,
    'segnalazioni', v_n_report
  );
END;
$$;

-- Non deve essere raggiungibile dall'app in nessun caso.
REVOKE ALL ON FUNCTION public.apply_retention(BOOLEAN, INT) FROM PUBLIC, anon, authenticated;

-- Prima di accenderla, guarda cosa toglierebbe (non cancella niente, ma
-- scrive una riga in retention_log):
--   SELECT public.apply_retention(TRUE, 24) AS simulazione;
--
-- Per pianificarla: abilita pg_cron da Database → Extensions, poi
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule(
--     'dilloqui-retention',
--     '0 3 1 * *',                                  -- 03:00 del primo del mese
--     $cron$SELECT public.apply_retention(FALSE, 24)$cron$
--   );
--
-- Per vedere cosa ha fatto:  SELECT * FROM public.retention_log ORDER BY eseguito_at DESC;
-- Per fermarla:              SELECT cron.unschedule('dilloqui-retention');
--
-- Finché non pianifichi niente resta a disposizione senza partire da
-- sola: puoi lanciarla a mano con SELECT public.apply_retention(FALSE, 24);


-- Gli admin di uno sportello, per la Edge Function che manda le push.
-- Riservata al service_role: nessun client, nemmeno autenticato, deve
-- poter chiedere al database chi amministra una scuola.
CREATE OR REPLACE FUNCTION public.get_box_admin_ids(p_box_slug TEXT)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE role = 'admin' AND box_slug = p_box_slug;
$$;

REVOKE ALL ON FUNCTION public.get_box_admin_ids(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_box_admin_ids(TEXT) TO service_role;


-- ============================================================
-- 14. REALTIME
--
-- Il frontend si iscrive a `postgres_changes` su DUE tabelle, e
-- entrambe devono stare nella pubblicazione, altrimenti l'iscrizione
-- viene accettata senza che arrivi mai un evento:
--
--   notifications  → il campanello si aggiorna da solo
--   chat_messages  → la chat è bidirezionale in tempo reale; senza
--                    questa, la risposta dell'admin compare allo
--                    studente solo ricaricando la pagina
--
-- L'iscrizione Realtime rispetta la RLS, quindi ognuno riceve solo gli
-- eventi delle righe che avrebbe potuto leggere comunque. Per l'autore
-- anonimo il permesso arriva dalla policy «Autore anonimo legge la
-- propria chat» (sezione 5).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Pubblicazione supabase_realtime assente: Realtime non attivo su questo progetto.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;


-- ============================================================
-- 15. DATI INIZIALI
--
-- Un solo sportello di prova, per poter registrare il primo account
-- senza passare dalla creazione di una scuola.
--
-- verified è TRUE in modo esplicito: la colonna nasce FALSE e il trigger
-- della sezione 8 non interviene qui, perché eseguendo dal SQL Editor
-- auth.uid() è NULL. Uno sportello di prova non verificato mostrerebbe
-- l'avviso «non ufficiale» durante ogni demo.
-- ============================================================

INSERT INTO public.boxes (slug, name, categories, notif_emails, verified, verified_at, verified_note)
VALUES (
  'demo',
  'Liceo Demo (Sportello di Prova)',
  ARRAY['Bullismo', 'Infrastrutture', 'Didattica', 'Proposte', 'Altro'],
  ARRAY['preside@scuola.edu.it'],
  TRUE,
  NOW(),
  'Sportello di prova creato dall''installazione'
);


-- ============================================================
-- 16. RICARICA DELLO SCHEMA
--
-- PostgREST tiene in cache le firme delle funzioni. Senza questo,
-- l'applicazione può rispondere «funzione non trovata» per qualche
-- minuto dopo l'installazione.
-- ============================================================

NOTIFY pgrst, 'reload schema';
