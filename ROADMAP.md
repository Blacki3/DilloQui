# 🚀 Dillo Qui - Roadmap e TODO List

Il prototipo UI è completo e presenta un design premium. Da qui in avanti, il lavoro si divide nella sostituzione dei dati fittizi (mock) con vere chiamate al server e l'ottimizzazione dell'esperienza utente.

## ⚙️ 1. BACKEND (Integrazione API e Database)
Attualmente i dati "vivono" solo nella RAM o sono cablati nel codice. Per renderlo reale bisogna connettere tutto a un servizio (es. **Firebase** o un backend custom Node/Express).

- [ ] **Configurazione Database (Firestore/PostgreSQL)**
  - Strutturare le tabelle/collezioni: `Schools` (scuole e slug), `Users` (studenti e admin), `Reports` (segnalazioni), `Comments` (forum).
- [ ] **Autenticazione OTP Reale**
  - Integrare un servizio mail (come **Resend** o SendGrid) in `services/api.js`.
  - Inviare una mail reale con il codice a 6 cifre e gestire l'espirazione del token (es. valido 5 minuti).
  - Verificare che l'email inserita appartenga alla "Whitelist" definita dalla scuola.
- [ ] **Persistenza Dati (CRUD)**
  - **Studenti:** Pubblicazione reali delle segnalazioni e caricamento storico filtrato.
  - **Admin:** Lettura dello stream di segnalazioni in arrivo e modifica degli stati (Risolta/Chiusa).
  - Implementare la validazione sicura (lo studente A non può leggere le chat private dello studente B).
- [ ] **Gestione Voti e Forum**
  - Salvare il voto (+1 / -1) in modo transazionale per impedire che un utente voti 100 volte aggiornando la pagina.
- [ ] **Gestione Immagini / Avatar**
  - Implementare il caricamento delle immagini profilo su un servizio cloud (es. Firebase Storage o Cloudinary) per ottenere l'URL pubblico.

---

## 💻 2. FRONTEND (Funzionamento UI e Autenticazione)
Il frontend deve reagire allo stato reale del backend e gestire caricamenti ed errori.

- [ ] **Refactoring `Verify.jsx`**
  - Connettere il form al vero servizio di OTP. Mostrare messaggi di errore reali ("Email non autorizzata", "Codice scaduto", "Codice errato").
- [ ] **Impostazioni Admin Reali (`Settings.jsx`)**
  - Fare in modo che il salvataggio del sottodominio (`slug`), della Whitelist email e delle Categorie modifichi realmente la configurazione della scuola nel database.
- [ ] **Dati Dinamici in Dashboard (`Dashboard.jsx`)**
  - Sostituire il grafico statico Recharts e le card statistiche con i veri aggregati calcolati in base alle segnalazioni caricate sul momento.
- [ ] **Chat Segnalazioni (Realtime)**
  - Fare in modo che i messaggi inviati tra studente e admin appaiano senza dover ricaricare la pagina (es. tramite Websocket o `onSnapshot` di Firebase).
- [ ] **Gestione Errori Globali**
  - Creare un componente "Toast" o "Snackbar" per avvisare l'utente di errori ("Nessuna connessione internet", "Salvataggio fallito").
- [ ] **Creazione di una home screen per presentare il proggetto e spingere alla registrazione**
una vera landing page dove si descrive il proggetto e i suoi vantaggi, con un pulsante per registrarsi/accedere allo sportello. Una pagina dedicata, più curata di quella attuale
---

## 🔮 3. IMPLEMENTAZIONI FUTURE (Scalabilità e Features Extra)
Funzionalità non strettamente necessarie per il lancio ("MVP"), ma ottime per il futuro.

- [ ] **Notifiche Push (PWA)**
  - Implementare Firebase Cloud Messaging (FCM) per notificare istantaneamente lo studente sullo smartphone quando il referente risponde alla sua segnalazione.
- [ ] **Progressive Web App (PWA)**
  - Configurare il `manifest.json` e il Service Worker. Questo permetterà agli studenti di scaricare "Dillo Qui" direttamente dalla pagina web, facendola comparire sulla home dell'iPhone/Android come una vera app nativa.
- [ ] **Esportazione PDF/CSV Avanzata**
  - Creare report automatici a fine mese per il dirigente scolastico in modo che possa portare le statistiche ai consigli di istituto.
- [ ] **Moderazione AI per il Forum**
  - Aggiungere un piccolo layer di intelligenza artificiale (es. OpenAI API) prima della pubblicazione nel forum per bloccare automaticamente parolacce, bullismo esplicito o l'inserimento di nomi e cognomi (tutela della privacy).
- [ ] **Super-Admin Panel (Multi-Tenant)**
  - Un pannello globale nascosto per l'azienda/creatore di "Dillo Qui" per registrare nuove scuole e gestire gli abbonamenti.
