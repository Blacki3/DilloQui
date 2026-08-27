-- ============================================================
-- DILLO QUI — Schema Database v1.1
-- Sistema di anonimato: token casuale generato lato client.
-- Da eseguire nel SQL Editor di Supabase (una sola volta).
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
