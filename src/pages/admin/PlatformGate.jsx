import { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { platformSessionStatus, platformUnlock, platformLock } from '../../services/db';

// Import dentro il gate, non nella rotta: il codice del pannello parte
// dal server solo dopo che la password è stata accettata.
const PlatformBoxes = lazy(() => import('./PlatformBoxes'));

const Loader = ({ text }) => (
  <div className="admin-page" style={{ padding: 40, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>
    {text}
  </div>
);

export default function PlatformGate() {
  const { isPlatformAdmin, loading: authLoading, profile } = useAuth();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPlatformAdmin !== true) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    platformSessionStatus().then((status) => {
      if (cancelled) return;
      setUnlocked(status?.unlocked === true);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [isPlatformAdmin]);

  const lock = async () => {
    setUnlocked(false);
    setPassword('');
    try {
      await platformLock();
    } catch {
      /* la sessione scade comunque da sola */
    }
  };

  if (authLoading || isPlatformAdmin === null) {
    return <Loader text="Verifica in corso..." />;
  }

  // Per chiunque altro la sezione non esiste: nessun messaggio, nessun indizio
  if (isPlatformAdmin !== true) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (checking) return <Loader text="Verifica in corso..." />;

  if (unlocked) {
    return (
      <Suspense fallback={<Loader text="Apertura pannello..." />}>
        <PlatformBoxes onLock={lock} />
      </Suspense>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await platformUnlock(email.trim(), password);
      if (res?.ok) {
        setPassword('');
        setUnlocked(true);
        return;
      }
      if (res?.error) {
        setError(`Errore dal server: ${res.error}`);
      } else if (res?.locked_until) {
        const until = new Date(res.locked_until).toLocaleTimeString('it-IT', {
          hour: '2-digit', minute: '2-digit',
        });
        setError(`Troppi tentativi. Riprova dopo le ${until}.`);
      } else {
        setError('Email o password non corretti.');
      }
    } catch {
      setError('Verifica non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="admin-page"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}
    >
      <div style={{ width: '100%', maxWidth: 420, border: '3px solid var(--b-black)', background: 'var(--b-white)', boxShadow: 'var(--b-shadow)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, background: 'var(--b-yellow)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={17} strokeWidth={2.5} />
          </div>
          <h1 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1.2rem' }}>Area gestione</h1>
        </div>

        <p style={{ color: 'var(--b-gray)', fontSize: '0.86rem', fontWeight: 600, marginBottom: 20 }}>
          Questa sezione chiede una password dedicata, diversa da quella con cui
          hai fatto l&apos;accesso. Lo sblocco dura 30 minuti.
        </p>

        {error && (
          <div style={{ border: '2px solid var(--b-black)', background: '#ffebeb', padding: '10px 12px', marginBottom: 16, fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} color="var(--b-red)" />
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', marginBottom: 6 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder={profile?.email || 'email@esempio.it'}
              required
              style={{ width: '100%', border: '2px solid var(--b-black)', padding: '10px 12px', fontWeight: 600, outline: 'none' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 20 }}>
            <span style={{ display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', marginBottom: 6 }}>Password del pannello</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: '100%', border: '2px solid var(--b-black)', padding: '10px 12px', fontWeight: 600, outline: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', background: 'var(--b-yellow)', border: '2px solid var(--b-black)', boxShadow: '3px 3px 0 var(--b-black)', cursor: busy ? 'wait' : 'pointer', padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.03em' }}
          >
            {busy ? 'Verifica...' : 'Sblocca'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
