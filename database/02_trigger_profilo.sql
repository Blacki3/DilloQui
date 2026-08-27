-- ============================================================
-- DILLO QUI — Trigger: Auto-creazione profilo
-- ============================================================
-- NOTA: supabase_security_p0.sql riesegue questo trigger con
-- role fisso = 'student' (non fidarsi di raw_user_meta_data.role).
-- ============================================================

-- Funzione che scatta ogni volta che un nuovo utente viene creato in auth.users
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
    -- SEMPRE student: la promozione ad admin avviene solo via
    -- become_admin_and_link_box (vedi supabase_security_p0.sql)
    'student',
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'cognome',
    -- Legge il box_slug dai metadata (passato da db.js → requestOTP)
    NEW.raw_user_meta_data->>'box_slug'
  )
  ON CONFLICT (id) DO NOTHING; -- Non sovrascrive profili esistenti

  RETURN NEW;
END;
$$;

-- Collega la funzione all'evento INSERT su auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- supabase_rls_policies.sql
-- ============================================================

-- ============================================================
