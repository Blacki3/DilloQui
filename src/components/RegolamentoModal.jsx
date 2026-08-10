import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, CheckCircle2 } from 'lucide-react';

/**
 * Modale bloccante che mostra il regolamento della Box.
 * Il tasto "Accetta" si abilita solo dopo aver scrollato fino in fondo.
 *
 * Props:
 *  - regolamento: string — testo del regolamento
 *  - boxName: string — nome dello sportello
 *  - onAccept: () => void — callback chiamata al click su Accetta
 */
export default function RegolamentoModal({ regolamento, boxName, onAccept }) {
  const scrollRef = useRef(null);
  const [canAccept, setCanAccept] = useState(false);

  // Controlla se l'utente ha scrollato fino in fondo (con tolleranza di 12px)
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 12;
    if (atBottom) setCanAccept(true);
  };

  // Caso in cui il testo sia così corto da non generare scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      setCanAccept(true);
    }
  }, [regolamento]);

  return (
    // Overlay bloccante
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          background: 'var(--b-white)',
          border: '3px solid var(--b-black)',
          boxShadow: '6px 6px 0 var(--b-black)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '2px solid var(--b-black)',
            background: 'var(--b-yellow)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 36, height: 36,
                background: 'var(--b-black)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ScrollText size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>
              Regolamento dello Sportello
            </h2>
          </div>
          {boxName && (
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--b-gray)', paddingLeft: 46 }}>
              {boxName} — Leggi e accetta prima di continuare
            </p>
          )}
        </div>

        {/* Testo scrollabile */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            lineHeight: 1.7,
            fontSize: '0.95rem',
            fontWeight: 500,
            color: 'var(--b-black)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {regolamento}
        </div>

        {/* Hint scroll + Azione */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '2px solid var(--b-black)',
            flexShrink: 0,
            background: 'var(--b-bg)',
          }}
        >
          {!canAccept && (
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--b-gray)',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              ↓ Scorri fino in fondo per abilitare il tasto
            </p>
          )}

          <button
            className="btn-primary"
            onClick={onAccept}
            disabled={!canAccept}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: canAccept ? 1 : 0.4,
              cursor: canAccept ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.25s',
              fontSize: '0.9rem',
            }}
          >
            <CheckCircle2 size={18} strokeWidth={2.5} />
            Ho letto e accetto il Regolamento
          </button>
        </div>
      </motion.div>
    </div>
  );
}
