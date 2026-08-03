-- ============================================================
-- DILLO QUI — Autotest della patch P3
-- Da eseguire nel SQL Editor DOPO supabase_security_p3.sql.
--
-- Seleziona tutto il file e premi Run: restituisce una tabella con
-- l'esito di ogni controllo. Non c'è niente da sostituire — i dati di
-- prova li trova da solo — e non lascia modifiche sul database: ogni
-- scrittura avviene dentro un blocco che viene annullato subito dopo.
--
-- Come leggere gli esiti:
--   PASSATO       la protezione funziona
--   FALLITO       la protezione NON funziona: da sistemare prima del lancio
--   DA VERIFICARE l'operazione è stata bloccata, ma per un motivo diverso
--                 da quello atteso: leggi il dettaglio
--   SALTATO       mancano i dati per eseguire quel controllo
--
-- Va eseguito come postgres (il ruolo predefinito del SQL Editor):
-- per mettere alla prova le policy impersona a turno studente, admin e
-- visitatore, cambiando il ruolo e i claim del JWT.
-- ============================================================

CREATE OR REPLACE FUNCTION public.p3_selftest()
RETURNS TABLE (n INT, test TEXT, esito TEXT, dettaglio TEXT)
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_box      TEXT;
  v_admin    UUID;
  v_student  UUID;
  v_platform UUID;
  v_report   UUID;
  v_email    TEXT;
  v_esito    TEXT;
  v_dett     TEXT;
  v_role     TEXT;
  v_verified BOOLEAN;
  v_estraneo BOOLEAN;
  v_interno  BOOLEAN;
  v_gestore  BOOLEAN;
BEGIN
  -- Uno sportello che abbia sia un admin sia uno studente: senza
  -- entrambi metà dei controlli non sarebbe eseguibile.
  -- A parità di condizioni si preferisce uno sportello il cui admin NON
  -- sia anche gestore della piattaforma: per il gestore il trigger lascia
  -- passare la verifica per progetto, e i controlli 5 e 12 leggerebbero
  -- quel permesso legittimo come un buco.
  SELECT b.slug, a.id, s.id
    INTO v_box, v_admin, v_student
  FROM public.boxes b
  JOIN public.profiles a ON a.box_slug = b.slug AND a.role = 'admin'
  JOIN public.profiles s ON s.box_slug = b.slug AND s.role = 'student'
  ORDER BY
    EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = a.id),
    b.created_at
  LIMIT 1;

  IF v_box IS NULL THEN
    n := 0; test := 'Dati di prova'; esito := 'SALTATO';
    dettaglio := 'Serve almeno uno sportello con un admin e uno studente registrati.';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = v_student;
  SELECT pa.user_id INTO v_platform FROM public.platform_admins pa LIMIT 1;
  SELECT EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = v_admin)
    INTO v_gestore;

  n := 0; test := 'Dati di prova'; esito := 'OK';
  dettaglio := format('sportello=%s / admin=%s / studente=%s%s', v_box, v_admin, v_email,
    CASE WHEN v_gestore THEN ' — attenzione: questo admin è anche gestore della piattaforma' ELSE '' END);
  RETURN NEXT;


  -- ----------------------------------------------------------
  -- 1. Un utente bannato non può pubblicare
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    UPDATE public.profiles SET role = 'banned' WHERE id = v_student;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_student, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      INSERT INTO public.reports (box_slug, author_id, type, title, content)
      VALUES (v_box, v_student, 'selftest', 'selftest', 'selftest');
      v_esito := 'FALLITO';
      v_dett  := 'Un utente bannato è riuscito a pubblicare una segnalazione';
    EXCEPTION
      WHEN insufficient_privilege THEN
        v_esito := 'PASSATO'; v_dett := 'RLS ha rifiutato l inserimento';
      WHEN OTHERS THEN
        v_esito := 'DA VERIFICARE'; v_dett := 'Bloccato per altro motivo: ' || SQLERRM;
    END;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION
    WHEN check_violation THEN
      v_esito := 'SALTATO';
      v_dett  := 'Il ruolo banned non è ammesso dal CHECK: manca supabase_ban_policy.sql';
    WHEN OTHERS THEN
      IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 1; test := 'Utente bannato non pubblica';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 2. Un admin non può promuovere ad admin
  -- Conta lo stato finale, non l'errore: se la USING della policy non
  -- combacia l'UPDATE tocca zero righe senza sollevare niente.
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      UPDATE public.profiles SET role = 'admin' WHERE id = v_student;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM set_config('role', 'none', TRUE);
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_student;

    IF v_role = 'admin' THEN
      v_esito := 'FALLITO'; v_dett := 'Un admin ha promosso uno studente ad admin';
    ELSE
      v_esito := 'PASSATO'; v_dett := format('Lo studente è rimasto %s', v_role);
    END IF;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 2; test := 'Admin non promuove ad admin';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 3. Ma l'admin deve poter ancora bannare
  -- Il contrario del test 2: serve a scoprire se la stretta di P3 ha
  -- rotto la moderazione invece di limitarla.
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      UPDATE public.profiles SET role = 'banned' WHERE id = v_student;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM set_config('role', 'none', TRUE);
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_student;

    IF v_role = 'banned' THEN
      v_esito := 'PASSATO'; v_dett := 'Il ban è andato a buon fine';
    ELSE
      v_esito := 'FALLITO'; v_dett := 'L admin non riesce più a bannare: moderazione rotta';
    END IF;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 3; test := 'Admin banna ancora';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 4. Non si vota una segnalazione non pubblica
  -- Prima bastava conoscerne l'UUID.
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('request.jwt.claims', '', TRUE);
    INSERT INTO public.reports (box_slug, author_id, type, title, content, is_public)
    VALUES (v_box, v_student, 'selftest', 'selftest', 'selftest', FALSE)
    RETURNING id INTO v_report;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_student, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      INSERT INTO public.votes (user_id, report_id) VALUES (v_student, v_report);
      v_esito := 'FALLITO';
      v_dett  := 'Voto accettato su una segnalazione non pubblica';
    EXCEPTION
      WHEN insufficient_privilege THEN
        v_esito := 'PASSATO'; v_dett := 'RLS ha rifiutato il voto';
      WHEN OTHERS THEN
        v_esito := 'DA VERIFICARE'; v_dett := 'Bloccato per altro motivo: ' || SQLERRM;
    END;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 4; test := 'Voto solo su segnalazioni pubbliche';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 5. Un admin non verifica da solo il proprio sportello
  -- Il trigger non solleva: ignora la modifica in silenzio.
  -- ----------------------------------------------------------
  IF v_gestore THEN
    v_esito := 'SALTATO';
    v_dett  := 'L unico admin utilizzabile è anche gestore della piattaforma: '
            || 'per lui il trigger lascia passare la verifica, come previsto. '
            || 'Serve uno sportello con un admin diverso per provare davvero.';
  ELSE
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('request.jwt.claims', '', TRUE);
    UPDATE public.boxes SET verified = FALSE WHERE slug = v_box;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      UPDATE public.boxes SET verified = TRUE WHERE slug = v_box;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM set_config('role', 'none', TRUE);
    SELECT b.verified INTO v_verified FROM public.boxes b WHERE b.slug = v_box;

    IF v_verified THEN
      v_esito := 'FALLITO'; v_dett := 'Un admin ha verificato il proprio sportello';
    ELSE
      v_esito := 'PASSATO'; v_dett := 'Il flag è rimasto a false';
    END IF;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  END IF;
  n := 5; test := 'Admin non si autoverifica';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 6. Il trasferimento sportello non è richiamabile dal client
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      PERFORM public.transfer_box_admin(v_box, 'selftest-nessuno@example.com');
      v_esito := 'FALLITO'; v_dett := 'Un admin può richiamare transfer_box_admin';
    EXCEPTION
      WHEN insufficient_privilege THEN
        v_esito := 'PASSATO'; v_dett := 'Permesso di esecuzione negato';
      WHEN OTHERS THEN
        v_esito := 'DA VERIFICARE'; v_dett := SQLERRM;
    END;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 6; test := 'Trasferimento non esposto al client';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 7. Il pannello piattaforma è chiuso a un admin qualsiasi
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);

    BEGIN
      PERFORM 1 FROM public.list_boxes_overview();
      v_esito := 'FALLITO'; v_dett := 'Un admin qualsiasi vede tutti gli sportelli';
    EXCEPTION
      WHEN raise_exception THEN
        v_esito := 'PASSATO'; v_dett := SQLERRM;
      WHEN insufficient_privilege THEN
        v_esito := 'PASSATO'; v_dett := 'Permesso di esecuzione negato';
      WHEN OTHERS THEN
        v_esito := 'DA VERIFICARE'; v_dett := SQLERRM;
    END;

    RAISE EXCEPTION 'p3_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 7; test := 'Pannello chiuso agli admin normali';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 8. Nemmeno il gestore entra senza sbloccare
  -- È il controllo che rende utile la seconda password: una sessione
  -- admin rubata non basta per toccare gli sportelli.
  -- ----------------------------------------------------------
  IF v_platform IS NULL THEN
    v_esito := 'SALTATO';
    v_dett  := 'Nessun gestore configurato: esegui prima set_platform_password';
  ELSE
    v_esito := 'ERRORE'; v_dett := 'non eseguito';
    BEGIN
      PERFORM set_config('request.jwt.claims', '', TRUE);
      DELETE FROM public.platform_sessions WHERE user_id = v_platform;

      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', v_platform, 'role', 'authenticated')::text, TRUE);
      PERFORM set_config('role', 'authenticated', TRUE);

      BEGIN
        PERFORM 1 FROM public.list_boxes_overview();
        v_esito := 'FALLITO'; v_dett := 'Il pannello si apre senza la seconda password';
      EXCEPTION
        WHEN raise_exception THEN
          v_esito := 'PASSATO'; v_dett := SQLERRM;
        WHEN OTHERS THEN
          v_esito := 'DA VERIFICARE'; v_dett := SQLERRM;
      END;

      RAISE EXCEPTION 'p3_rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
    END;
    PERFORM set_config('role', 'none', TRUE);
  END IF;
  n := 8; test := 'Gestore bloccato senza sblocco';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 9. Whitelist email lato server
  -- ----------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '', TRUE);
  v_estraneo := public.check_email_allowed(v_box, 'selftest-estraneo-9f2@example.com');
  v_interno  := public.check_email_allowed(v_box, v_email);

  IF v_estraneo AND v_interno THEN
    v_esito := 'DA VERIFICARE';
    v_dett  := 'Il filtro email è disattivo su questo sportello: entra chiunque';
  ELSIF NOT v_estraneo AND v_interno THEN
    v_esito := 'PASSATO';
    v_dett  := 'Estranei rifiutati, studenti della scuola ammessi';
  ELSE
    v_esito := 'FALLITO';
    v_dett  := format('Esito incoerente: estraneo=%s interno=%s', v_estraneo, v_interno);
  END IF;
  n := 9; test := 'Whitelist email applicata';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 10. Il flag di verifica è leggibile prima del login
  -- Serve alla pagina di accesso per avvisare lo studente.
  -- ----------------------------------------------------------
  v_esito := 'ERRORE'; v_dett := 'non eseguito';
  BEGIN
    PERFORM set_config('role', 'anon', TRUE);
    SELECT bp.verified INTO v_verified FROM public.boxes_public bp WHERE bp.slug = v_box;
    PERFORM set_config('role', 'none', TRUE);

    IF v_verified IS NULL THEN
      v_esito := 'FALLITO'; v_dett := 'Un visitatore non loggato non legge lo stato di verifica';
    ELSE
      v_esito := 'PASSATO'; v_dett := format('Letto senza login: verified=%s', v_verified);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_esito := 'ERRORE'; v_dett := SQLERRM;
  END;
  PERFORM set_config('role', 'none', TRUE);
  n := 10; test := 'Stato verifica visibile agli ospiti';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 11. Uno sportello sospeso non accetta scritture (patch P4)
  -- ----------------------------------------------------------
  IF to_regprocedure('public.is_box_open(text)') IS NULL THEN
    v_esito := 'SALTATO';
    v_dett  := 'Manca supabase_p4_gestione_sportelli.sql';
  ELSE
    v_esito := 'ERRORE'; v_dett := 'non eseguito';
    BEGIN
      UPDATE public.boxes SET suspended = TRUE WHERE slug = v_box;

      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', v_student, 'role', 'authenticated')::text, TRUE);
      PERFORM set_config('role', 'authenticated', TRUE);

      BEGIN
        INSERT INTO public.reports (box_slug, author_id, type, title, content)
        VALUES (v_box, v_student, 'selftest', 'selftest', 'selftest');
        v_esito := 'FALLITO';
        v_dett  := 'Segnalazione inserita in uno sportello sospeso';
      EXCEPTION
        WHEN insufficient_privilege THEN
          v_esito := 'PASSATO'; v_dett := 'RLS ha rifiutato l inserimento';
        WHEN OTHERS THEN
          v_esito := 'DA VERIFICARE'; v_dett := 'Bloccato per altro motivo: ' || SQLERRM;
      END;

      RAISE EXCEPTION 'p3_rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
    END;
    PERFORM set_config('role', 'none', TRUE);
  END IF;
  n := 11; test := 'Sportello sospeso blocca le scritture';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;


  -- ----------------------------------------------------------
  -- 12. L'admin non si toglie la sospensione da solo (patch P4)
  -- Come per verified, conta lo stato finale: il trigger riscrive il
  -- valore in silenzio invece di sollevare un errore.
  -- ----------------------------------------------------------
  IF to_regprocedure('public.is_box_open(text)') IS NULL THEN
    v_esito := 'SALTATO';
    v_dett  := 'Manca supabase_p4_gestione_sportelli.sql';
  ELSIF v_gestore THEN
    v_esito := 'SALTATO';
    v_dett  := 'L unico admin utilizzabile è anche gestore della piattaforma: '
            || 'per lui la riattivazione è consentita, come previsto.';
  ELSE
    v_esito := 'ERRORE'; v_dett := 'non eseguito';
    BEGIN
      UPDATE public.boxes SET suspended = TRUE WHERE slug = v_box;

      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
      PERFORM set_config('role', 'authenticated', TRUE);

      BEGIN
        UPDATE public.boxes SET suspended = FALSE WHERE slug = v_box;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      PERFORM set_config('role', 'none', TRUE);
      SELECT b.suspended INTO v_verified FROM public.boxes b WHERE b.slug = v_box;

      IF v_verified THEN
        v_esito := 'PASSATO'; v_dett := 'Il trigger ha rimesso la sospensione';
      ELSE
        v_esito := 'FALLITO'; v_dett := 'L admin si è riattivato lo sportello da solo';
      END IF;

      RAISE EXCEPTION 'p3_rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'p3_rollback' THEN v_esito := 'ERRORE'; v_dett := SQLERRM; END IF;
    END;
    PERFORM set_config('role', 'none', TRUE);
  END IF;
  n := 12; test := 'Admin non revoca la sospensione';
  esito := v_esito; dettaglio := v_dett; RETURN NEXT;

  -- Ripristino esplicito: durante i controlli abbiamo impersonato
  -- studente, admin e visitatore
  PERFORM set_config('role', 'none', TRUE);
  PERFORM set_config('request.jwt.claims', '', TRUE);

  RETURN;
END;
$fn$;

-- Non deve essere richiamabile dall'app: cambia ruolo durante l'esecuzione
REVOKE ALL ON FUNCTION public.p3_selftest() FROM PUBLIC, anon, authenticated;

SELECT * FROM public.p3_selftest() ORDER BY n;

-- Quando hai finito, per non lasciarla nel database:
--   DROP FUNCTION public.p3_selftest();
