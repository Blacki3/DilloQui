-- ============================================================
-- FIX: Permetti agli admin di registrare e creare nuovi box
-- Esegui questo script nel SQL Editor di Supabase.
-- ============================================================

-- Aggiungi policy per consentire l'inserimento di un nuovo Box da parte di un admin
CREATE POLICY "Admin puo creare un nuovo box" ON public.boxes
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'admin'
  );
