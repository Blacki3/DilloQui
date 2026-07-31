import { useState, useEffect } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import {
  isPushSupported,
  getPermissionState,
  enablePushNotifications,
  disablePushNotifications,
  updateNotifCategory,
  mergeNotifPrefs,
} from '../services/push';
import { friendlyError } from '../utils/friendlyError';

function BrutToggle({ on, onClick, disabled }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      aria-label={on ? 'Disattiva' : 'Attiva'}
      aria-pressed={on}
      style={{
        width: 48, height: 26, background: on ? 'var(--b-yellow)' : 'var(--b-gray-l)',
        border: '2px solid var(--b-black)', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.1s',
        opacity: disabled ? 0.45 : 1,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 18, height: 18, background: 'var(--b-black)',
        transition: 'left 0.12s',
      }} />
    </button>
  );
}

function PrefRow({ label, sublabel, on, onClick, disabled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', borderBottom: '2px solid var(--b-black)',
      background: 'var(--b-white)',
    }}>
      <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem' }}>
        {label}
        {sublabel && (
          <div style={{ fontSize: '0.75rem', color: 'var(--b-gray)', fontWeight: 500, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </span>
      <BrutToggle on={on} onClick={onClick} disabled={disabled} />
    </div>
  );
}

const STUDENT_CATEGORIES = [
  { key: 'chat_message', label: 'Risposte dello sportello', sublabel: 'Messaggi in chat sulle tue segnalazioni' },
  { key: 'status_change', label: 'Cambi di stato', sublabel: 'Quando una tua segnalazione viene presa in carico o chiusa' },
  { key: 'forum_comment', label: 'Commenti sui tuoi post', sublabel: 'Nuovi commenti sulle segnalazioni pubbliche che hai pubblicato' },
];

const ADMIN_CATEGORIES = [
  { key: 'new_report', label: 'Nuove segnalazioni', sublabel: 'Avviso ogni volta che arriva una segnalazione' },
  { key: 'chat_message', label: 'Messaggi in chat', sublabel: 'Quando uno studente risponde in una conversazione' },
];

/**
 * Pannello preferenze push.
 * @param {'student'|'admin'} role
 * @param {object} prefs — notif_prefs dal profilo (o mock)
 * @param {function} onPrefsChange — (nextPrefs) => void
 * @param {boolean} isDemo
 */
export default function NotificationPrefs({ role = 'student', prefs, onPrefsChange, isDemo = false }) {
  const [localPrefs, setLocalPrefs] = useState(() => mergeNotifPrefs(prefs));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState(getPermissionState());

  useEffect(() => {
    setLocalPrefs(mergeNotifPrefs(prefs));
  }, [prefs]);

  const categories = role === 'admin' ? ADMIN_CATEGORIES : STUDENT_CATEGORIES;
  const supported = isDemo || isPushSupported();
  const pushOn = !!localPrefs.push_enabled;

  const applyPrefs = (next) => {
    setLocalPrefs(next);
    onPrefsChange?.(next);
  };

  const handleMasterToggle = async () => {
    setError('');
    setBusy(true);
    try {
      if (isDemo) {
        const next = { ...localPrefs, push_enabled: !pushOn };
        applyPrefs(next);
        return;
      }
      if (pushOn) {
        const next = await disablePushNotifications();
        applyPrefs(next);
      } else {
        const next = await enablePushNotifications();
        applyPrefs(next);
      }
      setPermission(getPermissionState());
    } catch (err) {
      setError(friendlyError(err, 'Operazione non riuscita'));
      setPermission(getPermissionState());
    } finally {
      setBusy(false);
    }
  };

  const handleCategory = async (key) => {
    const nextVal = !localPrefs[key];
    const next = { ...localPrefs, [key]: nextVal };
    applyPrefs(next);
    if (isDemo) return;
    try {
      const saved = await updateNotifCategory(localPrefs, { [key]: nextVal });
      applyPrefs(saved);
    } catch (err) {
      setError(friendlyError(err, 'Salvataggio non riuscito'));
      applyPrefs(localPrefs); // rollback
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>
        Notifiche Push
      </div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)' }}>
        {/* Master */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px',
          borderBottom: pushOn ? '2px solid var(--b-black)' : 'none',
          background: 'var(--b-cream)',
        }}>
          <div style={{
            width: 36, height: 36, background: 'var(--b-yellow)', border: '2px solid var(--b-black)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Bell size={17} strokeWidth={2.5} />
          </div>
          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem' }}>
            Attiva notifiche sul dispositivo
            <div style={{ fontSize: '0.75rem', color: 'var(--b-gray)', fontWeight: 500, marginTop: 2 }}>
              {supported
                ? (permission === 'denied'
                  ? 'Permesso bloccato dal browser — riabilitalo dalle impostazioni del sito'
                  : 'Compariranno nella tendina delle notifiche')
                : 'Questo browser non supporta le push'}
            </div>
          </span>
          <BrutToggle
            on={pushOn}
            onClick={handleMasterToggle}
            disabled={busy || !supported || permission === 'denied'}
          />
        </div>

        {/* Categorie (solo se master ON) */}
        {pushOn && categories.map((cat, idx) => (
          <div key={cat.key} style={{ borderBottom: idx < categories.length - 1 ? undefined : 'none' }}>
            <PrefRow
              label={cat.label}
              sublabel={cat.sublabel}
              on={!!localPrefs[cat.key]}
              onClick={() => handleCategory(cat.key)}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="msg error" style={{ marginTop: 10 }}>
          <AlertCircle size={16} strokeWidth={2.5} />
          <span>{error}</span>
        </div>
      )}

      {!isDemo && !import.meta.env.VITE_VAPID_PUBLIC_KEY && (
        <p style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--b-gray)', fontWeight: 600 }}>
          Nota: manca VITE_VAPID_PUBLIC_KEY in .env.local — le push non si possono ancora attivare.
        </p>
      )}
    </div>
  );
}
