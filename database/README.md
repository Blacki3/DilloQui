# Database — Script SQL

Questa cartella contiene tutti gli script SQL necessari per replicare il database Supabase di DilloQui.

## Ordine di esecuzione

Eseguire nel **SQL Editor** di Supabase nell'ordine indicato:

| # | File | Contenuto |
|---|------|-----------|
| 1 | `supabase_schema.sql` | Schema principale: tabelle `profiles`, `boxes`, `reports`, `votes`, `comments`, `chat_messages`, `notifications`, `report_owners` |
| 2 | `supabase_rls_policies.sql` | Row Level Security — chi può leggere/scrivere cosa |
| 3 | `supabase_trigger_profile.sql` | Trigger AFTER INSERT su `auth.users` per creare il profilo automaticamente |
| 4 | `supabase_ban_policy.sql` | Policy aggiuntiva che blocca gli utenti bannati |
| 5 | `supabase_security_p0.sql` | Revoca permessi pubblici di default, setup SECURITY DEFINER |
| 6 | `supabase_security_p1.sql` | RPC per registrazione studente e verifica email (whitelist) |
| 7 | `supabase_security_p2.sql` | Trigger `report_owners`: ownership anonima server-side |
| 8 | `supabase_security_p3.sql` | Pannello di piattaforma: seconda password, gestione sportelli, GDPR |
| 9 | `supabase_p4_gestione_sportelli.sql` | RPC admin: lista sportelli, verifica, sospensione, dettaglio |
| 10 | `supabase_p5_privacy.sql` | Cancellazione account (Diritto all'Oblio), anonimizzazione segnalazioni |
| 11 | `supabase_p6_forum_paginazione.sql` | RPC per forum paginato con autori (SECURITY DEFINER per bypassare RLS sui profili) |
| 12 | `supabase_notifications.sql` | Tabella `notifications` e policy |
| 13 | `supabase_push_notifications.sql` | Funzione helper per Edge Function `send-push` |
| 14 | `supabase_regolamento.sql` | Colonna `regolamento` sulla tabella `boxes` |
| 15 | `supabase_security_p7.sql` | RPC per segnalazioni anonime server-side (`get_my_anon_reports`, `get_anon_chat`, `send_anon_chat_message`, `update_anon_report_status`) |

## Note di sicurezza

- Nessuna chiave segreta è hardcoded negli script.
- Le policy RLS garantiscono che ogni utente veda solo i propri dati.
- Le funzioni `SECURITY DEFINER` sono usate esclusivamente dove strettamente necessario (join su profili altrui per forum e admin).
- La tabella `report_owners` disaccoppia l'identità dell'autore dalla segnalazione: un admin non può sapere chi ha inviato una segnalazione anonima.

Per i dettagli sulle scelte di sicurezza, vedere `SECURITY_NOTES.md`.
