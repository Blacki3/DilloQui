-- ============================================================
-- DILLO QUI — Verifica dello stato del database
-- ============================================================
-- Script di sola lettura: non modifica nulla.
--
-- È UNA SOLA QUERY, di proposito: l'editor SQL di Supabase mostra
-- soltanto il risultato dell'ultima istruzione, quindi una serie di
-- SELECT separate farebbe vedere un controllo su otto.
--
-- Restituisce una riga per ogni controllo, con i problemi in cima.
-- Se la colonna `esito` non contiene mai «DA SISTEMARE», il database
-- corrisponde a quello che `installazione.sql` produce e a quello che
-- l'applicazione si aspetta di trovare.
--
-- Da eseguire subito dopo l'installazione, e ogni volta che si sospetta
-- un disallineamento fra l'applicazione e il database su cui gira —
-- tipicamente dopo modifiche applicate a mano dalla dashboard.
-- ============================================================

WITH

-- ------------------------------------------------------------
-- Le RPC che src/services/db.js si aspetta di trovare
-- ------------------------------------------------------------
attese(nome) AS (
  VALUES
    ('am_i_platform_admin'),
    ('become_admin_and_link_box'),
    ('check_email_allowed'),
    ('delete_box'),
    ('delete_my_account'),
    ('get_anon_chat'),
    ('get_box_detail'),
    ('get_comments_with_authors'),
    ('get_my_anon_reports'),
    ('get_public_reports_with_authors'),
    ('list_boxes_overview'),
    ('platform_lock'),
    ('platform_session_status'),
    ('platform_unlock'),
    ('send_anon_chat_message'),
    ('set_box_suspended'),
    ('set_box_verified'),
    ('update_anon_report_status'),
    ('update_box_slug')
),

-- 1. RLS attiva? Senza di essa le policy esistono ma non si applicano,
--    e qualsiasi utente autenticato legge tutto.
c_rls AS (
  SELECT
    1 AS sezione,
    'RLS sulle tabelle' AS controllo,
    CASE WHEN c.relrowsecurity THEN 'ok' ELSE 'DA SISTEMARE' END AS esito,
    c.relname::text AS oggetto,
    CASE WHEN c.relrowsecurity
      THEN 'protetta, ' || count(p.polname) || ' policy'
      ELSE 'RLS DISATTIVA: le ' || count(p.polname) || ' policy non vengono applicate'
    END AS dettaglio
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
  GROUP BY c.relname, c.relrowsecurity
),

-- 2. Le RPC chiamate dal frontend esistono? Una funzione assente, o con
--    argomenti diversi, produce un PGRST202 a runtime.
c_rpc AS (
  SELECT
    2 AS sezione,
    'RPC usate dal frontend' AS controllo,
    CASE WHEN count(p.oid) = 0 THEN 'DA SISTEMARE' ELSE 'ok' END AS esito,
    a.nome::text AS oggetto,
    COALESCE(
      string_agg('(' || pg_get_function_arguments(p.oid) || ')', '  +  ' ORDER BY p.oid),
      'NON ESISTE: la chiamata fallisce con PGRST202'
    ) AS dettaglio
  FROM attese a
  LEFT JOIN pg_proc p
    ON p.proname = a.nome
   AND p.pronamespace = 'public'::regnamespace
  GROUP BY a.nome
),

-- 3. Residui del modello a token. Finché esistono, chi possiede un
--    anon_token può ancora impersonare l'autore anonimo.
c_token AS (
  SELECT
    3 AS sezione,
    'Residui del modello a token' AS controllo,
    'DA SISTEMARE'::text AS esito,
    p.proname::text AS oggetto,
    'da eliminare: (' || pg_get_function_arguments(p.oid) || ')' AS dettaglio
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND (
      p.proname = 'get_anon_reports'
      OR (p.proname IN ('get_anon_chat', 'send_anon_chat_message', 'update_anon_report_status')
          AND pg_get_function_arguments(p.oid) LIKE '%p_token%')
    )
),

-- 4. Le viste rispettano la RLS di chi le interroga? security_invoker
--    off va bene solo per boxes_public, che espone di proposito colonne
--    pubbliche. Su reports_admin_view deve essere on, altrimenti un
--    admin vede le segnalazioni di tutte le scuole.
c_viste AS (
  SELECT
    4 AS sezione,
    'security_invoker sulle viste' AS controllo,
    CASE
      WHEN c.relname = 'reports_admin_view' AND COALESCE(opt.valore, 'off') <> 'true'
        THEN 'DA SISTEMARE'
      ELSE 'ok'
    END AS esito,
    c.relname::text AS oggetto,
    CASE
      WHEN c.relname = 'reports_admin_view' AND COALESCE(opt.valore, 'off') <> 'true'
        THEN 'gira come proprietario e salta la RLS: un admin legge gli altri sportelli'
      WHEN COALESCE(opt.valore, 'off') = 'true'
        THEN 'security_invoker = true'
      ELSE 'security_invoker = off (voluto: espone solo colonne pubbliche)'
    END AS dettaglio
  FROM pg_class c
  LEFT JOIN LATERAL (
    SELECT option_value AS valore
    FROM pg_options_to_table(c.reloptions)
    WHERE option_name = 'security_invoker'
  ) opt ON TRUE
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'v'
),

-- 5. Chi può scrivere in report_owners? Se esiste una policy INSERT per
--    il client, uno studente si dichiara proprietario di una
--    segnalazione altrui e ne legge la chat anonima. La sola scrittura
--    ammessa è quella del trigger claim_report_owner.
c_owners AS (
  SELECT
    5 AS sezione,
    'Scrittura su report_owners' AS controllo,
    CASE WHEN p.polcmd IN ('a', '*') THEN 'DA SISTEMARE' ELSE 'ok' END AS esito,
    p.polname::text AS oggetto,
    CASE p.polcmd
      WHEN 'r' THEN 'SELECT — corretto'
      WHEN 'a' THEN 'INSERT DAL CLIENT: permette di rivendicare segnalazioni altrui'
      WHEN 'w' THEN 'UPDATE — da valutare'
      WHEN 'd' THEN 'DELETE — da valutare'
      ELSE 'ALL DAL CLIENT: permette di rivendicare segnalazioni altrui'
    END AS dettaglio
  FROM pg_policy p
  WHERE p.polrelid = to_regclass('public.report_owners')

  UNION ALL

  SELECT
    5, 'Scrittura su report_owners',
    CASE WHEN to_regclass('public.report_owners') IS NULL THEN 'DA SISTEMARE' ELSE 'ok' END,
    'report_owners (tabella)'::text,
    CASE WHEN to_regclass('public.report_owners') IS NULL
      THEN 'LA TABELLA NON ESISTE: le segnalazioni anonime non hanno proprietario'
      ELSE 'presente' END
),

-- 6. Il trigger che registra l'ownership è attivo?
--    tgenabled: O = abilitato (default), A = sempre, R = solo replica,
--    D = disabilitato.
c_trigger AS (
  SELECT
    6 AS sezione,
    'Trigger su reports' AS controllo,
    CASE WHEN t.tgenabled IN ('O', 'A') THEN 'ok' ELSE 'DA SISTEMARE' END AS esito,
    t.tgname::text AS oggetto,
    CASE t.tgenabled
      WHEN 'O' THEN 'abilitato'
      WHEN 'A' THEN 'abilitato sempre, anche in replica'
      WHEN 'R' THEN 'SCATTA SOLO IN REPLICA: inattivo nelle scritture normali'
      WHEN 'D' THEN 'DISABILITATO'
    END AS dettaglio
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.reports'::regclass
    AND NOT t.tgisinternal

  UNION ALL

  SELECT
    6, 'Trigger su reports',
    'DA SISTEMARE'::text, 'trg_claim_report_owner'::text,
    'ASSENTE: nessuno registra il proprietario delle segnalazioni anonime'
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.reports'::regclass AND tgname = 'trg_claim_report_owner'
  )
),

-- 7. Funzioni SECURITY DEFINER senza search_path fissato: un utente può
--    creare oggetti omonimi in uno schema che precede public e
--    dirottare la funzione.
c_searchpath AS (
  SELECT
    7 AS sezione,
    'search_path nelle SECURITY DEFINER' AS controllo,
    'DA SISTEMARE'::text AS esito,
    p.proname::text AS oggetto,
    'SECURITY DEFINER senza search_path: (' || pg_get_function_arguments(p.oid) || ')' AS dettaglio
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.prosecdef
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%'
    ))
),

-- 8. Il frontend si iscrive a postgres_changes su notifications e
--    chat_messages. Se una tabella non è nella pubblicazione,
--    l'iscrizione viene accettata senza errori e non arriva mai un
--    evento: il difetto si manifesta come «l'interfaccia non si
--    aggiorna», che è difficile da ricondurre al database.
c_realtime AS (
  SELECT
    8 AS sezione,
    'Realtime' AS controllo,
    (CASE WHEN pt.tablename IS NOT NULL THEN 'ok' ELSE 'DA SISTEMARE' END)::text AS esito,
    t.nome::text AS oggetto,
    CASE WHEN pt.tablename IS NOT NULL
      THEN 'iscritta a supabase_realtime'
      ELSE 'FUORI dalla pubblicazione supabase_realtime: ' || t.motivo
    END AS dettaglio
  FROM (VALUES
    ('notifications', 'il centro notifiche non si aggiorna da solo'),
    ('chat_messages', 'la chat non è bidirezionale in tempo reale, la risposta compare solo ricaricando')
  ) AS t(nome, motivo)
  LEFT JOIN pg_publication_tables pt
    ON pt.pubname    = 'supabase_realtime'
   AND pt.schemaname = 'public'
   AND pt.tablename  = t.nome
),

tutto AS (
  SELECT * FROM c_rls
  UNION ALL SELECT * FROM c_rpc
  UNION ALL SELECT * FROM c_token
  UNION ALL SELECT * FROM c_viste
  UNION ALL SELECT * FROM c_owners
  UNION ALL SELECT * FROM c_trigger
  UNION ALL SELECT * FROM c_searchpath
  UNION ALL SELECT * FROM c_realtime
)

SELECT
  esito,
  controllo,
  oggetto,
  dettaglio
FROM tutto
-- I problemi per primi: sono l'unica parte che richiede di agire
ORDER BY (esito = 'ok'), sezione, oggetto;
