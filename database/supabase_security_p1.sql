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
