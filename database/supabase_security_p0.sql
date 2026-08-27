-- ============================================================
-- DILLO QUI — Patch P0: Sicurezza auth + anon_token
-- Da eseguire nel SQL Editor di Supabase DOPO supabase_fixes.sql.
-- Script IDEMPOTENTE: può essere rieseguito senza danni.
-- ============================================================

-- ============================================================
-- 1. NASCONDERE anon_token AL CLIENT — ⚠️ CRITICO ⚠️
-- Chiunque potesse SELECT * su reports/comments/chat_messages
-- leggeva il token e poteva impersonare l'autore anonimo
-- (chat, cambio stato). REVOKE sulla colonna: INSERT resta
-- permesso (il client genera e salva il token in localStorage).
-- Le RPC SECURITY DEFINER (get_anon_reports, get_anon_chat, …)
-- continuano a vedere la colonna come owner della funzione.
-- ============================================================

REVOKE SELECT (anon_token) ON public.reports       FROM PUBLIC, anon, authenticated;
REVOKE SELECT (anon_token) ON public.comments      FROM PUBLIC, anon, authenticated;
REVOKE SELECT (anon_token) ON public.chat_messages FROM PUBLIC, anon, authenticated;

-- INSERT del token resta necessario per creare segnalazioni/commenti anonimi
GRANT INSERT (anon_token) ON public.reports       TO authenticated;
GRANT INSERT (anon_token) ON public.comments      TO authenticated;
GRANT INSERT (anon_token) ON public.chat_messages TO authenticated;

-- ============================================================
-- 2. TRIGGER handle_new_user — MAI fidarsi di role nei metadata
-- Prima: raw_user_meta_data->>'role' poteva creare admin al signup.
-- Ora: ogni nuovo utente nasce SEMPRE come student; la promozione
-- ad admin avviene solo via RPC become_admin_and_link_box.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    nome,
    cognome,
    box_slug
  )
  VALUES (
    NEW.id,
    NEW.email,
    'student',  -- MAI leggere role da raw_user_meta_data
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'cognome',
    -- box_slug dai metadata (OTP studente). Per admin resta NULL
    -- finché non chiama become_admin_and_link_box.
    NEW.raw_user_meta_data->>'box_slug'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. RPC: become_admin_and_link_box
-- Crea atomicamente la box, promuove a admin e collega box_slug.
-- Fallisce se lo slug esiste già (niente attach a box altrui).
-- ============================================================

CREATE OR REPLACE FUNCTION public.become_admin_and_link_box(
  p_slug   TEXT,
  p_name   TEXT,
  p_nome   TEXT DEFAULT NULL,
  p_cognome TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_slug    TEXT;
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_slug := lower(trim(both '-' FROM regexp_replace(
    regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  )));

  IF v_slug IS NULL OR v_slug = '' THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Invalid box name';
  END IF;

  -- Fail hard: nessuno può agganciare un profilo a uno slug già preso
  IF EXISTS (SELECT 1 FROM public.boxes WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug already exists: %', v_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Solo il proprio profilo, e solo se non è già admin di un'altra box
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.role = 'admin' AND v_profile.box_slug IS NOT NULL THEN
    RAISE EXCEPTION 'Already admin of box: %', v_profile.box_slug;
  END IF;

  INSERT INTO public.boxes (slug, name, categories)
  VALUES (
    v_slug,
    trim(p_name),
    ARRAY['Bullismo', 'Infrastrutture', 'Didattica', 'Proposte', 'Altro']
  );

  UPDATE public.profiles
  SET
    role     = 'admin',
    box_slug = v_slug,
    nome     = COALESCE(NULLIF(trim(p_nome), ''), nome),
    cognome  = COALESCE(NULLIF(trim(p_cognome), ''), cognome)
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.become_admin_and_link_box(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_admin_and_link_box(TEXT, TEXT, TEXT, TEXT) TO authenticated;
