import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, ShieldAlert, Search, Building2, RefreshCw, X, Lock, PauseCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { listBoxesOverview, setBoxVerified } from '../../services/db';
import PlatformBoxDetail from './PlatformBoxDetail';
import { useDialog } from '../../hooks/useDialog';

const FILTERS = [
  { id: 'pending',   label: 'In attesa' },
  { id: 'verified',  label: 'Verificati' },
  { id: 'suspended', label: 'Sospesi' },
  { id: 'all',       label: 'Tutti' },
];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// «Da quanto non succede niente» dice più della data assoluta
function ultimaAttivita(value) {
  if (!value) return 'mai usato';
  const giorni = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  if (giorni < 30) return `${giorni} giorni fa`;
  return formatDate(value);
}

// Montato da PlatformGate solo a sblocco avvenuto: qui i controlli
// di accesso sono già passati, restano quelli lato database.
export default function PlatformBoxes({ onLock }) {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  // Sportello su cui si sta decidendo: apre il riquadro di conferma
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // Sportello di cui è aperta la scheda
  const [detailSlug, setDetailSlug] = useState(null);

  // Lo sblocco scade dopo 30 minuti: da lì in poi ogni RPC risponde
  // "Permesso negato" e va richiesta di nuovo la password.
  const handleError = useCallback((err, fallback) => {
    const message = err?.message || '';
    if (message.includes('Permesso negato')) {
      onLock?.();
      return;
    }
    console.error(fallback, err);
    setError(message || fallback);
  }, [onLock]);

  const openConfirm = (box) => {
    setTarget(box);
    setNote(box.verified ? '' : (box.verified_note || ''));
  };

  const closeConfirm = () => {
    if (saving) return;
    setTarget(null);
    setNote('');
  };

  // Sopra il return anticipato del caricamento: gli hook devono girare
  // nello stesso ordine a ogni render.
  const confirmRef = useDialog(!!target, closeConfirm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBoxes(await listBoxesOverview());
    } catch (err) {
      handleError(err, 'Impossibile caricare gli sportelli.');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => { load(); }, [load]);

  if (loading && !boxes.length) {
    return (
      <div className="admin-page" style={{ padding: 40, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>
        Caricamento sportelli...
      </div>
    );
  }

  const pendingCount = boxes.filter(b => !b.verified).length;

  const filtered = boxes.filter(b => {
    if (filter === 'pending' && b.verified) return false;
    if (filter === 'verified' && !b.verified) return false;
    if (filter === 'suspended' && !b.suspended) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [b.name, b.slug, b.admin_email]
      .some(v => (v || '').toLowerCase().includes(q));
  });

  const confirm = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const next = !target.verified;
      await setBoxVerified(target.slug, next, next ? note : null);
      setTarget(null);
      setNote('');
      await load();
    } catch (err) {
      handleError(err, 'Operazione non riuscita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="admin-page admin-page-wide"
      style={{ paddingBottom: 60 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 8, height: 36, background: 'var(--b-green)', border: '2px solid var(--b-black)' }} />
          <h1 style={{ textTransform: 'uppercase', margin: 0 }}>Sportelli</h1>
        </div>
        <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', paddingLeft: 18, fontWeight: 600 }}>
          Gli sportelli aperti con un indirizzo <strong>.edu.it</strong> sono verificati in automatico.
          Gli altri restano in attesa finché non confermi che la scuola esiste davvero.
          Clicca una riga per aprire la scheda, con le statistiche e i comandi di sospensione.
        </p>
      </div>

      {error && (
        <div style={{ border: '3px solid var(--b-black)', background: '#ffebeb', boxShadow: 'var(--b-shadow-sm)', padding: '12px 16px', marginBottom: 20, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={18} color="var(--b-red)" />
          {error}
        </div>
      )}

      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', gap: 0, border: '2px solid var(--b-black)', boxShadow: 'var(--b-shadow-sm)' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? 'var(--b-yellow)' : 'var(--b-white)',
                border: 'none',
                borderRight: f.id === 'all' ? 'none' : '2px solid var(--b-black)',
                padding: '10px 16px', cursor: 'pointer', fontWeight: 800,
                textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.03em',
              }}
            >
              {f.label}
              {f.id === 'pending' && pendingCount > 0 && (
                <span style={{ marginLeft: 8, background: 'var(--b-red)', color: '#fff', padding: '1px 6px', border: '1px solid var(--b-black)', fontSize: '0.7rem' }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 200, border: '2px solid var(--b-black)', background: 'var(--b-white)', padding: '0 12px', boxShadow: 'var(--b-shadow-sm)' }}>
          <Search size={18} color="var(--b-gray)" />
          <input
            type="text"
            placeholder="Cerca per scuola, slug o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', flex: 1, padding: '12px', outline: 'none', fontWeight: 700 }}
          />
        </div>

        <button
          onClick={load}
          title="Ricarica"
          disabled={loading}
          style={{ background: 'var(--b-white)', border: '2px solid var(--b-black)', boxShadow: 'var(--b-shadow-sm)', cursor: loading ? 'wait' : 'pointer', padding: '0 14px', display: 'flex', alignItems: 'center', opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw size={18} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => onLock?.()}
          title="Blocca il pannello"
          style={{ background: 'var(--b-white)', border: '2px solid var(--b-black)', boxShadow: 'var(--b-shadow-sm)', cursor: 'pointer', padding: '0 14px', display: 'flex', alignItems: 'center' }}
        >
          <Lock size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ border: '3px solid var(--b-black)', background: 'var(--b-cream)', boxShadow: 'var(--b-shadow)', overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>
            {filter === 'pending' ? 'Nessuno sportello in attesa. Tutto in ordine.' : 'Nessuno sportello trovato.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.2fr', padding: '12px 16px', borderBottom: '3px solid var(--b-black)', background: 'var(--b-yellow)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem' }}>
              <div>Sportello</div>
              <div>Referente</div>
              <div>Aperto il</div>
              <div>Attività</div>
              <div style={{ textAlign: 'right' }}>Stato</div>
            </div>

            {filtered.map((b, i) => (
              <div
                key={b.slug}
                onClick={() => setDetailSlug(b.slug)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setDetailSlug(b.slug); }}
                title="Apri la scheda"
                style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.2fr', padding: '16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--b-black)' : 'none', background: b.suspended ? '#ffebeb' : b.verified ? 'var(--b-white)' : '#fffaf0', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, background: b.suspended ? 'var(--b-red)' : b.verified ? 'var(--b-green)' : 'var(--b-orange)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color={b.suspended ? '#fff' : '#000'} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{b.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--b-gray)' }}>/{b.slug}</div>
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', overflowWrap: 'anywhere' }}>
                    {b.admin_email || <span style={{ color: 'var(--b-red)' }}>nessun admin</span>}
                  </div>
                  {(b.admin_nome || b.admin_cognome) && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--b-gray)' }}>
                      {b.admin_nome} {b.admin_cognome}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--b-gray)' }}>
                  {formatDate(b.created_at)}
                </div>

                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--b-gray)' }}>
                  {b.students} studenti<br />{b.reports} segnalazioni<br />
                  <span style={{ fontSize: '0.72rem' }}>{ultimaAttivita(b.last_activity)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  {b.suspended && (
                    <span style={{ background: 'var(--b-red)', color: '#fff', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', border: '1px solid var(--b-black)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PauseCircle size={13} /> Sospeso
                    </span>
                  )}
                  {b.verified ? (
                    <>
                      <span style={{ background: 'var(--b-green)', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', border: '1px solid var(--b-black)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <BadgeCheck size={13} /> Verificato
                      </span>
                      <button
                        onClick={() => openConfirm(b)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--b-red)', textDecoration: 'underline', padding: 0 }}
                      >
                        Revoca
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openConfirm(b)}
                      style={{ background: 'var(--b-green)', border: '2px solid var(--b-black)', boxShadow: '2px 2px 0 var(--b-black)', cursor: 'pointer', padding: '8px 12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <BadgeCheck size={15} /> Verifica
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {target && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConfirm}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}
          >
            <motion.div
              ref={confirmRef}
              role="dialog"
              aria-modal="true"
              aria-label={target.verified ? 'Revoca verifica' : 'Verifica sportello'}
              tabIndex={-1}
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--b-white)', border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', maxWidth: 460, width: '100%', padding: 20, outline: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <h3 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1.05rem' }}>
                  {target.verified ? 'Revoca verifica' : 'Verifica sportello'}
                </h3>
                <button onClick={closeConfirm} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Chiudi">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--b-gray)', fontWeight: 600, marginBottom: 14 }}>
                {target.verified ? (
                  <>Lo sportello <strong>{target.name}</strong> tornerà a mostrare l&apos;avviso «non verificato» a studenti e admin.</>
                ) : (
                  <>Conferma che <strong>{target.name}</strong> è una scuola reale e che <strong>{target.admin_email}</strong> ne è un referente legittimo. L&apos;avviso sparirà per tutti.</>
                )}
              </p>

              {!target.verified && (
                <label style={{ display: 'block', marginBottom: 16 }}>
                  <span style={{ display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', marginBottom: 6 }}>
                    Nota interna (facoltativa)
                  </span>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Es. confermato al telefono con la segreteria"
                    style={{ width: '100%', border: '2px solid var(--b-black)', padding: '10px 12px', fontWeight: 600, outline: 'none' }}
                  />
                </label>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={closeConfirm}
                  disabled={saving}
                  style={{ background: 'var(--b-white)', border: '2px solid var(--b-black)', cursor: 'pointer', padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}
                >
                  Annulla
                </button>
                <button
                  onClick={confirm}
                  disabled={saving}
                  style={{ background: target.verified ? 'var(--b-red)' : 'var(--b-green)', color: target.verified ? '#fff' : '#000', border: '2px solid var(--b-black)', boxShadow: '2px 2px 0 var(--b-black)', cursor: saving ? 'wait' : 'pointer', padding: '10px 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}
                >
                  {saving ? 'Attendi...' : target.verified ? 'Revoca' : 'Verifica'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailSlug && (
          <PlatformBoxDetail
            slug={detailSlug}
            onClose={() => setDetailSlug(null)}
            onChanged={load}
            onLock={onLock}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
