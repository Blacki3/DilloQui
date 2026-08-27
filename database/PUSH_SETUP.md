# Push Notifications — Setup

## 1. SQL
Esegui nel SQL Editor: `Supbase SQL/supabase_push_notifications.sql`

## 2. Genera chiavi VAPID
```bash
npx web-push generate-vapid-keys
```
Copia Public Key e Private Key.

## 3. Frontend (.env.local)
```
VITE_VAPID_PUBLIC_KEY=<Public Key>
```
Riavvia `npm run dev`.

## 4. Edge Function (invio)
```bash
supabase login
supabase link --project-ref <il-tuo-ref>
supabase secrets set VAPID_PUBLIC_KEY="<Public Key>" VAPID_PRIVATE_KEY="<Private Key>" VAPID_SUBJECT="mailto:tuo@email.it"
supabase functions deploy send-push
```

## Preferenze utente
Profilo → Notifiche Push:
- Master: attiva il permesso sul dispositivo
- Categorie studente: risposte chat, cambi stato, commenti sui post
- Categorie admin: nuove segnalazioni, messaggi in chat

## Note iPhone
Su iOS le push funzionano solo se il sito è aggiunto alla Home (PWA) e da iOS 16.4+.

## Email / Resend
Le credenziali SMTP (es. Resend) vanno solo nei **Secret SMTP di Supabase Auth** — mai in variabili `VITE_*` o nel frontend: sarebbero esposte nel bundle del browser.
