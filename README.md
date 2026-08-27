<div align="center">
  <img src="public/logo.png" alt="DilloQui Logo" width="150"/>
  <h1>DilloQui</h1>
  <p><strong>Lo sportello di ascolto digitale, sicuro e anonimo per le scuole.</strong></p>
  <p><em>Progetto presentato per il <b>Premio Marilli 2026</b></em></p>
</div>

---

## 💡 Il Progetto

**DilloQui** è una piattaforma progettata per digitalizzare e rendere più sicuro ed efficiente lo sportello di ascolto scolastico. Permette agli studenti di mettersi in contatto con i rappresentanti degli studenti e gli amministratori dello sportello per inviare segnalazioni, idee o denunciare problemi garantendo, quando richiesto, il **totale anonimato**.

## 🛠 Tecnologie Utilizzate

DilloQui è una web application moderna (SPA) con un'architettura Serverless basata su BaaS.

*   **Frontend:** React 18, Vite 5, React Router
*   **Stile & Animazioni:** CSS Modulare "Brutalist", Framer Motion, Lucide React
*   **Backend & Database:** Supabase (PostgreSQL)
*   **Autenticazione:** Supabase Auth (JWT, Magic Link / OTP per gli studenti, Email+Password per gli admin)
*   **Serverless:** Supabase Edge Functions (Deno) per l'invio delle notifiche push
*   **PWA:** Supporto per Web Push Notifications e installazione locale

## 🛡 Sicurezza & Privacy by Design (Core Feature)

Il cuore del progetto è il nostro sistema di gestione dell'anonimato. 
A differenza dei sistemi tradizionali dove il backend conosce l'utente ma "finge" di non saperlo, DilloQui utilizza un **doppio binario di sicurezza a livello di Database (RLS)**:

1.  **Vista Admin (`reports_admin_view`)**: Gli amministratori interrogano una vista che oscura programmaticamente l'identità dell'autore per i post anonimi. Non c'è modo per un admin di risalire allo studente.
2.  **Tabella Privata (`report_owners`)**: Quando uno studente crea un report anonimo, un trigger del database (invisibile al client) registra la proprietà in una tabella accessibile solo da funzioni `SECURITY DEFINER`.
3.  **Comunicazione Bidirezionale**: Grazie a questo sistema, lo studente e l'admin possono **chattare in tempo reale** sulla segnalazione anonima. L'admin risponde al "Report #123" e il database sa a quale dispositivo inviare la notifica, senza mai rivelare il mittente all'admin.

## 📂 Struttura della Repository

La repository è divisa nelle seguenti directory principali:

*   **`/src/`** — Codice sorgente dell'applicazione React (Componenti, Pagine, Hook, Servizi).
*   **`/database/`** — Gli script SQL (numerati in ordine di esecuzione da 01 a 15) necessari per ricreare interamente la struttura del database PostgreSQL, incluse le policy RLS e i trigger. (Vedi il [README del database](database/README.md)).
*   **`/supabase/functions/`** — Codice backend (Edge Functions scritte in TypeScript/Deno) utilizzato ad esempio per l'invio sicuro delle Web Push Notifications.

## 🚀 Come avviare il progetto localmente

1. **Clona la repository**
   ```bash
   git clone https://github.com/Blacki3/DilloQui.git
   cd DilloQui
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   Copia il file di esempio e inserisci le chiavi del tuo progetto Supabase:
   ```bash
   cp .env.example .env.local
   ```
   *Apri `.env.local` e inserisci `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.*

4. **Avvia il server di sviluppo**
   ```bash
   npm run dev
   ```
   L'app sarà disponibile su `http://localhost:5173`.
