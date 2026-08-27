-- ============================================================
-- DILLO QUI — Configurazione: Regolamento Sportelli
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
