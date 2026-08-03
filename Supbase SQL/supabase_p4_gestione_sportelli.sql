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
