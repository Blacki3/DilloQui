
-- ============================================================
-- supabase_schema.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Schema Database v1.1
-- Sistema di anonimato: token casuale generato lato client.
-- ============================================================

-- 1. Tabella BOXES (Gli sportelli delle scuole)
CREATE TABLE public.boxes (
  slug              TEXT        PRIMARY KEY,
  name              TEXT        NOT NULL,
  whitelist         TEXT[]      NOT NULL DEFAULT '{}',
  categories        TEXT[]      NOT NULL DEFAULT '{}',
  email_filter_mode TEXT        NOT NULL DEFAULT 'exact',
  require_class     BOOLEAN     NOT NULL DEFAULT FALSE,
  notif_emails      TEXT[]      NOT NULL DEFAULT '{}',
  regolamento       TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabella PROFILES (Dati aggiuntivi degli utenti, legati a auth.users)
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  role          TEXT        NOT NULL CHECK (role IN ('student', 'admin')),
  nome          TEXT,
  cognome       TEXT,
  classe        TEXT,
  box_slug      TEXT        REFERENCES public.boxes(slug) ON DELETE SET NULL,
  default_anon  BOOLEAN     NOT NULL DEFAULT TRUE,
  notifications BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabella REPORTS (Le segnalazioni)
-- SISTEMA ANONIMATO:
--   Segnalazione IDENTIFICATA: author_id = UUID reale,  anon_token = NULL
--   Segnalazione ANONIMA:      author_id = NULL,         anon_token = UUID casuale (generato dal client)
CREATE TABLE public.reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  box_slug     TEXT        NOT NULL REFERENCES public.boxes(slug) ON DELETE CASCADE,
  author_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  anon_token   UUID,       -- Generato da crypto.randomUUID() nel browser. Mai linkabile all'utente.
  type         TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  is_public    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_anonymous BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Stati allineati al frontend (ReportsList / mockStore).
  -- DB già creati con il vecchio CHECK (in_progress/rejected): vedi supabase_fixes.sql.
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vincolo di integrità: una segnalazione ha SEMPRE o l'autore O il token, mai entrambi o nessuno.
  CONSTRAINT chk_author_xor_token CHECK (
    (author_id IS NOT NULL AND anon_token IS NULL) OR
    (author_id IS NULL AND anon_token IS NOT NULL)
  )
);

-- 4. Tabella COMMENTS (Commenti pubblici nel forum)
CREATE TABLE public.comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_token   UUID,       -- Anche i commenti possono essere anonimi, stessa logica
  is_anonymous BOOLEAN     NOT NULL DEFAULT TRUE,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comment_author CHECK (
    (author_id IS NOT NULL AND anon_token IS NULL) OR
    (author_id IS NULL AND anon_token IS NOT NULL)
  )
);

-- 5. Tabella VOTES (Mi Piace — 1 voto per utente per report)
CREATE TABLE public.votes (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, report_id)
);

-- 6. Tabella CHAT_MESSAGES (Chat privata studente ↔ admin)
CREATE TABLE public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  anon_token UUID,       -- Per messaggi inviati da segnalazioni anonime
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDICI DI PERFORMANCE
-- ============================================================

CREATE INDEX idx_reports_box_slug   ON public.reports(box_slug);
CREATE INDEX idx_reports_author_id  ON public.reports(author_id);
CREATE INDEX idx_reports_anon_token ON public.reports(anon_token);   -- Per recupero segnalazioni anonime
CREATE INDEX idx_comments_report_id ON public.comments(report_id);
CREATE INDEX idx_votes_report_id    ON public.votes(report_id);
CREATE INDEX idx_chat_report_id     ON public.chat_messages(report_id);

-- ============================================================
-- VIEW PER L'ADMIN: mascheramento completo dell'anonimato
-- L'admin interroga questa VIEW, non la tabella raw.
-- Sia author_id che anon_token sono sempre NULL per le segnalazioni anonime.
-- ============================================================

CREATE OR REPLACE VIEW public.reports_admin_view AS
  SELECT
    id,
    box_slug,
    CASE WHEN is_anonymous THEN NULL ELSE author_id END AS author_id,
    NULL::UUID AS anon_token,   -- Il token è sempre nascosto all'admin
    type,
    title,
    content,
    is_public,
    is_anonymous,
    status,
    created_at
  FROM public.reports;

-- ============================================================
-- DATI SEED — Box demo per i test iniziali
-- ============================================================

INSERT INTO public.boxes (slug, name, categories, notif_emails) VALUES (
  'demo',
  'Liceo Demo (Sportello di Prova)',
  ARRAY['Bullismo', 'Infrastrutture', 'Didattica', 'Proposte', 'Altro'],
  ARRAY['preside@scuola.edu.it']
);

-- ============================================================
-- supabase_trigger_profile.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Trigger: Auto-creazione profilo al primo login
-- Da eseguire nel SQL Editor di Supabase (una sola volta).
-- NOTA: supabase_security_p0.sql riesegue questo trigger con
-- role fisso = 'student' (non fidarsi di raw_user_meta_data.role).
-- ============================================================

-- Funzione che scatta ogni volta che un nuovo utente viene creato in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    -- SEMPRE student: la promozione ad admin avviene solo via
    -- become_admin_and_link_box (vedi supabase_security_p0.sql)
    'student',
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'cognome',
    -- Legge il box_slug dai metadata (passato da db.js → requestOTP)
    NEW.raw_user_meta_data->>'box_slug'
  )
  ON CONFLICT (id) DO NOTHING; -- Non sovrascrive profili esistenti

  RETURN NEW;
END;
$$;

-- Collega la funzione all'evento INSERT su auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- supabase_rls_policies.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — RLS Policies v1.1 (verificate e corrette)
-- Da eseguire nel SQL Editor di Supabase DOPO lo schema.
-- ============================================================

-- ============================================================
-- FIX SCHEMA: comments.author_id aveva NOT NULL ma il CHECK
-- constraint permette NULL per commenti anonimi. Risolviamo.
-- ============================================================

ALTER TABLE public.comments
  ALTER COLUMN author_id DROP NOT NULL;

-- ============================================================
-- FUNZIONE HELPER: restituisce il box_slug dell'utente corrente.
-- SECURITY DEFINER evita la ricorsione nelle policy su profiles.
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

-- ============================================================
-- TABELLA: boxes
-- Chiunque può leggere (serve per la pagina di login/verifica).
-- Solo l'admin del box può modificarlo.
-- ============================================================

CREATE POLICY "Chiunque puo leggere i box" ON public.boxes
  FOR SELECT USING (true);

CREATE POLICY "Admin puo aggiornare il proprio box" ON public.boxes
  FOR UPDATE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = boxes.slug
  );

-- ============================================================
-- TABELLA: profiles
-- Ogni utente gestisce solo il proprio profilo.
-- L'admin può vedere i profili del suo box tramite la funzione helper.
-- ============================================================

CREATE POLICY "Utente legge il proprio profilo" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Utente crea il proprio profilo" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Utente aggiorna il proprio profilo" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin vede i profili del suo box (usa la funzione helper — no ricorsione)
CREATE POLICY "Admin legge i profili del proprio box" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = profiles.box_slug
  );

-- ============================================================
-- TABELLA: reports
-- ============================================================

-- Lo studente vede le proprie segnalazioni identificate
CREATE POLICY "Studente vede le proprie segnalazioni" ON public.reports
  FOR SELECT USING (author_id = auth.uid());

-- Lo studente vede i post pubblici nel suo box (Forum)
CREATE POLICY "Studente vede i post pubblici del suo box" ON public.reports
  FOR SELECT USING (
    is_public = true AND
    box_slug = public.get_my_box_slug()
  );

-- L'admin vede tutte le segnalazioni del suo box
-- Il frontend usa reports_admin_view che maschera i dati anonimi.
CREATE POLICY "Admin vede tutte le segnalazioni del suo box" ON public.reports
  FOR SELECT USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = reports.box_slug
  );

-- FIX BUG: per le segnalazioni identificate, author_id DEVE corrispondere
-- all'utente loggato. Per quelle anonime, author_id DEVE essere NULL.
-- Questo impedisce di falsificare l'identità dell'autore.
CREATE POLICY "Utente puo inviare segnalazioni" ON public.reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    box_slug = public.get_my_box_slug() AND
    (
      (is_anonymous = false AND author_id = auth.uid() AND anon_token IS NULL) OR
      (is_anonymous = true  AND author_id IS NULL      AND anon_token IS NOT NULL)
    )
  );

-- Solo l'admin può aggiornare lo stato di una segnalazione
CREATE POLICY "Admin puo aggiornare segnalazioni del suo box" ON public.reports
  FOR UPDATE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = reports.box_slug
  );

-- Solo l'admin può eliminare segnalazioni
CREATE POLICY "Admin puo eliminare segnalazioni del suo box" ON public.reports
  FOR DELETE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = reports.box_slug
  );

-- ============================================================
-- FUNZIONE SICURA: Recupero segnalazioni anonime tramite token
-- Il client invia i token salvati nel localStorage.
-- UUID casuale = 2^122 combinazioni: impossibile indovinarlo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_anon_reports(tokens UUID[])
RETURNS SETOF public.reports
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.reports
  WHERE anon_token = ANY(tokens)
  ORDER BY created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_anon_reports(UUID[]) TO authenticated;

-- ============================================================
-- TABELLA: comments
-- ============================================================

CREATE POLICY "Utenti leggono commenti dei post pubblici" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = comments.report_id
        AND r.is_public = true
        AND r.box_slug = public.get_my_box_slug()
    )
  );

-- Verifica che l'autore del commento sia l'utente loggato (o anonimo)
CREATE POLICY "Utente autenticato puo commentare" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
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

-- ============================================================
-- TABELLA: votes
-- ============================================================

CREATE POLICY "Utenti leggono i voti nel loro box" ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = votes.report_id
        AND r.box_slug = public.get_my_box_slug()
    )
  );

CREATE POLICY "Utente puo votare" ON public.votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Utente puo togliere il proprio voto" ON public.votes
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- TABELLA: chat_messages
-- Solo l'autore identificato e l'admin possono accedere alla chat.
-- NOTA: la chat per segnalazioni ANONIME richiede una funzione RPC
-- separata (get_anon_chat) da implementare nella Fase 4.
-- ============================================================

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

CREATE POLICY "Autore o admin puo inviare messaggi in chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
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
-- supabase_ban_policy.sql
-- ============================================================

-- ============================================================
-- FIX 1: Aggiorna il vincolo di check sul ruolo per permettere 'banned'
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'banned'));

-- ============================================================
-- FIX 2: Consenti agli Admin di aggiornare i profili del proprio box.
-- ============================================================
CREATE POLICY "Admin aggiorna i profili del proprio box" ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = profiles.box_slug
  );

-- ============================================================
-- supabase_security_p0.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P0: Sicurezza auth + anon_token
-- Da eseguire nel SQL Editor di Supabase DOPO supabase_fixes.sql.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
-- ============================================================

-- ============================================================
-- 1. NASCONDERE anon_token AL CLIENT — ⚠️ CRITICO ⚠️
-- Chiunque potesse SELECT * su reports/comments/chat_messages
-- leggeva il token e poteva impersonare l'autore anonimo
-- (chat, cambio stato). REVOKE sulla colonna: INSERT resta
-- permesso (il client genera e salva il token in localStorage).
-- Le RPC SECURITY DEFINER (get_anon_reports, get_anon_chat, …)
-- continuano a vedere la colonna come owner della funzione.
-- ============================================================

REVOKE SELECT (anon_token) ON public.reports       FROM PUBLIC, anon, authenticated;
REVOKE SELECT (anon_token) ON public.comments      FROM PUBLIC, anon, authenticated;
REVOKE SELECT (anon_token) ON public.chat_messages FROM PUBLIC, anon, authenticated;

-- INSERT del token resta necessario per creare segnalazioni/commenti anonimi
GRANT INSERT (anon_token) ON public.reports       TO authenticated;
GRANT INSERT (anon_token) ON public.comments      TO authenticated;
GRANT INSERT (anon_token) ON public.chat_messages TO authenticated;

-- ============================================================
-- 2. TRIGGER handle_new_user — MAI fidarsi di role nei metadata
-- Prima: raw_user_meta_data->>'role' poteva creare admin al signup.
-- Ora: ogni nuovo utente nasce SEMPRE come student; la promozione
-- ad admin avviene solo via RPC become_admin_and_link_box.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    -- box_slug dai metadata (OTP studente). Per admin resta NULL
    -- finché non chiama become_admin_and_link_box.
    NEW.raw_user_meta_data->>'box_slug'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. RPC: become_admin_and_link_box
-- Crea atomicamente la box, promuove a admin e collega box_slug.
-- Fallisce se lo slug esiste già (niente attach a box altrui).
-- ============================================================

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

  -- Fail hard: nessuno può agganciare un profilo a uno slug già preso
  IF EXISTS (SELECT 1 FROM public.boxes WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug already exists: %', v_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Solo il proprio profilo, e solo se non è già admin di un'altra box
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

-- ============================================================
-- supabase_security_p1.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P1: Whitelist privata + author UPDATE + RPC
-- Da eseguire nel SQL Editor di Supabase DOPO supabase_security_p0.sql.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
-- Non modifica become_admin_and_link_box / handle_new_user (P0).
-- ============================================================

-- ============================================================
-- 1. BOXES: nascondere whitelist / notif_emails al pubblico
-- Prima: SELECT USING (true) esponeva email studenti e notif.
-- Ora: solo l'admin del box legge la tabella completa;
--      anon/authenticated leggono la view boxes_public (campi sicuri).
-- ============================================================

DROP POLICY IF EXISTS "Chiunque puo leggere i box" ON public.boxes;
DROP POLICY IF EXISTS "Admin legge il proprio box" ON public.boxes;
CREATE POLICY "Admin legge il proprio box" ON public.boxes
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    AND public.get_my_box_slug() = boxes.slug
  );

-- View pubblica: niente whitelist / notif_emails.
-- security_invoker OFF (default): gira come owner e bypassa la RLS
-- ristretta sulla tabella, esponendo SOLO colonne sicure.
CREATE OR REPLACE VIEW public.boxes_public AS
SELECT
  slug,
  name,
  categories,
  require_class,
  email_filter_mode,
  regolamento
FROM public.boxes;

GRANT SELECT ON public.boxes_public TO anon, authenticated;

-- ============================================================
-- 2. RPC: check_email_allowed
-- Confronta email ↔ whitelist lato server (SECURITY DEFINER).
-- Comportamento allineato a Verify.jsx pre-P1:
--   whitelist vuota / assente → true (nessun filtro attivo)
--   mode 'domain' → email ends with @dominio
--   mode 'exact' (default) → match esatto
-- ============================================================

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

  -- Nessuna entry → filtro disattivo (come il client prima di P1)
  -- Nota: cardinality('{}') in Postgres è NULL, non 0
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
      -- Allinea a Verify.jsx: email.endsWith('@' + dominio)
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

-- ============================================================
-- 3. AUTHOR UPDATE su reports — solo status resolved/closed
-- La policy di supabase_fixes.sql permetteva UPDATE arbitrario
-- (title, content, box_slug, is_public, …). Ora:
--   - policy WITH CHECK: status ∈ {resolved, closed}
--   - trigger: nessun altro campo modificabile dall'autore
-- Admin del box resta libero (policy admin invariata).
-- ============================================================

DROP POLICY IF EXISTS "Autore aggiorna le proprie segnalazioni" ON public.reports;
CREATE POLICY "Autore aggiorna le proprie segnalazioni" ON public.reports
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND status IN ('resolved', 'closed')
  );

CREATE OR REPLACE FUNCTION public.restrict_author_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Admin del box: nessun vincolo aggiuntivo (RLS già limita al proprio box)
  IF public.get_my_role() = 'admin'
     AND public.get_my_box_slug() IS NOT DISTINCT FROM OLD.box_slug THEN
    RETURN NEW;
  END IF;

  -- Autore identificato: solo cambio stato → resolved/closed
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

DROP TRIGGER IF EXISTS trg_restrict_author_report_update ON public.reports;
CREATE TRIGGER trg_restrict_author_report_update
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_author_report_update();

-- Allinea anche l'RPC anon: solo resolved/closed (non new/in_review)
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
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- 4. REVOKE get_anon_reports da PUBLIC/anon
-- Allineato alle altre RPC (get_anon_chat, get_public_reports, …).
-- ============================================================

REVOKE ALL ON FUNCTION public.get_anon_reports(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_anon_reports(UUID[]) TO authenticated;

-- ============================================================
-- supabase_security_p2.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P2: report_owners via trigger (anti-race)
-- Da eseguire nel SQL Editor di Supabase DOPO:
--   supabase_push_notifications.sql (crea report_owners)
--   supabase_security_p0.sql / supabase_security_p1.sql
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
-- ============================================================

-- Dopo INSERT su reports, se c'è auth.uid() inserisce ownership
-- lato server (SECURITY DEFINER). Riduce la race in cui il client
-- crea il report ma fallisce/ritarda l'upsert su report_owners.
-- Il client (db.js createReport) tiene comunque un upsert di fallback.

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

DROP TRIGGER IF EXISTS trg_claim_report_owner ON public.reports;
CREATE TRIGGER trg_claim_report_owner
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_report_owner();

-- Nota schema status (solo documentazione / fresh installs):
-- Il CHECK corretto è ('new','in_review','resolved','closed').
-- DB già in produzione: già migrati da supabase_fixes.sql.
-- Nuovi install: supabase_schema.sql è allineato a questi valori.
-- Non rieseguire ALTER CHECK qui se supabase_fixes.sql è già applicato.

-- ============================================================
-- supabase_security_p3.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P3: ban effettivo, anti-escalation, sportelli verificati
-- Da eseguire nel SQL Editor di Supabase DOPO supabase_security_p2.sql.
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
-- DILLO QUI — Patch P4: gestione degli sportelli dal pannello
-- Da eseguire nel SQL Editor DOPO supabase_security_p3.sql.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
--
-- Aggiunge tre cose al pannello /admin/piattaforma:
--   1. sospensione di uno sportello (blocca le scritture, non i dati)
--   2. eliminazione definitiva
--   3. scheda di dettaglio con le statistiche di attività
--
-- La sospensione non è un avviso grafico: è applicata dalle policy,
-- quindi vale anche per chi chiama l'API direttamente.
-- ============================================================


-- ============================================================
-- 1. LO STATO DI SOSPENSIONE
-- Sospeso ≠ eliminato. I dati restano, gli studenti continuano a
-- leggere le proprie segnalazioni e le chat, ma nessuno può più
-- scrivere. Serve per fermare uno sportello problematico senza
-- cancellare quello che ci hanno affidato gli studenti.
-- ============================================================

ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS suspended      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_note TEXT;

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


-- ============================================================
-- 2. IL TRIGGER CONGELA ANCHE LA SOSPENSIONE
-- Senza questo, l'admin della scuola si toglierebbe la sospensione
-- da solo con un normale update dalle impostazioni.
-- Sostituisce la versione di P3: stessa logica, due campi in più.
-- ============================================================

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


-- ============================================================
-- 3. LE SCRITTURE SI FERMANO
-- Ognuna delle policy di P3 con in più il controllo sullo stato.
-- Le SELECT restano intatte: chi ha già scritto continua a leggere.
-- ============================================================

DROP POLICY IF EXISTS "Utente puo inviare segnalazioni" ON public.reports;
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

DROP POLICY IF EXISTS "Utente autenticato puo commentare" ON public.comments;
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
        AND public.is_box_open(r.box_slug)
    )
  );

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

-- Le RPC anonime sono SECURITY DEFINER e saltano le policy: il
-- controllo va ripetuto dentro, come già fatto per il ban in P3.
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
      WHERE r.id = p_report_id
        AND r.anon_token = p_token
        AND public.is_box_open(r.box_slug)
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
    AND public.is_box_open(box_slug)
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.send_anon_chat_message(UUID, UUID, TEXT)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT)    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_anon_chat_message(UUID, UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT) TO authenticated;


-- ============================================================
-- 4. LO STATO È VISIBILE PRIMA DEL LOGIN
-- Come per verified: la pagina di accesso deve poterlo dire a chi
-- arriva, senza costringerlo a registrarsi per scoprirlo.
-- ============================================================

CREATE OR REPLACE VIEW public.boxes_public AS
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
-- 5. RPC DEL PANNELLO
-- Come quelle di P3: gestore riconosciuto E sblocco attivo.
-- ============================================================

-- L'elenco, ora con stato di sospensione e ultima attività: servono
-- a capire a colpo d'occhio quali sportelli sono vivi e quali morti.
DROP FUNCTION IF EXISTS public.list_boxes_overview();
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


-- La scheda di dettaglio. Un solo JSON invece di dieci colonne:
-- così aggiungere una statistica non cambia la firma della funzione.
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

  -- Quanti studenti hanno scritto almeno una volta. Conta anche le
  -- segnalazioni anonime, che non hanno author_id. La tabella arriva
  -- con le push: se non le usi, il dato resta vuoto invece di rompere.
  IF to_regclass('public.report_owners') IS NOT NULL THEN
    EXECUTE
      'SELECT count(DISTINCT ro.user_id)
         FROM public.report_owners ro
         JOIN public.reports r ON r.id = ro.report_id
        WHERE r.box_slug = $1'
      INTO v_attivi USING v_box.slug;
  END IF;

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


-- Sospendere o riattivare.
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


-- Eliminazione definitiva. Il secondo argomento deve ripetere lo
-- slug: senza una conferma esplicita un click sbagliato porterebbe
-- via tutte le segnalazioni di una scuola, e non c'è un annulla.
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
  -- account con privilegi che non hanno più un oggetto su cui valere
  UPDATE public.profiles
  SET role = 'student'
  WHERE box_slug = p_slug AND role = 'admin';

  -- reports va in CASCADE, profiles.box_slug torna NULL
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
-- Sospendere / riattivare a mano, se il pannello non è raggiungibile:
--   UPDATE public.boxes
--   SET suspended = TRUE, suspended_at = NOW(),
--       suspended_note = 'Segnalato come non autentico'
--   WHERE slug = 'nome-sportello';
-- ============================================================

-- ============================================================
-- supabase_p5_privacy.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P5: cancellazione dei dati
-- Da eseguire nel SQL Editor DOPO supabase_p4_gestione_sportelli.sql.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
--
-- Due promesse della privacy policy che il database non manteneva:
--   1. «Elimina account» — il pulsante c'era e falliva ogni volta
--   2. «eliminati entro 24 mesi dall'ultimo accesso» — non succedeva
--
-- La pianificazione automatica è l'ULTIMO passo ed è separata apposta:
-- prima si guarda cosa verrebbe cancellato, poi si accende.
-- ============================================================


-- ============================================================
-- 1. ELIMINAZIONE DELL'ACCOUNT DA PARTE DELL'UTENTE
--
-- Perché non funzionava: il client provava a scrivere role='deleted'
-- sul proprio profilo, ma quel valore non è fra quelli ammessi dal
-- CHECK, e in più la policy vieta di cambiarsi il ruolo da soli.
-- Falliva quindi due volte, e l'utente vedeva «Impossibile eliminare
-- l'account» senza sapere perché.
--
-- Le segnalazioni non si possono staccare lasciando author_id a NULL:
-- il vincolo chk_author_xor_token pretende che ci sia l'autore OPPURE
-- il token. Vanno quindi convertite in anonime con un token nuovo, che
-- è anche l'unico modo di renderle davvero non riconducibili.
-- ============================================================

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

  -- Le segnalazioni restano sul forum ma perdono l'autore, come
  -- promesso nella schermata di conferma
  UPDATE public.reports
  SET author_id    = NULL,
      anon_token   = gen_random_uuid(),
      is_anonymous = TRUE
  WHERE author_id = v_uid;
  GET DIAGNOSTICS v_report = ROW_COUNT;

  -- Senza questo il collegamento sopravviverebbe alla cancellazione
  IF to_regclass('public.report_owners') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.report_owners WHERE user_id = $1' USING v_uid;
  END IF;

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


-- ============================================================
-- 2. CANCELLAZIONE AUTOMATICA DEI DATI VECCHI
--
-- Registro delle esecuzioni: senza una traccia, una cancellazione
-- automatica è indistinguibile da una perdita di dati.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.retention_log (
  id                     BIGSERIAL PRIMARY KEY,
  eseguito_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  simulazione            BOOLEAN NOT NULL,
  mesi                   INT NOT NULL,
  account_eliminati      INT NOT NULL DEFAULT 0,
  segnalazioni_eliminate INT NOT NULL DEFAULT 0
);

-- Nessuna policy: il registro non è affare del client
ALTER TABLE public.retention_log ENABLE ROW LEVEL SECURITY;


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
  -- Una soglia bassa per errore cancellerebbe dati ancora in uso, e
  -- non c'è un annulla: meglio rifiutare che eseguire
  IF p_mesi IS NULL OR p_mesi < 6 THEN
    RAISE EXCEPTION 'Soglia troppo bassa (% mesi): il minimo accettato è 6', p_mesi;
  END IF;

  v_soglia := NOW() - make_interval(months => p_mesi);

  -- last_sign_in_at è NULL per chi non ha mai completato l'accesso:
  -- in quel caso vale la data di creazione
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

  -- Anche le anonime: il collegamento in report_owners le rende
  -- comunque riconducibili, quindi rientrano nella stessa promessa
  IF to_regclass('public.report_owners') IS NOT NULL THEN
    EXECUTE
      'SELECT COALESCE(array_agg(ro.report_id), ARRAY[]::UUID[])
         FROM public.report_owners ro WHERE ro.user_id = ANY($1)'
      INTO v_extra USING v_utenti;
    SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::UUID[])
      INTO v_reports
    FROM unnest(v_reports || v_extra) AS x;
  END IF;

  IF p_simulazione THEN
    v_n_utenti := COALESCE(array_length(v_utenti, 1), 0);
    v_n_report := COALESCE(array_length(v_reports, 1), 0);
  ELSE
    -- Prima le segnalazioni: cancellando l'utente per primo, il vincolo
    -- chk_author_xor_token farebbe fallire tutto
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

-- Non deve essere raggiungibile dall'app in nessun caso
REVOKE ALL ON FUNCTION public.apply_retention(BOOLEAN, INT) FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 3. PRIMA DI ACCENDERLA: guarda cosa toglierebbe
-- Esegui questa riga e leggi i numeri. Non cancella niente.
-- ============================================================

SELECT public.apply_retention(TRUE, 24) AS simulazione;


-- ============================================================
-- 4. PIANIFICAZIONE (da fare a mano, quando i numeri ti convincono)
--
-- Abilita pg_cron da Database → Extensions nella dashboard Supabase,
-- poi esegui queste due righe:
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--   SELECT cron.schedule(
--     'dilloqui-retention',
--     '0 3 1 * *',                                  -- 03:00 del primo del mese
--     $$SELECT public.apply_retention(FALSE, 24)$$
--   );
--
-- Per vedere cosa ha fatto:
--   SELECT * FROM public.retention_log ORDER BY eseguito_at DESC;
--
-- Per fermarla:
--   SELECT cron.unschedule('dilloqui-retention');
--
-- Finché non pianifichi niente, la funzione resta a disposizione ma
-- non parte da sola: puoi lanciarla a mano una volta all'anno con
--   SELECT public.apply_retention(FALSE, 24);
-- ============================================================

-- ============================================================
-- supabase_p6_forum_paginazione.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P6: paginazione del forum
-- Da eseguire nel SQL Editor DOPO supabase_p5_privacy.sql.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
--
-- Il forum scaricava TUTTI i post pubblici dello sportello a ogni
-- caricamento. Finché sono poche decine non si nota, ma da quando la
-- pagina si aggiorna da sola ogni 45 secondi quella query si ripete
-- di continuo, per ogni studente collegato: una scuola con qualche
-- centinaio di post pubblici pagherebbe caro un elenco di cui si
-- vedono le prime righe.
--
-- Da qui in poi la funzione accetta un tetto e restituisce i post più
-- recenti. Il client parte da 50 e alza il tetto quando l'utente
-- chiede di vederne altri.
-- ============================================================


-- ============================================================
-- 1. RPC: POST PUBBLICI CON TETTO MASSIMO
--
-- La vecchia versione a un solo parametro va eliminata prima di
-- creare quella nuova: con i valori di default convivrebbero come
-- due varianti della stessa funzione e la chiamata a un argomento
-- diventerebbe ambigua, facendo fallire il forum con un errore
-- poco leggibile.
--
-- Il tetto viene comunque limitato lato database: un client
-- manomesso non può usare questa funzione per scaricare in blocco
-- l'intero archivio dello sportello.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_public_reports_with_authors(TEXT);

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
    AND p_box_slug = public.get_my_box_slug()   -- solo membri del box
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500));
$$;

REVOKE ALL ON FUNCTION public.get_public_reports_with_authors(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_reports_with_authors(TEXT, INT) TO authenticated;


-- ============================================================
-- 2. INDICE PER L'ORDINAMENTO
--
-- Senza, prendere i 50 più recenti costringe comunque a leggere e
-- ordinare tutti i post pubblici dello sportello: il tetto
-- risparmierebbe la rete ma non il database.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reports_forum_recenti
  ON public.reports (box_slug, created_at DESC)
  WHERE is_public = true;


-- ============================================================
-- 3. RICARICA DELLO SCHEMA
-- Senza questo PostgREST può continuare a esporre la vecchia firma
-- per qualche minuto, e il forum risponde «funzione non trovata».
-- ============================================================

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- VERIFICA
-- Deve restituire una riga sola, con due argomenti.
-- ============================================================
-- SELECT p.oid::regprocedure AS firma
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'get_public_reports_with_authors';

-- ============================================================
-- supabase_notifications.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Tabella notifiche in-app
-- Da eseguire nel SQL Editor di Supabase. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL, -- 'chat_message' | 'status_change' | 'new_report' | 'forum_comment'
  title       TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL DEFAULT '',
  url         TEXT        NOT NULL DEFAULT '/',
  report_id   UUID        REFERENCES public.reports(id) ON DELETE CASCADE,
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Ogni utente vede solo le proprie notifiche
DROP POLICY IF EXISTS "Utente legge le proprie notifiche" ON public.notifications;
CREATE POLICY "Utente legge le proprie notifiche" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Ogni utente può marcare le proprie come lette
DROP POLICY IF EXISTS "Utente aggiorna le proprie notifiche" ON public.notifications;
CREATE POLICY "Utente aggiorna le proprie notifiche" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Solo il service_role (Edge Function) può inserire notifiche
-- (nessuna policy INSERT per authenticated → solo service_role bypass RLS)

-- Abilita Realtime per aggiornamenti in tempo reale
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- supabase_push_notifications.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Push Notifications (preferenze + subscriptions)
-- Da eseguire nel SQL Editor di Supabase. Idempotente.
-- ============================================================

-- Preferenze per categoria sul profilo.
-- Struttura JSON:
--   {
--     "push_enabled": false,
--     "new_report": true,      -- admin: nuova segnalazione
--     "chat_message": true,    -- admin/studente: messaggio in chat
--     "status_change": true,   -- studente: cambio stato segnalazione
--     "forum_comment": true    -- studente: commento su un mio post
--   }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_prefs JSONB NOT NULL DEFAULT '{
    "push_enabled": false,
    "new_report": true,
    "chat_message": true,
    "status_change": true,
    "forum_comment": true
  }'::jsonb;

-- Dispositivi iscritti alle Web Push (un utente può averne più di uno)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utente gestisce le proprie subscription" ON public.push_subscriptions;
CREATE POLICY "Utente gestisce le proprie subscription" ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Mapping privato segnalazione → studente (anche se anonima).
-- L'admin NON può leggere questa tabella: serve solo per le push lato server.
CREATE TABLE IF NOT EXISTS public.report_owners (
  report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.report_owners ENABLE ROW LEVEL SECURITY;

-- Solo il proprietario può inserire/leggere la propria riga (mai l'admin via client)
DROP POLICY IF EXISTS "Studente vede le proprie ownership" ON public.report_owners;
CREATE POLICY "Studente vede le proprie ownership" ON public.report_owners
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Studente crea ownership" ON public.report_owners;
CREATE POLICY "Studente crea ownership" ON public.report_owners
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Helper: admin del box (per l'Edge Function con service role)
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
-- Solo service_role (Edge Function) può usarla
GRANT EXECUTE ON FUNCTION public.get_box_admin_ids(TEXT) TO service_role;

-- ============================================================
-- supabase_regolamento.sql
-- ============================================================

-- Sezione Regolamento per ogni Box (testo scritto dagli admin)
-- Esegui questo script nella SQL Editor di Supabase.

ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS regolamento TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.boxes.regolamento IS
  'Testo del regolamento dello sportello, modificabile dagli admin e visibile agli studenti.';

-- ============================================================
-- supabase_security_p7.sql
-- ============================================================

-- ============================================================
-- DILLO QUI — Patch P7: whitelist affidabile, input e dedup push
-- Da eseguire DOPO supabase_p6_forum_paginazione.sql.
-- Idempotente. Non rieseguire gli script storici P0/P1/fixes dopo P7.
-- ============================================================

-- L'email nel profilo è un dato di visualizzazione, non una fonte di
-- autorizzazione. Questa funzione legge invece la sorgente verificata di
-- Supabase Auth. L'utente può invocarla solo per leggere la propria email.
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

-- Il client non può più cambiare l'email-specchio del profilo. Le modifiche
-- amministrative/service_role (senza auth.uid) restano possibili.
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

DROP TRIGGER IF EXISTS trg_keep_profile_email_from_auth ON public.profiles;
CREATE TRIGGER trg_keep_profile_email_from_auth
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_profile_email_from_auth();

-- La prima associazione a uno sportello usa solo l'email verificata in Auth.
-- L'email del profilo deve sempre coincidere per impedire escalation in due
-- richieste (cambio email, poi cambio box_slug).
DROP POLICY IF EXISTS "Utente aggiorna il proprio profilo" ON public.profiles;
CREATE POLICY "Utente aggiorna il proprio profilo" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_my_role()
    AND lower(email) = public.get_authenticated_email()
    AND (
      public.get_my_box_slug() IS NULL
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
    )
    AND (
      box_slug IS NULL
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
      OR public.check_email_allowed(box_slug, public.get_authenticated_email())
    )
  );

DROP POLICY IF EXISTS "Utente crea il proprio profilo" ON public.profiles;
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

-- Vincoli sui nuovi contenuti: la UI non è un confine di sicurezza.
CREATE OR REPLACE FUNCTION public.validate_user_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'reports' THEN
    -- Le patch privacy aggiornano solo autore/token su dati storici: non
    -- devono fallire se un vecchio record non rispetta le regole introdotte
    -- oggi. Tutte le nuove scritture e modifiche di contenuto sono validate.
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

DROP TRIGGER IF EXISTS trg_validate_reports_content ON public.reports;
CREATE TRIGGER trg_validate_reports_content
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

DROP TRIGGER IF EXISTS trg_validate_comments_content ON public.comments;
CREATE TRIGGER trg_validate_comments_content
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

DROP TRIGGER IF EXISTS trg_validate_chat_content ON public.chat_messages;
CREATE TRIGGER trg_validate_chat_content
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

-- Evita che la Edge Function invii più volte la stessa notifica per lo stesso
-- evento già salvato (report, commento o messaggio chat).
CREATE TABLE IF NOT EXISTS public.notification_event_log (
  actor_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('new_report', 'chat_message', 'forum_comment')),
  event_id   UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_type, event_id)
);

ALTER TABLE public.notification_event_log ENABLE ROW LEVEL SECURITY;
-- Nessuna policy: solo service_role della Edge Function può scrivere.

NOTIFY pgrst, 'reload schema';
