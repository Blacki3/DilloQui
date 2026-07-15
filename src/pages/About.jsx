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


      {/* ── STORIA ── */}
      <section style={{ padding: '100px 24px', background: 'var(--b-bg)', borderBottom: '3px solid var(--b-black)' }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'var(--b-yellow)',
            border: '2px solid var(--b-black)',
            padding: '5px 16px',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: 'var(--b-shadow-sm)',
            marginBottom: 32,
          }}>
            La nostra storia
          </div>

          <p style={{
            fontSize: 'clamp(1.1rem, 2.2vw, 1.35rem)',
            lineHeight: 1.85,
            color: 'var(--b-black)',
            fontWeight: 500,
            margin: '0 0 32px',
          }}>
            Dillo Qui nasce da un'idea semplice: siamo studenti come voi, e sappiamo bene cosa vuol dire avere qualcosa da dire e non sapere come dirlo — o a chi dirlo.
          </p>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            lineHeight: 1.85,
            color: 'var(--b-gray)',
            fontWeight: 500,
            margin: '0 0 32px',
          }}>
            Il progetto nasce all'interno del <strong style={{ color: 'var(--b-black)' }}>ITIS PONTI</strong> di Gallarate nel 2025, quando noi rappresentanti di classe ci siamo trovati di fronte a un problema concreto: come raccogliere le segnalazioni dei compagni in modo ordinato, garantendo allo stesso tempo la riservatezza di chi parla?<br />
            Le email non arrivavano. Le assemblee di classe lasciavano troppo poco spazio a chi era più timido.
          </p>

          <div style={{
            borderLeft: '5px solid var(--b-black)',
            paddingLeft: 28,
            margin: '40px 0',
          }}>
            <p style={{
              fontSize: 'clamp(1.1rem, 2.2vw, 1.3rem)',
              lineHeight: 1.75,
              color: 'var(--b-black)',
              fontWeight: 700,
              fontStyle: 'italic',
              margin: 0,
            }}>
              "Ci siamo chiesti: e se costruissimo noi lo strumento che vorremmo avere?"
            </p>
          </div>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            lineHeight: 1.85,
            color: 'var(--b-gray)',
            fontWeight: 500,
            margin: '0 0 32px',
          }}>
            Abbiamo così iniziato a progettare una piattaforma che potesse essere semplice da usare, sicura e accessibile a tutti.  Creando una prima versione ai tempi chiamata semplicemnte "Sportello di Ascolto". Molto piu semplice dell'attuale ma con lo stesso scopo.
            Oggi Dillo Qui è una piattaforma reale, usata realmente,{' '}
            <span style={{
              color: 'var(--b-black)',
              fontWeight: 900,
              fontStyle: 'italic',
            }}>costruita da studenti — per gli studenti.</span>
          </p>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            lineHeight: 1.85,
            color: 'var(--b-gray)',
            fontWeight: 500,
            margin: 0,
          }}>
            Non siamo una startup, non siamo un'azienda. Siamo un gruppo di ragazzi che crede che dare voce a chi studia ogni giorno possa cambiare concretamente l'esperienza scolastica — una segnalazione alla volta.
          </p>
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
