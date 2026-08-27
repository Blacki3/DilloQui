-- ============================================================
-- DILLO QUI — Patch P7: whitelist affidabile, input e dedup push
-- Da eseguire DOPO supabase_p6_forum_paginazione.sql.
-- Idempotente. Non rieseguire gli script storici P0/P1/fixes dopo P7.
-- ============================================================

-- L'email nel profilo è un dato di visualizzazione, non una fonte di
-- autorizzazione. Questa funzione legge invece la sorgente verificata di
-- Supabase Auth. L'utente può invocarla solo per leggere la propria email.
CREATE OR REPLACE FUNCTION public.get_authenticated_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, auth
AS $$
  SELECT lower(email) FROM auth.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_authenticated_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_authenticated_email() TO authenticated;

-- Il client non può più cambiare l'email-specchio del profilo. Le modifiche
-- amministrative/service_role (senza auth.uid) restano possibili.
CREATE OR REPLACE FUNCTION public.keep_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.id = auth.uid() THEN
    NEW.email := public.get_authenticated_email();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_keep_profile_email_from_auth ON public.profiles;
CREATE TRIGGER trg_keep_profile_email_from_auth
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_profile_email_from_auth();

-- La prima associazione a uno sportello usa solo l'email verificata in Auth.
-- L'email del profilo deve sempre coincidere per impedire escalation in due
-- richieste (cambio email, poi cambio box_slug).
DROP POLICY IF EXISTS "Utente aggiorna il proprio profilo" ON public.profiles;
CREATE POLICY "Utente aggiorna il proprio profilo" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_my_role()
    AND lower(email) = public.get_authenticated_email()
    AND (
      public.get_my_box_slug() IS NULL
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
    )
    AND (
      box_slug IS NULL
      OR box_slug IS NOT DISTINCT FROM public.get_my_box_slug()
      OR public.check_email_allowed(box_slug, public.get_authenticated_email())
    )
  );

DROP POLICY IF EXISTS "Utente crea il proprio profilo" ON public.profiles;
CREATE POLICY "Utente crea il proprio profilo" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND role = 'student'
    AND lower(email) = public.get_authenticated_email()
    AND (
      box_slug IS NULL
      OR public.check_email_allowed(box_slug, public.get_authenticated_email())
    )
  );

-- Vincoli sui nuovi contenuti: la UI non è un confine di sicurezza.
CREATE OR REPLACE FUNCTION public.validate_user_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'reports' THEN
    -- Le patch privacy aggiornano solo autore/token su dati storici: non
    -- devono fallire se un vecchio record non rispetta le regole introdotte
    -- oggi. Tutte le nuove scritture e modifiche di contenuto sono validate.
    IF TG_OP = 'INSERT'
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.box_slug IS DISTINCT FROM OLD.box_slug THEN
      IF char_length(btrim(NEW.title)) NOT BETWEEN 3 AND 80
         OR char_length(btrim(NEW.content)) NOT BETWEEN 10 AND 1000
         OR char_length(btrim(NEW.type)) NOT BETWEEN 1 AND 80 THEN
        RAISE EXCEPTION 'Contenuto della segnalazione non valido';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM public.boxes b
        CROSS JOIN unnest(b.categories) AS categoria(nome)
        WHERE b.slug = NEW.box_slug
          AND lower(btrim(categoria.nome)) = lower(btrim(NEW.type))
      ) THEN
        RAISE EXCEPTION 'Categoria non prevista dallo sportello';
      END IF;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.status <> 'new' THEN
      RAISE EXCEPTION 'Una nuova segnalazione deve avere stato new';
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' OR TG_TABLE_NAME = 'chat_messages' THEN
    IF char_length(btrim(NEW.content)) NOT BETWEEN 1 AND 2000 THEN
      RAISE EXCEPTION 'Messaggio non valido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reports_content ON public.reports;
CREATE TRIGGER trg_validate_reports_content
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

DROP TRIGGER IF EXISTS trg_validate_comments_content ON public.comments;
CREATE TRIGGER trg_validate_comments_content
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

DROP TRIGGER IF EXISTS trg_validate_chat_content ON public.chat_messages;
CREATE TRIGGER trg_validate_chat_content
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_content();

-- Evita che la Edge Function invii più volte la stessa notifica per lo stesso
-- evento già salvato (report, commento o messaggio chat).
CREATE TABLE IF NOT EXISTS public.notification_event_log (
  actor_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('new_report', 'chat_message', 'forum_comment')),
  event_id   UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_type, event_id)
);

ALTER TABLE public.notification_event_log ENABLE ROW LEVEL SECURITY;
-- Nessuna policy: solo service_role della Edge Function può scrivere.

NOTIFY pgrst, 'reload schema';
