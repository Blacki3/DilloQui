import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { getSettings } from '../../services/mockSettings';
import { getBox } from '../../services/db';

export default function Regolamento() {
  const { slug } = useParams();
  const isDemo = slug === 'demo';
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isDemo) {
          const s = getSettings();
          if (!cancelled) setText(s.regolamento || '');
        } else {
          const box = await getBox(slug);
          if (!cancelled) setText(box?.regolamento || '');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setText('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, isDemo]);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 40, height: 40, background: 'var(--b-yellow)',
          border: '2px solid var(--b-black)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ScrollText size={18} strokeWidth={2.5} />
        </div>
        <h1 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1.35rem' }}>
          Regolamento
        </h1>
      </div>
      <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 20, paddingLeft: 50 }}>
        Le regole dello sportello della tua scuola.
      </p>

      <div className="flat-panel">
        {loading ? (
          <p style={{ color: 'var(--b-gray)', fontWeight: 700, margin: 0 }}>Caricamento...</p>
        ) : text.trim() ? (
          <div
            className="regolamento-body"
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.65,
              fontSize: '0.98rem',
              color: 'var(--b-black)',
              fontWeight: 500,
            }}
          >
            {text.trim()}
          </div>
        ) : (
          <p style={{ color: 'var(--b-gray)', margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
            Il regolamento non è ancora stato pubblicato.
            Gli amministratori dello sportello lo aggiungeranno dalle Impostazioni.
          </p>
        )}
      </div>
    </div>
  );
}
