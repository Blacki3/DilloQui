import { useState, useEffect } from 'react';
import { X, BadgeCheck, PauseCircle, PlayCircle, Trash2, ShieldAlert, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { getBoxDetail, setBoxVerified, setBoxSuspended, platformDeleteBox } from '../../services/db';
import { useDialog } from '../../hooks/useDialog';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function giorniDa(value) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

// Traduce i numeri in una frase: è la domanda vera («funziona?»),
// non la somma delle colonne
function statoDiSalute(d) {
  if (d.suspended) return { testo: 'Sospeso', colore: 'var(--b-red)' };
  if (!d.studenti) return { testo: 'Nessuno studente registrato', colore: 'var(--b-gray)' };
  if (!d.segnalazioni) return { testo: 'Studenti registrati, nessuna segnalazione', colore: 'var(--b-orange)' };

  const giorni = giorniDa(d.ultima_attivita);
  if (giorni === null) return { testo: 'Attività sconosciuta', colore: 'var(--b-gray)' };
  if (giorni <= 7) return { testo: 'Attivo', colore: 'var(--b-green)' };
  if (giorni <= 30) return { testo: `Ultima segnalazione ${giorni} giorni fa`, colore: 'var(--b-orange)' };
  return { testo: `Fermo da ${giorni} giorni`, colore: 'var(--b-red)' };
}

const STATI = {
  new: 'Nuove', in_review: 'In esame', resolved: 'Risolte', closed: 'Chiuse',
};

const Stat = ({ label, value, hint }) => (
  <div style={{ border: '2px solid var(--b-black)', background: 'var(--b-white)', padding: '10px 12px' }}>
    <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.1 }}>{value ?? '—'}</div>
    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--b-gray)', marginTop: 2 }}>
      {label}
    </div>
    {hint && <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--b-gray)', marginTop: 4 }}>{hint}</div>}
  </div>
);

const Riga = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px dashed var(--b-gray-l)', fontSize: '0.84rem' }}>
    <span style={{ fontWeight: 800, minWidth: 130, textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--b-gray)', paddingTop: 2 }}>
      {label}
    </span>
    <span style={{ fontWeight: 600, flex: 1, overflowWrap: 'anywhere' }}>{children}</span>
  </div>
);

export default function PlatformBoxDetail({ slug, onClose, onChanged, onLock }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nota, setNota] = useState('');
  const [confermaElimina, setConfermaElimina] = useState(null);
  const dialogRef = useDialog(true, onClose);

  const handleError = (err, fallback) => {
    const message = err?.message || '';
    if (message.includes('Permesso negato')) {
      onLock?.();
      return;
    }
    console.error(fallback, err);
    setError(message || fallback);
  };

  const load = async () => {
    setLoading(true);
    try {
      setD(await getBoxDetail(slug));
      setError('');
    } catch (err) {
      handleError(err, 'Impossibile caricare la scheda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const azione = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged?.();
      await load();
      setNota('');
    } catch (err) {
      handleError(err, 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  };

  const elimina = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const esito = await platformDeleteBox(slug, confermaElimina);
      onChanged?.(`Sportello eliminato: ${esito?.segnalazioni_eliminate ?? 0} segnalazioni rimosse`);
      onClose();
    } catch (err) {
      handleError(err, 'Eliminazione non riuscita.');
      setBusy(false);
    }
  };

  const salute = d ? statoDiSalute(d) : null;
  const perStato = d?.per_stato || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, zIndex: 1000, overflowY: 'auto' }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Scheda dello sportello ${slug}`}
        tabIndex={-1}
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--b-cream)', border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', maxWidth: 620, width: '100%', marginTop: 20, marginBottom: 40, outline: 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '16px 20px', borderBottom: '3px solid var(--b-black)', background: 'var(--b-yellow)' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase' }}>{d?.name || slug}</h2>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', marginTop: 2 }}>/{slug}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Chiudi">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>Caricamento...</div>
          ) : !d ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--b-red)', fontWeight: 700 }}>{error || 'Scheda non disponibile.'}</div>
          ) : (
            <>
              {error && (
                <div style={{ border: '2px solid var(--b-black)', background: '#ffebeb', padding: '10px 12px', marginBottom: 16, fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={16} color="var(--b-red)" /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ background: d.verified ? 'var(--b-green)' : 'var(--b-orange)', border: '2px solid var(--b-black)', padding: '4px 9px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {d.verified ? 'Verificato' : 'Non verificato'}
                </span>
                <span style={{ background: salute.colore, color: '#fff', border: '2px solid var(--b-black)', padding: '4px 9px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Activity size={12} /> {salute.testo}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 18 }}>
                <Stat label="Studenti" value={d.studenti} hint={d.studenti_bannati > 0 ? `${d.studenti_bannati} bannati` : null} />
                <Stat label="Hanno scritto" value={d.studenti_attivi} />
                <Stat label="Segnalazioni" value={d.segnalazioni} hint={`${d.pubbliche || 0} sul forum`} />
                <Stat label="Ultimi 7 giorni" value={d.ultimi_7_giorni} />
              </div>

              <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', margin: '0 0 6px' }}>Segnalazioni per stato</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                {Object.keys(STATI).map((k) => (
                  <span key={k} style={{ border: '2px solid var(--b-black)', background: 'var(--b-white)', padding: '4px 9px', fontSize: '0.76rem', fontWeight: 700 }}>
                    {STATI[k]}: <strong>{perStato[k] || 0}</strong>
                  </span>
                ))}
              </div>

              <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', margin: '0 0 4px' }}>Scheda</h3>
              <div style={{ marginBottom: 18 }}>
                <Riga label="Aperto il">{formatDate(d.created_at)}</Riga>
                <Riga label="Ultima attività">{formatDate(d.ultima_attivita)}</Riga>
                <Riga label="Referenti">
                  {(d.admin || []).length === 0
                    ? <span style={{ color: 'var(--b-red)' }}>nessun admin collegato</span>
                    : (d.admin || []).map((a) => (
                        <div key={a.email}>{a.email}{(a.nome || a.cognome) ? ` — ${a.nome || ''} ${a.cognome || ''}` : ''}</div>
                      ))}
                </Riga>
                <Riga label="Filtro email">
                  {d.filtro_email === 'domain' ? 'per dominio' : 'per indirizzo esatto'}
                  {d.whitelist_voci > 0 ? ` (${d.whitelist_voci} voci)` : ' — nessuna voce: entra chiunque'}
                </Riga>
                <Riga label="Categorie">{(d.categories || []).join(', ') || '—'}</Riga>
                <Riga label="Regolamento">{d.ha_regolamento ? 'presente' : 'non compilato'}</Riga>
                <Riga label="Commenti">{d.commenti}</Riga>
                {d.verified && d.verified_note && <Riga label="Nota verifica">{d.verified_note}</Riga>}
                {d.suspended && (
                  <Riga label="Sospeso il">
                    {formatDate(d.suspended_at)}{d.suspended_note ? ` — ${d.suspended_note}` : ''}
                  </Riga>
                )}
              </div>

              <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', margin: '0 0 8px' }}>Azioni</h3>

              {!d.suspended && (
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Nota interna (usata da verifica e sospensione)"
                  style={{ width: '100%', border: '2px solid var(--b-black)', padding: '9px 11px', fontWeight: 600, outline: 'none', marginBottom: 10, fontSize: '0.84rem' }}
                />
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={busy}
                  onClick={() => azione(() => setBoxVerified(slug, !d.verified, nota))}
                  style={{ background: d.verified ? 'var(--b-white)' : 'var(--b-green)', border: '2px solid var(--b-black)', boxShadow: '2px 2px 0 var(--b-black)', cursor: busy ? 'wait' : 'pointer', padding: '9px 12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <BadgeCheck size={15} /> {d.verified ? 'Revoca verifica' : 'Verifica'}
                </button>

                <button
                  disabled={busy}
                  onClick={() => azione(() => setBoxSuspended(slug, !d.suspended, nota))}
                  style={{ background: d.suspended ? 'var(--b-green)' : 'var(--b-orange)', border: '2px solid var(--b-black)', boxShadow: '2px 2px 0 var(--b-black)', cursor: busy ? 'wait' : 'pointer', padding: '9px 12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {d.suspended ? <><PlayCircle size={15} /> Riattiva</> : <><PauseCircle size={15} /> Sospendi</>}
                </button>

                <button
                  disabled={busy}
                  onClick={() => setConfermaElimina(confermaElimina === null ? '' : null)}
                  style={{ background: 'var(--b-white)', border: '2px solid var(--b-red)', cursor: busy ? 'wait' : 'pointer', padding: '9px 12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.74rem', color: 'var(--b-red)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={15} /> Elimina
                </button>
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--b-gray)', fontWeight: 600, marginTop: 10, marginBottom: 0 }}>
                Sospendere ferma le nuove segnalazioni, i commenti e le chat, ma non
                cancella niente: gli studenti continuano a rileggere quello che hanno
                già scritto, e riattivando torna tutto come prima.
              </p>

              {confermaElimina !== null && (
                <div style={{ border: '3px solid var(--b-red)', background: '#ffebeb', padding: 14, marginTop: 14 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.84rem', margin: '0 0 10px' }}>
                    Elimini <strong>{d.name}</strong> e le sue {d.segnalazioni} segnalazioni,
                    comprese le chat con gli studenti. L&apos;operazione non si annulla e
                    non esiste un backup. Se vuoi solo fermarlo, usa Sospendi.
                  </p>
                  <p style={{ fontWeight: 700, fontSize: '0.8rem', margin: '0 0 6px' }}>
                    Per confermare scrivi <code style={{ background: 'var(--b-white)', padding: '1px 5px', border: '1px solid var(--b-black)' }}>{slug}</code>
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={confermaElimina}
                      onChange={(e) => setConfermaElimina(e.target.value)}
                      autoComplete="off"
                      style={{ flex: 1, border: '2px solid var(--b-black)', padding: '9px 11px', fontWeight: 600, outline: 'none', fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                    <button
                      disabled={busy || confermaElimina !== slug}
                      onClick={elimina}
                      style={{ background: confermaElimina === slug ? 'var(--b-red)' : 'var(--b-gray-l)', color: confermaElimina === slug ? '#fff' : 'var(--b-gray)', border: '2px solid var(--b-black)', cursor: confermaElimina === slug && !busy ? 'pointer' : 'not-allowed', padding: '9px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.74rem' }}
                    >
                      {busy ? 'Attendi...' : 'Elimina'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
