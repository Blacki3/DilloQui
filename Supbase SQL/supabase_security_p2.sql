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
