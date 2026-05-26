# Dillo Qui 💬🛡️

**Dillo Qui** è una piattaforma web moderna e sicura creata per favorire lo scambio anonimo di segnalazioni, proposte e feedback tra gli studenti e gli istituti scolastici. 

Il progetto punta a creare un ambiente digitale sicuro in cui gli studenti possano esprimersi senza timori, consentendo al contempo agli amministratori della scuola di analizzare le segnalazioni attraverso una dashboard ricca e intuitiva.

---

## 🛠️ Tech Stack & Librerie utilizzate
Il progetto è basato sulle seguenti tecnologie principali:
- **React (v18)** - Framework Javascript per l'interfaccia utente.
- **Vite** - Build tool ultra-veloce per lo sviluppo locale.
- **React Router Dom (v6)** - Gestione della navigazione e delle rotte dinamiche.
- **Lucide React** - Set di icone moderne e minimaliste.
- **Recharts** - Grafici interattivi e responsivi per la dashboard di amministrazione.
- **Framer Motion** - Animazioni fluide per transizioni native-like.

---

## 🚀 Come avviare il progetto localmente

Se hai scaricato o clonato questa repository, segui questi passaggi per installare le dipendenze e avviare il sito:

### 1. Prerequisiti
Assicurati di avere installato sul computer [Node.js](https://nodejs.org/) (consigliata versione LTS).

### 2. Installazione dei moduli
Apri il terminale all'interno della cartella principale del progetto ed esegui il seguente comando per scaricare automaticamente tutti i pacchetti necessari (quelli definiti in `package.json`):

```bash
npm install
```
*Questo comando creerà automaticamente la cartella `node_modules` locale scaricandovi le librerie necessarie.*

### 3. Avvio del server di sviluppo
Una volta terminata l'installazione dei moduli, avvia il server locale di Vite:

```bash
npm run dev
```

### 4. Prova la piattaforma
Il terminale ti mostrerà un indirizzo locale (solitamente `http://localhost:5173`). Aprilo nel tuo browser per testare l'applicazione!

---

## 📱 Funzionalità implementate
- **Interfaccia mobile-first:** Ottimizzata per smartphone con menu hamburger laterali e a comparsa sia per studenti che per admin.
- **Dashboard Admin:** Statistiche dettagliate dell'andamento dello sportello con grafici interattivi ad area (problemi, proposte, dubbi).
- **Bacheca Studenti:** Spazio per consultare e supportare le segnalazioni degli altri alunni.
- **Inserimento Segnalazioni:** Form completo per l'invio protetto e/o anonimo delle segnalazioni.
- **Gestione Whitelist:** Controllo degli accessi per garantire l'autenticità degli studenti tramite email istituzionali.
