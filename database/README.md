# Database — Script SQL

Questa cartella contiene tutti gli script SQL necessari per replicare il database Supabase di DilloQui.

## Ordine di esecuzione

Per ricostruire il database, esegui questi script nell'**SQL Editor** di Supabase seguendo la numerazione da 01 a 15:

| File | Scopo / Descrizione |
|------|---------------------|
| `01_schema_tabelle.sql` | Crea le tabelle principali (`boxes`, `profiles`, `reports`, `comments`, etc.) e la View per gli Admin in cui i dati sensibili sono oscurati. |
| `02_trigger_profilo.sql` | Configura il trigger che genera automaticamente un record in `profiles` quando un utente si registra su `auth.users`. |
| `03_policy_rls.sql` | Definisce le regole di Row Level Security (RLS) base per garantire che ogni utente possa leggere solo i propri dati o i dati pubblici del proprio sportello. |
| `04_policy_ban.sql` | Aggiunge una policy globale restrittiva che impedisce agli utenti con stato "bannato" di interagire con la piattaforma. |
| `05_sicurezza_base.sql` | Revoca l'accesso pubblico a colonne critiche e imposta le base per le RPC (Remote Procedure Call) sicure. |
| `06_autenticazione_rpc.sql` | Include logiche di whitelist privata e controlli backend per impedire alterazioni forzate dei ruoli utente. |
| `07_anonimato_owners.sql` | **Core Anonimato**: Implementa la tabella privata `report_owners` usata per tracciare la proprietà delle segnalazioni anonime lato server, scollegandole dall'identità pubblica. |
| `08_pannello_admin_sicurezza.sql` | Implementa le funzioni amministrative per bannare utenti e verificare gli sportelli, prevenendo privilege escalation. |
| `09_gestione_sportelli.sql` | Fornisce le RPC per il recupero dei dati completi degli sportelli, riservate agli admin autorizzati. |
| `10_privacy_gdpr.sql` | Fornisce procedure conformi al GDPR per la cancellazione dell'account, rimuovendo l'utente e dissociando i suoi dati storici in modo irreversibile. |
| `11_forum_paginazione.sql` | Script `SECURITY DEFINER` per impaginare e distribuire in modo sicuro i commenti pubblici del forum senza esporre id sensibili. |
| `12_notifiche_inapp.sql` | Crea la tabella `notifications` e ne definisce le logiche di RLS per il centro notifiche degli studenti. |
| `13_notifiche_push.sql` | Configura la tabella e le funzioni di supporto per le Edge Function che inviano notifiche Push al client. |
| `14_regolamento_box.sql` | Estensione dello schema per supportare il regolamento formale che gli studenti devono accettare per il loro sportello. |
| `15_anonimato_rpc.sql` | **Core Anonimato**: Funzioni JWT/RPC autenticate che permettono agli autori anonimi di chattare e gestire le loro segnalazioni senza mai trasmettere al client token insicuri. |

## Note di Sicurezza (Privacy by Design)

- L'architettura non espone **MAI** le chiavi o i dati sensibili.
- Il database opera con un sistema a **doppio binario**: 
  - La tabella `reports` visibile alla piattaforma (e agli admin) è sprovvista del collegamento all'autore.
  - La tabella privata `report_owners`, invisibile agli admin e accessibile solo tramite funzioni `SECURITY DEFINER`, permette al backend di recapitare messaggi privati e notifiche all'autore corretto.
- Nessuna chiave API è hardcoded negli script, assicurando la sicurezza durante i deploy o la distribuzione open-source.
