-- ============================================================
-- DILLO QUI — Forum: Paginazione e Commenti
-- ============================================================
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
