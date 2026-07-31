-- ============================================================
-- DILLO QUI — Patch v1.2: Sicurezza + Completamento Backend
-- Da eseguire nel SQL Editor di Supabase DOPO gli altri 3 script.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
-- ============================================================

-- ============================================================
-- 1. ABILITAZIONE RLS — ⚠️ CRITICO ⚠️
-- Gli script precedenti creavano le policy ma NON abilitavano
-- la Row Level Security: senza questo blocco le policy vengono
-- IGNORATE e tutte le tabelle sono leggibili/scrivibili da
-- chiunque abbia la anon key (cioè chiunque apra il sito).
-- ============================================================

ALTER TABLE public.boxes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. VIEW ADMIN con security_invoker — ⚠️ CRITICO ⚠️
-- Di default le view girano con i permessi del proprietario
-- (postgres) e BYPASSANO la RLS: qualunque studente autenticato
-- avrebbe potuto leggere TUTTE le segnalazioni di TUTTE le
-- scuole, incluse quelle private. Con security_invoker la view
-- applica le policy dell'utente che la interroga.
-- ============================================================

ALTER VIEW public.reports_admin_view SET (security_invoker = on);

-- ============================================================
-- 3. FIX STATI SEGNALAZIONE
-- Il frontend usa: new / in_review / resolved / closed
-- Lo schema aveva:  new / in_progress / resolved / rejected
-- → ogni cambio di stato sarebbe fallito per CHECK violation.
-- ============================================================

UPDATE public.reports SET status = 'in_review' WHERE status = 'in_progress';
UPDATE public.reports SET status = 'closed'    WHERE status = 'rejected';

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('new', 'in_review', 'resolved', 'closed'));

-- ============================================================
-- 4. POLICY MANCANTI
-- ============================================================

-- 4a. INSERT su boxes: senza questa, la registrazione admin
-- (registerAdminReal → creazione sportello) fallisce sempre.
DROP POLICY IF EXISTS "Admin puo creare una box" ON public.boxes;
CREATE POLICY "Admin puo creare una box" ON public.boxes
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- 4b. Lo studente può aggiornare le proprie segnalazioni
-- identificate (MyReports: "Segna come Risolta" / "Chiudi").
DROP POLICY IF EXISTS "Autore aggiorna le proprie segnalazioni" ON public.reports;
CREATE POLICY "Autore aggiorna le proprie segnalazioni" ON public.reports
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ============================================================
-- 5. RPC: POST PUBBLICI CON NOME AUTORE (Forum / Tendenze)
-- Le policy su profiles impediscono a uno studente di leggere
-- i profili altrui, quindi il join client-side restituirebbe
-- sempre NULL come nome. Questa funzione SECURITY DEFINER
-- restituisce i nomi SOLO per i post non anonimi e SOLO ai
-- membri dello stesso box.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_reports_with_authors(p_box_slug TEXT)
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
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_reports_with_authors(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_reports_with_authors(TEXT) TO authenticated;

-- ============================================================
-- 6. RPC: COMMENTI CON NOME AUTORE (PostDetail)
-- Stessa logica: nomi visibili solo per commenti non anonimi.
-- anon_token NON viene mai restituito.
-- ============================================================

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
-- 7. RPC: CHAT PER SEGNALAZIONI ANONIME
-- Le policy su chat_messages coprono solo autori identificati
-- e admin. Per le segnalazioni anonime l'accesso avviene tramite
-- il token segreto salvato nel localStorage del client.
-- ============================================================

-- 7a. Lettura chat di una segnalazione anonima
CREATE OR REPLACE FUNCTION public.get_anon_chat(p_report_id UUID, p_token UUID)
RETURNS SETOF public.chat_messages
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.* FROM public.chat_messages m
  WHERE m.report_id = p_report_id
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = p_report_id AND r.anon_token = p_token
    )
  ORDER BY m.created_at ASC;
$$;

-- 7b. Invio messaggio in chat da segnalazione anonima
CREATE OR REPLACE FUNCTION public.send_anon_chat_message(p_report_id UUID, p_token UUID, p_content TEXT)
RETURNS public.chat_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.chat_messages (report_id, anon_token, content)
  SELECT p_report_id, p_token, p_content
  WHERE EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = p_report_id AND r.anon_token = p_token
  )
  RETURNING *;
$$;

-- 7c. Aggiornamento stato di una segnalazione anonima
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
    AND p_status IN ('new', 'in_review', 'resolved', 'closed')
  RETURNING *;
$$;

-- ============================================================
-- 8. SEPARAZIONE RUOLI ADMIN / STUDENTE — ⚠️ SICUREZZA ⚠️
-- La vecchia policy UPDATE su profiles permetteva a un utente di
-- modificare il PROPRIO ruolo: uno studente poteva auto-promuoversi
-- ad admin e leggere tutte le segnalazioni della sua scuola.
-- Ora: il ruolo non è modificabile dall'utente, e la box può essere
-- impostata solo se non ne ha già una (primo accesso/registrazione).
-- ============================================================

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
  );

-- L'INSERT diretto dal client può creare solo profili studente
-- (i profili admin nascono dal trigger handle_new_user, che è SECURITY DEFINER)
DROP POLICY IF EXISTS "Utente crea il proprio profilo" ON public.profiles;
CREATE POLICY "Utente crea il proprio profilo" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND role = 'student');

REVOKE ALL ON FUNCTION public.get_anon_chat(UUID, UUID)                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_anon_chat_message(UUID, UUID, TEXT)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT)     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_anon_chat(UUID, UUID)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_anon_chat_message(UUID, UUID, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_anon_report_status(UUID, UUID, TEXT)  TO authenticated;
