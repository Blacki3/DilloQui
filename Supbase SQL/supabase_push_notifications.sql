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
