import { Link } from 'react-router-dom';
import BrandWordmark from './BrandWordmark';

export default function Footer() {
  return (
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
        <Link to="/privacy" style={{
          color: 'var(--b-gray-l)', fontSize: '0.9rem', textDecoration: 'none',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        }} onMouseEnter={e => e.target.style.color = 'var(--b-yellow)'} onMouseLeave={e => e.target.style.color = 'var(--b-gray-l)'}>
          Privacy
        </Link>
        <Link to="/cookie" style={{
          color: 'var(--b-gray-l)', fontSize: '0.9rem', textDecoration: 'none',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        }} onMouseEnter={e => e.target.style.color = 'var(--b-yellow)'} onMouseLeave={e => e.target.style.color = 'var(--b-gray-l)'}>
          Cookie Policy
        </Link>
        <Link to="/termini" style={{
          color: 'var(--b-gray-l)', fontSize: '0.9rem', textDecoration: 'none',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        }} onMouseEnter={e => e.target.style.color = 'var(--b-yellow)'} onMouseLeave={e => e.target.style.color = 'var(--b-gray-l)'}>
          Termini di Servizio
        </Link>
        <a href="mailto:info@dilloqui.it" style={{
          color: 'var(--b-gray-l)', fontSize: '0.9rem', textDecoration: 'none',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        }} onMouseEnter={e => e.target.style.color = 'var(--b-yellow)'} onMouseLeave={e => e.target.style.color = 'var(--b-gray-l)'}>
          Contatti
        </a>
      </div>
      <div style={{ width: 80, height: 3, background: 'var(--b-gray)', margin: '0 auto 24px' }} />
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--b-gray)', fontFamily: "'IBM Plex Mono', monospace" }}>
        &copy; {new Date().getFullYear()} DILLOQUI. Piattaforma per Rappresentanti degli Studenti. Tutti i diritti riservati.
      </p>
    </footer>
  );
}
