# Database — Script SQL

Questa cartella contiene tutto il necessario per ricostruire da zero il database Supabase di DilloQui.

## Installazione

Un solo file: **`installazione.sql`**. Si copia nell'**SQL Editor** di Supabase e si esegue una volta sola. La console lo esegue in un'unica transazione, quindi o passa tutto o non viene applicato niente: non esiste uno stato intermedio da cui recuperare.

Poi, in quest'ordine:

1. `verifica_stato.sql` — conferma che l'installazione sia completa
2. registrati dall'applicazione: lo sportello `demo` esiste già, lo crea il seed
3. per accedere al pannello di piattaforma, dal SQL Editor:
   ```sql
   SELECT public.set_platform_password('tua@email', 'una-password-lunga-e-diversa');
   ```
   L'email deve essere quella di un profilo già registrato dall'app, e la password almeno 12 caratteri.

## Se perdi la password

Le due password del progetto si recuperano in modi diversi, perché sono cose diverse.

**Admin di uno sportello** (email e password, gestite da Supabase Auth). Si recupera dall'applicazione: nella pagina di accesso, sotto il campo della password, c'è «Password dimenticata?». Arriva un'email col link che riporta sulla stessa pagina, dove l'app chiede la nuova password. Perché funzioni, l'indirizzo dell'applicazione deve comparire fra i *Redirect URLs* nelle impostazioni di autenticazione del progetto Supabase. In alternativa, dalla dashboard: Authentication → Users → i tre puntini sull'utente → *Send password recovery*. Attenzione durante una dimostrazione dal vivo: il servizio email incluso nel piano gratuito consegna poche messaggi l'ora.

**Pannello di piattaforma** (password dedicata, separata da quella di accesso). Non esiste un recupero via email, ed è voluto: `set_platform_password` è revocata a tutti i ruoli client, quindi può girare soltanto da qui. Per rimetterla si esegue di nuovo lo stesso comando dell'installazione, con la password nuova. La chiamata azzera anche il contatore dei tentativi falliti, rimuove un eventuale blocco e chiude le sessioni di sblocco aperte, quindi chi era dentro viene disconnesso.

Caso diverso, ma facile da confondere: cinque tentativi sbagliati bloccano l'accesso al pannello per 15 minuti. Se la password la conosci, puoi aspettare oppure togliere il blocco:

```sql
UPDATE public.platform_admins SET failed_attempts = 0, locked_until = NULL
WHERE user_id = (SELECT id FROM public.profiles WHERE lower(email) = lower('tua@email'));
```

### Com'è organizzato `installazione.sql`

Il file è ordinato **per dipendenze**, non per cronologia: ogni oggetto compare dopo tutto ciò che gli serve e prima di tutto ciò che lo usa. Quella che si legge è quindi la forma definitiva di ogni tabella, policy e funzione, senza versioni intermedie.

| Sezione | Contenuto |
|---------|-----------|
| 0 | Prerequisiti (`pgcrypto`, per l'hash della password del pannello) |
| 1 | Le 13 tabelle, in ordine di chiave esterna |
| 2 | Indici, incluso quello parziale che regge la paginazione del forum |
| 3 | Attivazione della Row Level Security su ogni tabella |
| 4 | Funzioni di supporto: stanno **prima** delle policy perché PostgreSQL valida l'espressione di una policy nel momento in cui la crea |
| 5 | Le 28 policy, raggruppate per tabella |
| 6 | Permessi di colonna: `anon_token` non è leggibile da nessun client |
| 7 | Le viste `reports_admin_view` e `boxes_public` |
| 8 | Trigger: fanno il lavoro che una policy non sa fare, cioè confrontare il valore nuovo col vecchio |
| 9 | RPC di registrazione e gestione del profilo |
| 10 | RPC del forum |
| 11 | RPC delle segnalazioni anonime, autenticate dal JWT |
| 12 | RPC del pannello di piattaforma |
| 13 | RPC di privacy, conservazione dei dati e supporto alle notifiche |
| 14 | Realtime: `notifications` e `chat_messages` nella pubblicazione |
| 15 | Dati iniziali: lo sportello `demo` |
| 16 | Ricarica dello schema di PostgREST |

Fino alla versione beta 1.21 l'installazione era una sequenza di 15 script numerati, che riproduceva la storia delle migrazioni: alcuni creavano funzioni che altri, più avanti, eliminavano. Chi apriva un file a metà sequenza leggeva una versione superata, e il modello a token sembrava ancora in uso. La cronologia resta in git, dove è il suo posto.

## Due script di servizio

| File | Quando usarlo |
|------|---------------|
| `verifica_stato.sql` | **Sola lettura, non modifica niente.** Confronta il database con quello che l'applicazione si aspetta: RLS attiva su ogni tabella, le 19 RPC chiamate dal frontend presenti con la firma giusta, nessun residuo delle vecchie funzioni basate sul token, `security_invoker` corretto sulle viste, nessuna scrittura dal client su `report_owners`, trigger attivi, `search_path` fissato nelle `SECURITY DEFINER` e tabelle iscritte al Realtime. È **una query sola**, e restituisce una riga per controllo con i problemi in cima: se nella colonna `esito` non compare mai «DA SISTEMARE», il database è allineato. |
| `reset_completo.sql` | **Cancella tutto**: tabelle, viste, funzioni, policy e account utente, per tornare allo stato vuoto e poter rieseguire `installazione.sql`. Si rifiuta di partire finché non si modifica la variabile di conferma in testa al file. Cancella anche gli account perché il trigger `on_auth_user_created` riempie `profiles` solo alla registrazione: lasciarli produrrebbe utenti in grado di autenticarsi ma senza profilo, e per loro l'applicazione resta rotta. |

## Note di sicurezza (privacy by design)

- Nessuna chiave API è scritta negli script.
- L'anonimato funziona a **doppio binario**:
  - In `reports` una segnalazione anonima ha `author_id` a NULL. Il collegamento con l'autore non è oscurato a livello di interfaccia: non esiste nella riga.
  - La tabella privata `report_owners` conserva quel collegamento. Non ha policy di scrittura per il client — la popola solo il trigger `claim_report_owner`, che è `SECURITY DEFINER` — e in lettura concede a ciascuno esclusivamente la propria riga. Un admin non può interrogarla nemmeno volendo.
- L'autore anonimo si autentica con il proprio **JWT**, non con un segreto trasportato dal browser. Il modello precedente lo riconosceva da `anon_token` salvato nel `localStorage`: era un segreto lungo, ma restava una password al portatore, e cambiando dispositivo l'autore perdeva accesso alla propria segnalazione. La colonna sopravvive solo per soddisfare il vincolo `chk_author_xor_token` e non è leggibile da nessun client.
- `reports_admin_view` è dichiarata `security_invoker = true`: gira coi permessi di chi la interroga, quindi un admin vede soltanto lo sportello di cui è responsabile. Col comportamento predefinito la vista salterebbe la RLS e basterebbe cambiare un filtro nella chiamata all'API per leggere le segnalazioni di tutte le scuole.
- Il ban e la sospensione di uno sportello sono applicati dalle policy, non dall'interfaccia: valgono anche per chi chiama l'API direttamente.

## Se qualcosa non funziona

Le RPC vivono dietro PostgREST, che tiene in cache la lista delle funzioni. Se l'applicazione risponde «funzione non trovata» (`PGRST202`):

```sql
NOTIFY pgrst, 'reload schema';
```
