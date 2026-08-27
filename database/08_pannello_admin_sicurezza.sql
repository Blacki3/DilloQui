-- ============================================================
-- DILLO QUI — Sicurezza Admin: Ban e Verifica Sportelli
-- ============================================================
-- Richiede: check_email_allowed (P1), get_my_role / get_my_box_slug.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
-- ============================================================
--
-- Contenuto:
--   1. is_active_user() — helper ban
--   2. reports        INSERT: blocca gli utenti bannati
--   3. comments       INSERT: blocca i bannati + vincola report_id al box
--   4. votes          INSERT: blocca i bannati + vincola report_id al box
--   5. chat_messages  INSERT: blocca gli utenti bannati
--   6. RPC anonime: stesso blocco (bypassano RLS by design)
--   7. profiles UPDATE admin: niente promozione ad admin
--   8. sportelli verificati + trasferimento sportello
--   9. whitelist email applicata lato server (trigger + policy profiles)
-- ============================================================


-- ============================================================
-- 1. HELPER: utente autenticato e non bannato — ⚠️ SICUREZZA ⚠️
-- Il ban era applicato solo nella UI (NewReport.jsx, PostDetail.jsx):
-- chi veniva bloccato poteva continuare a scrivere chiamando l'API
-- direttamente con la propria sessione. Ora il blocco è nel database.
-- Richiede un profilo esistente: mai NULL, sempre true/false.
-- ============================================================

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


-- ============================================================
-- 2. reports INSERT — invariata tranne il controllo ban
-- ============================================================

DROP POLICY IF EXISTS "Utente puo inviare segnalazioni" ON public.reports;
CREATE POLICY "Utente puo inviare segnalazioni" ON public.reports
  FOR INSERT WITH CHECK (
    public.is_active_user() AND
    box_slug = public.get_my_box_slug() AND
    (
      (is_anonymous = false AND author_id = auth.uid() AND anon_token IS NULL) OR
      (is_anonymous = true  AND author_id IS NULL      AND anon_token IS NOT NULL)
    )
  );


-- ============================================================
-- 3. comments INSERT — ban + vincolo sulla segnalazione
-- Prima bastava essere autenticati: conoscendo l'UUID di una
-- segnalazione di un'altra scuola (o privata) si potevano inserire
-- commenti invisibili in SELECT ma presenti nel database.
-- ============================================================

DROP POLICY IF EXISTS "Utente autenticato puo commentare" ON public.comments;
CREATE POLICY "Utente autenticato puo commentare" ON public.comments
  FOR INSERT WITH CHECK (
    public.is_active_user() AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = comments.report_id
        AND r.box_slug = public.get_my_box_slug()
        AND r.is_public = true
    ) AND
    (
      (is_anonymous = false AND author_id = auth.uid() AND anon_token IS NULL) OR
      (is_anonymous = true  AND author_id IS NULL      AND anon_token IS NOT NULL)
    )
  );


-- ============================================================
-- 4. votes INSERT — ban + vincolo sulla segnalazione
-- Prima si poteva votare qualsiasi UUID, anche di un'altra scuola.
-- ============================================================

DROP POLICY IF EXISTS "Utente puo votare" ON public.votes;
CREATE POLICY "Utente puo votare" ON public.votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    public.is_active_user() AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = votes.report_id
        AND r.box_slug = public.get_my_box_slug()
        AND r.is_public = true
    )
  );


-- ============================================================
-- 5. chat_messages INSERT — invariata tranne il controllo ban
-- ============================================================

DROP POLICY IF EXISTS "Autore o admin puo inviare messaggi in chat" ON public.chat_messages;
CREATE POLICY "Autore o admin puo inviare messaggi in chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    public.is_active_user() AND
    (
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
    )
  );


-- ============================================================
-- 6. RPC anonime — il ban vale anche qui
-- Sono SECURITY DEFINER: bypassano le policy del punto 5, quindi
-- senza questo controllo un utente bannato in possesso del proprio
-- anon_token continuerebbe a scrivere in chat e a cambiare stato.
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_anon_chat_message(p_report_id UUID, p_token UUID, p_content TEXT)
RETURNS public.chat_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.chat_messages (report_id, anon_token, content)
  SELECT p_report_id, p_token, p_content
  WHERE public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = p_report_id AND r.anon_token = p_token
    )
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.update_anon_report_status(p_report_id UUID, p_token UUID, p_status TEXT)
RETURNS public.reports
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.reports
  SET status = p_status
  WHERE id = p_report_id
    AND anon_token = p_token
    AND p_status IN ('resolved', 'closed')
    AND public.is_active_user()
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.send_anon_chat_message(UUID, UUID, TEXT)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT)    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_anon_chat_message(UUID, UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT) TO authenticated;


-- ============================================================
-- 7. profiles UPDATE admin — ⚠️ SICUREZZA ⚠️
-- La policy di supabase_ban_policy.sql non aveva WITH CHECK: un admin
-- poteva promuovere ad admin qualsiasi studente del proprio box, dandogli
-- accesso a tutte le segnalazioni della scuola.
-- Ora l'admin può solo bannare/sbannare (student <-> banned) e restare
-- dentro il proprio box. Il proprio profilo lo modifica tramite la
-- policy "Utente aggiorna il proprio profilo", che vieta il cambio ruolo.
-- ============================================================

DROP POLICY IF EXISTS "Admin aggiorna i profili del proprio box" ON public.profiles;
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


-- ============================================================
-- 8. SPORTELLI VERIFICATI — ⚠️ SICUREZZA ⚠️
-- Chiunque può aprire uno sportello, ma nasce NON VERIFICATO e gli
-- studenti lo vedono dichiarato prima di iscriversi. Così una box
-- aperta da uno sconosciuto non può spacciarsi per ufficiale, senza
-- che nessuno debba approvare a mano ogni richiesta.
--
-- Le scuole con dominio .edu.it si verificano da sole: quel dominio è
-- assegnato dal Registro .it soltanto a scuole statali e paritarie,
-- previa verifica del codice meccanografico dell'istituto. Chi possiede
-- un indirizzo @nomescuola.edu.it appartiene verificabilmente a quella
-- scuola, quindi nel caso più comune la coda di approvazione è vuota.
--
-- Lo stato di verifica è deciso solo dal database: il client non può
-- scriverlo nemmeno con una chiamata diretta all'API.
-- ============================================================

-- La colonna nasce con DEFAULT TRUE e passa subito a FALSE: così gli
-- sportelli già esistenti restano verificati (sono precedenti a questa
-- regola e li conosci uno per uno) mentre i nuovi partono da zero.
-- Il blocco è dentro un IF: rieseguire lo script non riverifica nulla.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'boxes'
      AND column_name = 'verified'
  ) THEN
    ALTER TABLE public.boxes ADD COLUMN verified BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE public.boxes ALTER COLUMN verified SET DEFAULT FALSE;
  END IF;
END $$;

ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_note TEXT;

-- Chi gestisce la piattaforma (non la singola scuola). RLS attiva e
-- nessuna policy: la tabella è invisibile al client, si popola solo dal
-- SQL Editor. È l'unico ruolo che può verificare uno sportello.
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

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

-- Lo stato di verifica non passa mai dal client: al momento della
-- creazione lo calcola il database dal dominio email, e in UPDATE resta
-- congelato. Fanno eccezione le operazioni senza sessione (SQL Editor,
-- service_role) e i gestori della piattaforma, che verificano dal pannello.
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

    -- '%@%.edu.it' richiede un dominio davanti a .edu.it:
    -- @liceorossi.edu.it passa, @edu.it e @finto-edu.it no.
    NEW.verified := COALESCE(v_email LIKE '%@%.edu.it', FALSE);
    NEW.verified_at := CASE WHEN NEW.verified THEN NOW() END;
    NEW.verified_note := CASE WHEN NEW.verified
      THEN 'Dominio .edu.it verificato automaticamente' END;
  ELSE
    NEW.verified      := OLD.verified;
    NEW.verified_at   := OLD.verified_at;
    NEW.verified_note := OLD.verified_note;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_box_verification ON public.boxes;
CREATE TRIGGER trg_protect_box_verification
  BEFORE INSERT OR UPDATE ON public.boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_box_verification();

-- La view pubblica espone il flag: la pagina di accesso deve poterlo
-- mostrare allo studente PRIMA che si registri.
CREATE OR REPLACE VIEW public.boxes_public AS
SELECT
  slug,
  name,
  categories,
  require_class,
  email_filter_mode,
  regolamento,
  verified
FROM public.boxes;

GRANT SELECT ON public.boxes_public TO anon, authenticated;

-- Se una bozza precedente di P3 aveva introdotto i codici invito,
-- questo riporta la registrazione alla firma originale a 4 argomenti.
DROP FUNCTION IF EXISTS public.become_admin_and_link_box(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS public.admin_invites;

DO $$
BEGIN
  IF to_regprocedure('public.become_admin_and_link_box(text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION
      'become_admin_and_link_box non trovata: riesegui supabase_security_p0.sql prima di P3';
  END IF;
END $$;

-- ============================================================
-- Verificare uno sportello a mano (dal SQL Editor):
--   UPDATE public.boxes
--   SET verified = TRUE, verified_at = NOW(),
--       verified_note = 'Confermato via telefono con la segreteria'
--   WHERE slug = 'nome-sportello';
--
-- Quali sono in attesa:
--   SELECT b.slug, b.name, b.created_at, p.email AS admin_email
--   FROM public.boxes b
--   LEFT JOIN public.profiles p ON p.box_slug = b.slug AND p.role = 'admin'
--   WHERE b.verified = FALSE
--   ORDER BY b.created_at;
-- ============================================================

-- Trasferimento dello sportello al rappresentante legittimo, per i casi
-- in cui qualcun altro della stessa scuola l'ha aperto per primo.
-- Il nuovo admin deve essersi già registrato almeno una volta.
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

-- Mai dal client: si esegue solo dal SQL Editor / service_role.
REVOKE ALL ON FUNCTION public.transfer_box_admin(TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Uso:
--   SELECT public.transfer_box_admin('liceo-rossi', 'nuovo.rappresentante@liceorossi.edu.it');
-- Per aggiungere un secondo admin senza rimuovere il primo:
--   SELECT public.transfer_box_admin('liceo-rossi', 'altro@liceorossi.edu.it', FALSE);
-- ============================================================


-- ------------------------------------------------------------
-- 8b. SECONDA PASSWORD PER IL PANNELLO
-- Essere admin ed essere in platform_admins non basta: per operare
-- serve sbloccare con email + password dedicata, diversa da quella di
-- login. Così una sessione admin rubata non arriva agli sportelli.
-- Lo sblocco vive nel database, non in localStorage: il client non può
-- fingerlo.
-- ------------------------------------------------------------

-- crypt()/gen_salt() per l'hash bcrypt. Su Supabase pgcrypto è già
-- installata in extensions: il blocco serve ai database creati a mano.
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

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS password_hash   TEXT,
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ;

-- Sblocchi attivi. RLS senza policy: il client non la vede né la scrive,
-- ci arriva solo attraverso le funzioni qui sotto.
CREATE TABLE IF NOT EXISTS public.platform_sessions (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;

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

-- Imposta la password e, se serve, nomina il gestore: è il comando con
-- cui si parte. Revocata al client, si esegue solo dal SQL Editor.
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

  -- Cambiare password chiude gli sblocchi in corso
  DELETE FROM public.platform_sessions WHERE user_id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_password(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Sblocco. Non solleva eccezioni sui tentativi falliti: un RAISE
-- annullerebbe la transazione e con essa il contatore, rendendo il
-- blocco per tentativi inutile. Risponde sempre con un JSON.
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
-- password. A chi non è gestore risponde sempre "chiuso".
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


-- ------------------------------------------------------------
-- 8c. RPC DEL PANNELLO PIATTAFORMA
-- Alimentano /admin/piattaforma. Ognuna richiede gestore + sblocco
-- attivo: nascondere la voce di menu nel frontend non è una difesa.
-- ------------------------------------------------------------

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

-- L'elenco per la coda di verifica: dati dello sportello, contatti di
-- chi l'ha aperto e due numeri per capire se è vivo o abbandonato.
CREATE OR REPLACE FUNCTION public.list_boxes_overview()
RETURNS TABLE (
  slug          TEXT,
  name          TEXT,
  created_at    TIMESTAMPTZ,
  verified      BOOLEAN,
  verified_at   TIMESTAMPTZ,
  verified_note TEXT,
  admin_email   TEXT,
  admin_nome    TEXT,
  admin_cognome TEXT,
  students      BIGINT,
  reports       BIGINT
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
    a.email,
    a.nome,
    a.cognome,
    (SELECT count(*) FROM public.profiles s
      WHERE s.box_slug = b.slug AND s.role = 'student'),
    (SELECT count(*) FROM public.reports r WHERE r.box_slug = b.slug)
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

-- Verifica / revoca. Il trigger lascia passare la scrittura perché
-- chi arriva fin qui ha già superato is_platform_admin().
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

-- ============================================================
-- Nominare il gestore della piattaforma e dargli la password del
-- pannello, in un comando solo (dal SQL Editor: la funzione è
-- revocata al client). L'email è quella del suo account admin.
--   SELECT public.set_platform_password(
--     'tua.email@esempio.it',
--     'una-password-lunga-e-diversa-da-quella-di-login'
--   );
-- Lo stesso comando serve a cambiarla: gli sblocchi in corso cadono.
-- ============================================================


-- ============================================================
-- 9. WHITELIST EMAIL LATO SERVER — ⚠️ SICUREZZA ⚠️
-- check_email_allowed (P1) esisteva già ma la chiamava solo Verify.jsx:
-- un signInWithOtp diretto via API entrava in qualsiasi box.
-- Il controllo va ripetuto su tutti i punti in cui box_slug viene
-- assegnato: il trigger di signup e le policy INSERT/UPDATE su profiles
-- (completeStudentProfile fa un upsert con box_slug dal client).
-- ============================================================

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

  -- Email fuori whitelist: l'utente nasce senza box e le route guard
  -- lo lasciano fuori dallo sportello.
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
    'student',  -- MAI leggere role da raw_user_meta_data
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'cognome',
    v_box_slug
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Prima assegnazione della box via client: deve passare la whitelist.
-- Se la box resta invariata non si ricontrolla (gli admin non sono
-- in whitelist e devono poter aggiornare il proprio profilo).
DROP POLICY IF EXISTS "Utente aggiorna il proprio profilo" ON public.profiles;
CREATE POLICY "Utente aggiorna il proprio profilo" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_my_role()   -- il ruolo non si cambia da soli
    AND (
      public.get_my_box_slug() IS NULL                          -- prima assegnazione (registrazione)
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug() -- oppure box invariata
    )
    AND (
      box_slug IS NULL
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
      OR public.check_email_allowed(box_slug, profiles.email)
    )
  );

DROP POLICY IF EXISTS "Utente crea il proprio profilo" ON public.profiles;
CREATE POLICY "Utente crea il proprio profilo" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND role = 'student'
    AND (
      box_slug IS NULL
      OR public.check_email_allowed(box_slug, profiles.email)
    )
  );

-- ============================================================
-- supabase_p4_gestione_sportelli.sql
-- ============================================================

-- ============================================================
