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
6. `supabase_push_notifications.sql` (se usi le push)
7. `supabase_security_p0.sql` — anon_token nascosto, handle_new_user, become_admin_and_link_box
8. `supabase_security_p1.sql` — boxes_public / check_email_allowed, author UPDATE ristretto, revoke get_anon_reports, (redeploy send-push)
9. `supabase_security_p2.sql` — trigger `claim_report_owner` AFTER INSERT su `reports` → `report_owners` (auth.uid()); client upsert resta fallback

## Status segnalazioni (CHECK)
Frontend e DB effettivo: `new` | `in_review` | `resolved` | `closed`.
- **Fresh install:** `supabase_schema.sql` usa già questo CHECK.
- **DB legacy** creati con `in_progress` / `rejected`: migrati da `supabase_fixes.sql` (UPDATE + DROP/ADD constraint). Non rieseguire il CHECK vecchio.

## send-push Edge Function — Auth P1 implementata
La function verifica JWT + ownership del chiamante tramite `authorizeCaller()`:
- Admin del box: passa
- Owner/autore della segnalazione (via `report_owners` o `author_id`): passa
- Membro del box per `new_report` / `forum_comment`: passa
- Tutti gli altri: 403 Forbidden
