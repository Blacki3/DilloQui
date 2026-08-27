-- ============================================================
-- DILLO QUI — Policy aggiuntiva: Ban Utenti
-- ============================================================

-- ============================================================
-- FIX 1: Aggiorna il vincolo di check sul ruolo per permettere 'banned'
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'banned'));

-- ============================================================
-- FIX 2: Consenti agli Admin di aggiornare i profili del proprio box.
-- ============================================================
CREATE POLICY "Admin aggiorna i profili del proprio box" ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() = 'admin' AND
    public.get_my_box_slug() = profiles.box_slug
  );

-- ============================================================
-- supabase_security_p0.sql
-- ============================================================

-- ============================================================
