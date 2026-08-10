# Security notes (DilloQui)

## Secrets: mai in `VITE_*`
Qualsiasi variabile `VITE_*` finisce nel bundle frontend. Chiavi SMTP / Resend, service role, VAPID private key, ecc. appartengono solo a **Supabase secrets** (Auth SMTP, Edge Function secrets, Dashboard) — mai a `.env.local` con prefisso `VITE_`.

## ⚠️ Chiave Resend — azione richiesta
La chiave `VITE_RESEND_API_KEY` è stata rimossa da `.env.local` (era esposta nel bundle JS).
**Configura la chiave Resend in uno di questi posti:**

**Opzione A — Supabase Auth SMTP (raccomandato):**
```
Dashboard Supabase → Authentication → SMTP Settings
Provider: Resend
API Key: re_xxxxx (la tua chiave)
```

**Opzione B — Edge Function secret:**
```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
```
Poi leggi nell'Edge Function con `Deno.env.get('RESEND_API_KEY')`.

**Rotazione della chiave compromessa:**
- Accedi a https://resend.com → API Keys → Revoca la chiave che era in `.env.local`
- Crea una nuova chiave e configurala come descritto sopra

## Patch SQL (ordine)
1. `supabase_schema.sql`
2. `supabase_trigger_profile.sql`
3. `supabase_rls_policies.sql`
4. `supabase_fixes.sql`
5. `supabase_regolamento.sql`
6. `supabase_ban_policy.sql` — ruolo `banned` nel CHECK + policy admin UPDATE profiles
7. `supabase_notifications.sql` — tabella `notifications` + realtime (richiesto da send-push)
8. `supabase_push_notifications.sql` (se usi le push)
9. `supabase_security_p0.sql` — anon_token nascosto, handle_new_user, become_admin_and_link_box
10. `supabase_security_p1.sql` — boxes_public / check_email_allowed, author UPDATE ristretto, revoke get_anon_reports, (redeploy send-push)
11. `supabase_security_p2.sql` — trigger `claim_report_owner` AFTER INSERT su `reports` → `report_owners` (auth.uid()); client upsert resta fallback
12. `supabase_security_p3.sql` — ban effettivo lato DB, anti-escalation admin, sportelli verificati, whitelist email server-side
13. `supabase_p4_gestione_sportelli.sql` — sospensione ed eliminazione degli sportelli, scheda di dettaglio nel pannello
14. `supabase_p5_privacy.sql` — eliminazione dell'account funzionante e cancellazione dei dati vecchi
15. `supabase_p6_forum_paginazione.sql` — tetto di 50 post al forum (con «carica altri»)
16. `supabase_security_p7.sql` — whitelist legata ad Auth, validazione input e dedup delle push

**Non rieseguire `supabase_fixes.sql` o `supabase_rls_policies.sql` su un database già patchato:** ripristinerebbero versioni permissive di policy e RPC che P1/P3 hanno ristretto. Le patch P0–P6 sono invece idempotenti. P4 va sempre **dopo** P3, perché riscrive le stesse policy aggiungendoci il controllo sulla sospensione: eseguire P3 dopo P4 lo toglierebbe.

## P3 — cosa cambia
- **Ban effettivo:** helper `is_active_user()` nelle policy INSERT di `reports`, `comments`, `votes`, `chat_messages` e nelle RPC anonime. Prima il ban era solo nella UI: chi veniva bloccato poteva continuare a scrivere via API.
- **Anti-escalation:** la policy admin su `profiles` ha un `WITH CHECK` che limita i ruoli assegnabili a `student` / `banned`. Prima un admin poteva promuovere ad admin un compagno.
- **Commenti e voti** vincolati a una segnalazione pubblica del proprio box (prima bastava conoscere un UUID).
- **Whitelist email** applicata in `handle_new_user` e nelle policy INSERT/UPDATE di `profiles`, non più solo in `Verify.jsx`.
- **Sportelli verificati:** vedi sotto.

## Sportelli verificati
Chiunque può aprire uno sportello, ma nasce **non verificato** e gli studenti lo vedono dichiarato: nella pagina di accesso prima di iscriversi, e come banner persistente mentre lo usano. Così una box aperta da uno sconosciuto non può spacciarsi per ufficiale, senza che nessuno debba approvare a mano ogni richiesta.

Gli sportelli aperti con un indirizzo **`@nomescuola.edu.it` si verificano da soli**: quel dominio è assegnato dal Registro .it soltanto a scuole statali e paritarie, previa verifica del codice meccanografico dell'istituto ([regolamento](https://www.nic.it/it/domini-edu-it)). Nel caso più comune la coda di approvazione resta vuota.

Lo stato di verifica lo decide solo il database: il trigger `protect_box_verification` lo calcola in INSERT e lo congela in UPDATE, quindi un admin non può verificarsi da solo nemmeno chiamando l'API direttamente. Passano soltanto le operazioni senza sessione (SQL Editor, `service_role`) e i gestori della piattaforma.

Le box già esistenti al momento della patch restano verificate: sono precedenti a questa regola.

## Pannello di gestione (`/admin/piattaforma`)
Gli sportelli si gestiscono dall'app, non dal SQL Editor. La pagina li elenca con referente, data di apertura, studenti, segnalazioni e da quanto non succede niente; cliccando una riga si apre la scheda, con le statistiche e i tre comandi: verifica, sospensione, eliminazione.

Per arrivarci servono **due cose distinte**: essere in `platform_admins`, e sbloccare con una password dedicata diversa da quella di login. Il secondo passaggio esiste perché la prima condizione da sola cadrebbe insieme alla sessione admin: chi ruba un token entra come te ovunque, ma non negli sportelli.

Configurazione, un comando solo dal SQL Editor — nomina il gestore e imposta la password:
```sql
SELECT public.set_platform_password(
  'tua.email@esempio.it',
  'una-password-lunga-e-diversa-da-quella-di-login'
);
```
Lo stesso comando cambia la password in seguito, chiudendo gli sblocchi in corso. Minimo 12 caratteri, hash bcrypt (`gen_salt('bf', 12)`): in chiaro non viene salvata da nessuna parte. L'account deve già essere admin di uno sportello, perché `/admin/*` resta protetto da `isRealAdminAuthenticated`.

Come è chiuso, dal più esterno al più interno:
- **La rotta non esiste** per chi non è gestore: `App.jsx` la registra solo se il server ha già risposto di sì, altrimenti l'URL cade nel fallback e torna alla home.
- **Il codice del pannello non viene richiesto** finché la password non è accettata: `PlatformGate` importa `PlatformBoxes` solo a sblocco avvenuto, quindi sono due chunk separati.
- **Lo sblocco vive nel database** (`platform_sessions`, RLS senza policy), non in localStorage: il client non può fingerlo. Dura 30 minuti, poi le RPC ricominciano a rispondere `Permesso negato` e la pagina richiede la password.
- **Le RPC controllano da sole**: `list_boxes_overview`, `get_box_detail`, `set_box_verified`, `set_box_suspended` e `delete_box` pretendono tutte `is_platform_admin() AND has_platform_session()`. È qui che sta la sicurezza vera — i livelli sopra sono comodità e riduzione della superficie.
- **Cinque tentativi sbagliati** bloccano per 15 minuti (`failed_attempts` / `locked_until`). `platform_unlock` non solleva eccezioni sui fallimenti: un `RAISE` annullerebbe la transazione e con essa il contatore, rendendo il blocco inutile.

Quello che questo schema **non** fa: i file JS restano scaricabili da chi legge il bundle e ricostruisce l'URL del chunk, perché il sito è statico. Dentro non c'è nulla di sensibile — un form e una tabella vuota — e ogni dato passa dai controlli del database. Per rendere i file stessi irraggiungibili servirebbe servirli dietro autenticazione, cioè un server applicativo davanti allo static hosting.

Restano validi anche i comandi diretti, utili se il pannello non è raggiungibile:
```sql
UPDATE public.boxes
SET verified = TRUE, verified_at = NOW(),
    verified_note = 'Confermato via telefono con la segreteria'
WHERE slug = 'nome-sportello';
```

## Sospendere o eliminare uno sportello
Sono due cose diverse e vale la pena tenerle separate.

**Sospendere** ferma le scritture e basta: niente nuove segnalazioni, commenti, voti o messaggi in chat, ma gli studenti continuano a rileggere quello che hanno già scritto e riattivando torna tutto com'era. Serve per uno sportello che sta funzionando male, o su cui hai un dubbio che non hai ancora chiarito. Il blocco vive nelle policy INSERT, non nella UI: chi chiama l'API direttamente trova la stessa porta chiusa. Come per `verified`, il flag è congelato dal trigger, quindi l'admin della scuola non se lo toglie da solo dalle impostazioni.

**Eliminare** cancella lo sportello, le sue segnalazioni e le chat, in CASCADE. Non c'è un annulla e non c'è un backup: `delete_box` pretende che il secondo argomento ripeta lo slug, e il pannello lo fa riscrivere a mano. Gli account restano, ma l'admin torna `student` — un ruolo con privilegi su un oggetto che non esiste più è solo un rischio in giro. Ha senso per uno sportello finto o aperto per sbaglio; se il dubbio riguarda dei dati veri, sospendi.

Lo stato è pubblico come `verified`: `boxes_public` lo espone anche a chi non ha fatto login, così la pagina di accesso può dirlo prima che qualcuno si registri. A uno studente che arriva su uno sportello sospeso mostriamo i numeri di emergenza (114 e 1522), perché il motivo per cui era lì non sparisce insieme allo sportello.

## Che cosa mostra la scheda
`get_box_detail` restituisce un solo JSON: configurazione (categorie, filtro email e quante voci ha la whitelist, regolamento compilato o no), referenti con la data di ingresso, e l'attività — studenti registrati, quanti hanno scritto almeno una volta, segnalazioni divise per stato, quante negli ultimi 7 giorni, commenti, ultima attività.

Il conteggio di chi ha scritto passa da `report_owners`, che arriva con le push: se non le hai applicate quel campo resta vuoto invece di far fallire la chiamata. La riga "quante voci ha la whitelist" è quella da guardare per prima su uno sportello sospetto: se è a zero il filtro email non filtra niente e si iscrive chiunque.

## Cancellazione dei dati (P5)
Il pulsante «Elimina account» esisteva da tempo e **falliva ogni volta**: il client provava a scrivere `role = 'deleted'` sul proprio profilo, ma quel valore non è fra quelli ammessi dal CHECK e la policy vieta comunque di cambiarsi il ruolo da soli. L'utente leggeva «Impossibile eliminare l'account» senza sapere perché, e i dati restavano dov'erano.

Ora passa da `delete_my_account()`, che elimina davvero la riga in `auth.users` — profilo, commenti, voti, iscrizioni alle push e collegamenti in `report_owners` se ne vanno in CASCADE. Le segnalazioni invece **restano**, convertite in anonime con un token nuovo: è quello che la schermata di conferma promette da sempre, e serve a non svuotare le discussioni a cui hanno partecipato altri studenti. Non si possono semplicemente lasciare con `author_id` a NULL: il vincolo `chk_author_xor_token` pretende l'autore oppure il token, e senza uno dei due la cancellazione fallirebbe.

La conservazione a 24 mesi è in `apply_retention(simulazione, mesi)`. Cancella gli account fermi da più di N mesi (`last_sign_in_at`, o la data di creazione per chi non ha mai completato l'accesso) e le loro segnalazioni, comprese le anonime, che `report_owners` rende comunque riconducibili. I gestori della piattaforma sono esclusi per non farsi fuori da soli. Rifiuta soglie sotto i 6 mesi e scrive sempre una riga in `retention_log`: una cancellazione automatica senza traccia è indistinguibile da una perdita di dati.

**Non parte da sola.** Lo script installa la funzione e mostra una simulazione; la pianificazione è un passo separato, da fare dopo aver letto i numeri:

```sql
SELECT public.apply_retention(TRUE, 24);   -- prova: non cancella niente

CREATE EXTENSION IF NOT EXISTS pg_cron;    -- da abilitare in Database → Extensions
SELECT cron.schedule('dilloqui-retention', '0 3 1 * *',
  $$SELECT public.apply_retention(FALSE, 24)$$);
```

## Trasferire uno sportello
Se qualcuno della scuola apre lo sportello prima del rappresentante legittimo, `transfer_box_admin` sposta il ruolo. Il nuovo admin deve essersi già registrato almeno una volta. La funzione è revocata a `anon` e `authenticated`: si esegue solo dal SQL Editor.

```sql
SELECT public.transfer_box_admin('liceo-rossi', 'nuovo.rappresentante@liceorossi.edu.it');
```

Il vecchio admin torna `student`. Per aggiungere un secondo admin senza rimuovere il primo:
```sql
SELECT public.transfer_box_admin('liceo-rossi', 'altro@liceorossi.edu.it', FALSE);
```

## Verifica delle patch P3 e P4
`supabase_security_p3_test.sql` è un autotest: si seleziona tutto, si preme Run una volta sola e restituisce una tabella con l'esito di dodici controlli (ban, escalation admin, moderazione ancora funzionante, voto su segnalazione privata, auto-verifica dello sportello, trasferimento non esposto, pannello chiuso agli admin normali, sblocco obbligatorio per il gestore, whitelist, flag leggibile prima del login, sospensione che blocca le scritture, admin che non si riattiva da solo). Gli ultimi due riguardano P4 e risultano `SALTATO` se non l'hai ancora applicata.

I dati di prova se li trova da solo, e sceglie di proposito uno sportello il cui admin **non** sia anche gestore della piattaforma: per il gestore il trigger lascia passare verifica e sospensione, quindi usarlo come cavia farebbe risultare `FALLITO` un permesso che invece è voluto. Se nel database esiste un solo sportello utilizzabile e il suo admin è il gestore, i controlli 5 e 12 rispondono `SALTATO` spiegando il motivo. Per chi è gestore:

```sql
SELECT p.email FROM public.platform_admins pa
JOIN public.profiles p ON p.id = pa.user_id;
```

Trova da solo i dati di prova — il primo sportello che abbia sia un admin sia uno studente — quindi non c'è niente da sostituire. Ogni scrittura sta dentro un blocco che termina con un'eccezione sentinella, quindi viene annullata: sul database non resta nulla.

Gli esiti sono `PASSATO`, `FALLITO`, `DA VERIFICARE` (bloccato ma per un motivo diverso da quello atteso, il dettaglio spiega quale) e `SALTATO` (mancano i dati, per esempio il gestore non è ancora configurato). Solo `FALLITO` è un problema da risolvere prima del lancio.

Va eseguito come `postgres` dal SQL Editor: cambia ruolo durante l'esecuzione per simulare studente, admin e visitatore, e per questo è revocato ad `anon` e `authenticated`. A fine verifica conviene rimuoverlo con `DROP FUNCTION public.p3_selftest();`.

## Status segnalazioni (CHECK)
Frontend e DB effettivo: `new` | `in_review` | `resolved` | `closed`.
- **Fresh install:** `supabase_schema.sql` usa già questo CHECK.
- **DB legacy** creati con `in_progress` / `rejected`: migrati da `supabase_fixes.sql` (UPDATE + DROP/ADD constraint). Non rieseguire il CHECK vecchio.

## Anonimato: cosa promettiamo davvero
`report_owners` collega ogni segnalazione — anche anonima — allo studente che l'ha inviata. Serve alle push e al recupero delle segnalazioni anonime da un altro dispositivo. Gli admin non possono leggerla (RLS), ma `service_role` e chi ha accesso al database sì.

Quindi: **anonimato verso la scuola, non verso l'infrastruttura.** La sezione 2 della Privacy Policy lo dichiara esplicitamente. Se in futuro si vuole un anonimato forte, va rimosso il collegamento e vanno ripensate le notifiche sulle segnalazioni anonime.

## send-push Edge Function — Auth P1 implementata
La function verifica JWT + ownership del chiamante tramite `authorizeCaller()`:
- Admin del box: passa
- Owner/autore della segnalazione (via `report_owners` o `author_id`): passa
- Membro del box per `new_report` / `forum_comment`: passa
- Tutti gli altri: 403 Forbidden
