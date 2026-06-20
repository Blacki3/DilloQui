import { useNavigate } from 'react-router-dom';
import { Users, Megaphone, ArrowRight, ChevronRight } from 'lucide-react';
import BrandWordmark from '../components/BrandWordmark';

export default function About() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--b-bg)', color: 'var(--b-black)', paddingBottom: 0 }}>
      {/* ── HERO ── */}
      <section style={{
        padding: '140px 24px 80px',
        textAlign: 'center',
        background: 'var(--b-yellow)',
        borderBottom: '3px solid var(--b-black)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'var(--b-white)',
            border: '2px solid var(--b-black)',
            padding: '6px 18px',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'var(--b-black)',
            marginBottom: 24,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: 'var(--b-shadow-sm)',
          }}>
            Chi Siamo
          </div>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 900,
            letterSpacing: '0.02em',
            color: 'var(--b-black)',
            marginBottom: 24,
            lineHeight: 1.05,
            textTransform: 'uppercase',
          }}>
            La nostra missione è dare<br />
            <span style={{ background: 'var(--b-black)', color: 'var(--b-yellow)', padding: '0 12px' }}>voce a ogni studente.</span>
          </h1>
          <p style={{
            color: 'var(--b-black)',
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            lineHeight: 1.6,
            maxWidth: 680,
            margin: '0 auto',
            fontWeight: 600,
          }}>
            DILLOQUI nasce per abbattere le barriere comunicative dentro le scuole, offrendo uno strumento sicuro, immediato e anonimo.
          </p>
        </div>
      </section>

      {/* ── MISSIONE ── */}
      <section style={{ padding: '80px 24px', background: 'var(--b-white)', borderBottom: '3px solid var(--b-black)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            background: 'var(--b-cream)',
            border: '3px solid var(--b-black)',
            padding: '40px',
            boxShadow: 'var(--b-shadow-lg)',
          }}>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              Perché esistiamo
            </h2>
            <p style={{ color: 'var(--b-gray)', fontSize: '1.1rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
              Troppo spesso le idee e i problemi degli studenti restano inascoltati per timore di esporsi o per mancanza di un canale adeguato.
              Dillo Qui dà ai rappresentanti uno strumento concreto per raccogliere segnalazioni, proposte e dubbi in modo ordinato,
              e agli studenti uno spazio dove parlare liberamente, anche in forma anonima.
            </p>
          </div>
        </div>
      </section>

      {/* ── DA STUDENTI, PER STUDENTI ── */}
      <section style={{ padding: '100px 24px', background: 'var(--b-yellow)', borderTop: '3px solid var(--b-black)', borderBottom: '3px solid var(--b-black)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'stretch' }}>
          <div style={{ padding: '40px', background: 'var(--b-white)', border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow-lg)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--b-blue)', border: '2px solid var(--b-black)',
              padding: '6px 14px', fontSize: '0.85rem', fontWeight: 800,
              color: '#ffffff', marginBottom: 24, textTransform: 'uppercase',
            }}>
              <Users size={16} strokeWidth={2.5} /> Da studenti, per studenti
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 16, textTransform: 'uppercase' }}>Nato dalla scuola reale</h3>
            <p style={{ color: 'var(--b-gray)', lineHeight: 1.7, fontSize: '1rem', margin: 0, fontWeight: 500 }}>
              Non è uno strumento generico calato dall'alto: è pensato per il contesto scolastico italiano,
              a partire dall'esperienza diretta di chi la scuola la vive ogni giorno.
            </p>
          </div>
          <div style={{ padding: '40px', background: 'var(--b-white)', border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow-lg)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--b-orange)', border: '2px solid var(--b-black)',
              padding: '6px 14px', fontSize: '0.85rem', fontWeight: 800,
              color: '#ffffff', marginBottom: 24, textTransform: 'uppercase',
            }}>
              <Megaphone size={16} strokeWidth={2.5} /> Il nostro obiettivo
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 16, textTransform: 'uppercase' }}>Trasformare l'ascolto in azione</h3>
            <p style={{ color: 'var(--b-gray)', lineHeight: 1.7, fontSize: '1rem', margin: 0, fontWeight: 500 }}>
              Vogliamo che ogni segnalazione diventi un'occasione di miglioramento concreto,
              dando ai rappresentanti dati reali da portare a professori, consigli e dirigenza.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', background: 'var(--b-bg)', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            marginBottom: 24,
            lineHeight: 1.1,
          }}>
            Vuoi dare voce alla tua classe?
          </h2>
          <p style={{ color: 'var(--b-gray)', fontSize: '1.15rem', lineHeight: 1.7, marginBottom: 48, fontWeight: 500 }}>
            Crea la tua box in pochi minuti, oppure prova la demo per vedere come funziona.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/admin/login')}
              className="btn-primary"
              style={{ fontSize: '1.1rem', padding: '16px 36px' }}
            >
              Crea la tua Box <ArrowRight size={20} strokeWidth={3} />
            </button>
            <button
              onClick={() => navigate('/box/demo')}
              className="btn-secondary"
              style={{ fontSize: '1.1rem', padding: '16px 36px' }}
            >
              Guarda la Demo <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: 'var(--b-black)',
        color: '#ffffff',
        padding: '60px 24px 40px',
        textAlign: 'center',
        borderTop: '3px solid var(--b-black)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <BrandWordmark variant="inverted" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
          {['Privacy Policy', 'Termini di Servizio', 'Cookie Policy', 'Contatti'].map(l => (
            <a key={l} href="#" style={{
              color: 'var(--b-gray-l)',
              fontSize: '0.9rem',
              textDecoration: 'none',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
              onMouseEnter={e => e.target.style.color = 'var(--b-yellow)'}
              onMouseLeave={e => e.target.style.color = 'var(--b-gray-l)'}
            >
              {l}
            </a>
          ))}
        </div>
        <div style={{ width: 80, height: 3, background: 'var(--b-gray)', margin: '0 auto 24px' }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--b-gray)', fontFamily: "'IBM Plex Mono', monospace" }}>&copy; {new Date().getFullYear()} DILLOQUI. Tutti i diritti riservati.</p>
      </footer>
    </div>
  );
}
