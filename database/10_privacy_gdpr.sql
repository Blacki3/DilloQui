-- ============================================================
-- DILLO QUI — Privacy GDPR: Cancellazione Dati
-- ============================================================
--
-- Due promesse della privacy policy che il database non manteneva:
--   1. «Elimina account» — il pulsante c'era e falliva ogni volta
--   2. «eliminati entro 24 mesi dall'ultimo accesso» — non succedeva
--
-- La pianificazione automatica è l'ULTIMO passo ed è separata apposta:
-- prima si guarda cosa verrebbe cancellato, poi si accende.
-- ============================================================


-- ============================================================
-- 1. ELIMINAZIONE DELL'ACCOUNT DA PARTE DELL'UTENTE
--
-- Perché non funzionava: il client provava a scrivere role='deleted'
-- sul proprio profilo, ma quel valore non è fra quelli ammessi dal
-- CHECK, e in più la policy vieta di cambiarsi il ruolo da soli.
-- Falliva quindi due volte, e l'utente vedeva «Impossibile eliminare
-- l'account» senza sapere perché.
--
-- Le segnalazioni non si possono staccare lasciando author_id a NULL:
-- il vincolo chk_author_xor_token pretende che ci sia l'autore OPPURE
-- il token. Vanno quindi convertite in anonime con un token nuovo, che
-- è anche l'unico modo di renderle davvero non riconducibili.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_report    INT := 0;
  v_commenti  INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  -- Le segnalazioni restano sul forum ma perdono l'autore, come
  -- promesso nella schermata di conferma
  UPDATE public.reports
  SET author_id    = NULL,
      anon_token   = gen_random_uuid(),
      is_anonymous = TRUE
  WHERE author_id = v_uid;
  GET DIAGNOSTICS v_report = ROW_COUNT;

  -- Senza questo il collegamento sopravviverebbe alla cancellazione
  IF to_regclass('public.report_owners') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.report_owners WHERE user_id = $1' USING v_uid;
  END IF;

  SELECT count(*) INTO v_commenti FROM public.comments WHERE author_id = v_uid;

  -- Porta via profilo, commenti, voti e sessioni in CASCADE
  DELETE FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object(
    'segnalazioni_rese_anonime', v_report,
    'commenti_eliminati', v_commenti
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- ============================================================
-- 2. CANCELLAZIONE AUTOMATICA DEI DATI VECCHI
--
-- Registro delle esecuzioni: senza una traccia, una cancellazione
-- automatica è indistinguibile da una perdita di dati.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.retention_log (
  id                     BIGSERIAL PRIMARY KEY,
  eseguito_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  simulazione            BOOLEAN NOT NULL,
  mesi                   INT NOT NULL,
  account_eliminati      INT NOT NULL DEFAULT 0,
  segnalazioni_eliminate INT NOT NULL DEFAULT 0
);

-- Nessuna policy: il registro non è affare del client
ALTER TABLE public.retention_log ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION public.apply_retention(
  p_simulazione BOOLEAN DEFAULT TRUE,
  p_mesi        INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_soglia   TIMESTAMPTZ;
  v_utenti   UUID[];
  v_reports  UUID[];
  v_extra    UUID[];
  v_n_utenti INT := 0;
  v_n_report INT := 0;
BEGIN
  -- Una soglia bassa per errore cancellerebbe dati ancora in uso, e
  -- non c'è un annulla: meglio rifiutare che eseguire
  IF p_mesi IS NULL OR p_mesi < 6 THEN
    RAISE EXCEPTION 'Soglia troppo bassa (% mesi): il minimo accettato è 6', p_mesi;
  END IF;

  v_soglia := NOW() - make_interval(months => p_mesi);

  -- last_sign_in_at è NULL per chi non ha mai completato l'accesso:
  -- in quel caso vale la data di creazione
  SELECT COALESCE(array_agg(u.id), ARRAY[]::UUID[])
    INTO v_utenti
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE COALESCE(u.last_sign_in_at, u.created_at) < v_soglia
    AND NOT EXISTS (
      SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = u.id
    );

  SELECT COALESCE(array_agg(r.id), ARRAY[]::UUID[])
    INTO v_reports
  FROM public.reports r
  WHERE r.author_id = ANY(v_utenti);

  -- Anche le anonime: il collegamento in report_owners le rende
  -- comunque riconducibili, quindi rientrano nella stessa promessa
  IF to_regclass('public.report_owners') IS NOT NULL THEN
    EXECUTE
      'SELECT COALESCE(array_agg(ro.report_id), ARRAY[]::UUID[])
         FROM public.report_owners ro WHERE ro.user_id = ANY($1)'
      INTO v_extra USING v_utenti;
    SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::UUID[])
      INTO v_reports
    FROM unnest(v_reports || v_extra) AS x;
  END IF;

  IF p_simulazione THEN
    v_n_utenti := COALESCE(array_length(v_utenti, 1), 0);
    v_n_report := COALESCE(array_length(v_reports, 1), 0);
  ELSE
    -- Prima le segnalazioni: cancellando l'utente per primo, il vincolo
    -- chk_author_xor_token farebbe fallire tutto
    DELETE FROM public.reports WHERE id = ANY(v_reports);
    GET DIAGNOSTICS v_n_report = ROW_COUNT;

    DELETE FROM auth.users WHERE id = ANY(v_utenti);
    GET DIAGNOSTICS v_n_utenti = ROW_COUNT;
  END IF;

  INSERT INTO public.retention_log
    (simulazione, mesi, account_eliminati, segnalazioni_eliminate)
  VALUES (p_simulazione, p_mesi, v_n_utenti, v_n_report);

  RETURN jsonb_build_object(
    'simulazione', p_simulazione,
    'soglia', v_soglia,
    'account', v_n_utenti,
    'segnalazioni', v_n_report
  );
END;
$$;

-- Non deve essere raggiungibile dall'app in nessun caso
REVOKE ALL ON FUNCTION public.apply_retention(BOOLEAN, INT) FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 3. PRIMA DI ACCENDERLA: guarda cosa toglierebbe
-- Esegui questa riga e leggi i numeri. Non cancella niente.
-- ============================================================

SELECT public.apply_retention(TRUE, 24) AS simulazione;


-- ============================================================
-- 4. PIANIFICAZIONE (da fare a mano, quando i numeri ti convincono)
--
-- Abilita pg_cron da Database → Extensions nella dashboard Supabase,
-- poi esegui queste due righe:
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--   SELECT cron.schedule(
--     'dilloqui-retention',
--     '0 3 1 * *',                                  -- 03:00 del primo del mese
--     $$SELECT public.apply_retention(FALSE, 24)$$
--   );
--
-- Per vedere cosa ha fatto:
--   SELECT * FROM public.retention_log ORDER BY eseguito_at DESC;
--
-- Per fermarla:
--   SELECT cron.unschedule('dilloqui-retention');
--
-- Finché non pianifichi niente, la funzione resta a disposizione ma
-- non parte da sola: puoi lanciarla a mano una volta all'anno con
--   SELECT public.apply_retention(FALSE, 24);
-- ============================================================

-- ============================================================
-- supabase_p6_forum_paginazione.sql
-- ============================================================

-- ============================================================
