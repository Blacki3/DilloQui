import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Heart, ShieldCheck, Mail } from 'lucide-react';

const C = {
  primary: '#2d7a47',
  primaryD: '#236038',
  primaryL: '#e8f5e9',
  primaryBorder: '#c8e6c9',
  bg: '#f0f4f0',
  muted: '#6b7280',
  text: '#1a1a2e',
  border: '#e5e7eb',
  white: '#ffffff',
};

export default function About() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'white', color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navbar Minimal */}
      <nav style={{
        position: 'sticky', top: 0, left: 0, right: 0, zIndex: 999,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.04em', color: C.text }}>
          Dillo<span style={{ color: C.primary }}>Qui</span>
        </div>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 50,
            padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
            color: C.text, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
        >
          <ArrowLeft size={16} /> Torna alla Home
        </button>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        background: `linear-gradient(180deg, ${C.bg} 0%, white 100%)`,
        borderBottom: `1px solid ${C.border}`
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '4px 16px', fontSize: '0.78rem', fontWeight: 700, color: C.primary, marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Chi Siamo
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', color: C.text, marginBottom: 20 }}>
            La nostra missione è dare voce a ogni studente.
          </h1>
          <p style={{ color: C.muted, fontSize: '1.2rem', lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
            Dillo Qui nasce con l'obiettivo di abbattere le barriere comunicative all'interno delle scuole, offrendo uno strumento sicuro, immediato e anonimo.
          </p>
        </div>
      </section>

      {/* Valori */}
      <section style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: 48, letterSpacing: '-0.02em' }}>I Nostri Valori</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              {
                icon: Target,
                title: 'Trasparenza',
                desc: 'Crediamo in un dialogo chiaro e costruttivo tra studenti e istituzioni scolastiche.'
              },
              {
                icon: Heart,
                title: 'Empatia e Ascolto',
                desc: 'Ogni segnalazione è importante. Vogliamo creare un ambiente scolastico sereno per tutti.'
              },
              {
                icon: ShieldCheck,
                title: 'Sicurezza e Privacy',
                desc: 'La riservatezza dei dati e l\'anonimato delle segnalazioni sono le nostre priorità assolute.'
              }
            ].map((v, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 20, border: `1px solid ${C.border}`, background: C.bg + '30' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.primaryL, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <v.icon size={24} color={C.primary} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>{v.title}</h3>
                <p style={{ color: C.muted, lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / Placeholder Section */}
      <section style={{ padding: '80px 24px', background: C.bg }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 12 }}>Il Nostro Team</h2>
            <p style={{ color: C.muted, fontSize: '1.05rem' }}>Le persone che lavorano per rendere la scuola un posto migliore.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {[
              { name: 'Mario Rossi', role: 'Founder & Developer', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.' },
              { name: 'Laura Bianchi', role: 'Product Designer', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.' },
              { name: 'Alessandro Neri', role: 'Community Manager', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.' }
            ].map((member, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 20, background: 'white', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.primaryL, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 700, color: C.primary }}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 4 }}>{member.name}</h3>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{member.role}</div>
                <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.primary, color: 'rgba(255,255,255,0.55)', padding: '48px 24px 36px', textAlign: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: '1.35rem', marginBottom: 16, letterSpacing: '-0.03em' }}>
          <span style={{ color: 'white' }}>Dillo</span><span style={{ color: '#a7f3d0' }}>Qui</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
          {['Privacy Policy', 'Termini di Servizio', 'Cookie Policy', 'Contatti'].map(l => (
            <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
          &copy; {new Date().getFullYear()} Dillo Qui. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
}
