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
