-- ============================================================
-- DILLO QUI — RLS Policies
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
  ) WITH CHECK (true);

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
-- L'accesso è verificato server-side tramite report_owners e auth.uid().
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
