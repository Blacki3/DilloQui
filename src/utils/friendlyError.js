/**
 * Messaggio errore sicuro per UI: evita leak tecnici (Postgres, JWT, Supabase, stack).
 */
export function friendlyError(err, fallback = 'Qualcosa non ha funzionato. Riprova più tardi o contattaci.') {
  if (!err) return fallback;

  const raw = typeof err === 'string'
    ? err.trim()
    : (err.message || err.error_description || err.msg || '').toString().trim();

  if (!raw || raw === '{}' || raw === '[object Object]') return fallback;

  const leak =
    /supabase|postgres|postgresql|jwt|pgrst|rls|permission denied|violates|relation ["']|column ["']|syntax error|stack trace|econnrefused|networkerror|fetch failed|invalid jwt|expired jwt|auth\.users|json\.parse|duplicate key|foreign key|check constraint/i;

  if (leak.test(raw)) return fallback;
  if (raw.length > 180) return fallback;
  if (/^\s*[{[]/.test(raw)) return fallback;

  return raw;
}
