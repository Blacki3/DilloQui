import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, MessageSquareHeart, BarChart3, Zap,
  ChevronRight, ArrowRight, Lock, Eye, CheckCircle2,
  Menu, X, Sparkles, Users2, BookOpen, Vote, Megaphone, Star, Building2, Clock, Users, Landmark, Shield, Key, Link as LinkIcon, Library, Book, Tags
} from 'lucide-react';

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function AnimatedSection({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Palette verde coerente con il design system dell'app ── */
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
const IncognitoIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 13l2-7h12l2 7" />
    <path d="M2 13h20" />
    <circle cx="7" cy="18" r="3" />
    <circle cx="17" cy="18" r="3" />
    <path d="M10 18h4" />
  </svg>
);

const SplitClassInstituteIcon = ({ size = 24, color = 'currentColor' }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
      <Users size={size * 0.8} color={color} strokeWidth={1.8} style={{ position: 'absolute', top: -1, left: -1 }} />
    </div>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }}>
      <Landmark size={size * 0.8} color={color} strokeWidth={1.8} style={{ position: 'absolute', bottom: -1, right: -1 }} />
    </div>
    {/* Stacco vuoto (background color) */}
    <div style={{ position: 'absolute', top: '-15%', left: '47%', width: 5, height: '130%', background: '#e8f5e9', transform: 'rotate(45deg)' }} />
    {/* Linea centrale netta */}
    <div style={{ position: 'absolute', top: '-15%', left: '49.5%', width: 1.5, height: '130%', background: color, transform: 'rotate(45deg)' }} />
  </div>
);

const BookStackSideIcon = ({ size = 24, color = 'currentColor' }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
    <div style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
      <Library size={size * 1.1} color={color} strokeWidth={1.5} />
    </div>
  </div>
);

const features = [
  {
    icon: IncognitoIcon,
    color: '#2d7a47', bg: '#e8f5e9',
    title: 'Segnalazioni anonime',
    desc: 'Gli studenti segnalano senza paura. Garantendo risposte più oneste.',
  },
  {
    icon: LinkIcon,
    color: '#2d7a47', bg: '#e8f5e9',
    title: 'Un link, tutto dentro',
    desc: 'Nessuna app da scaricare. Basta condividere il link della box.',
  },
  {
    icon: SplitClassInstituteIcon,
    color: '#2d7a47', bg: '#e8f5e9',
    title: 'Per classe o istituto',
    desc: 'Funziona per il singolo rappresentante di classe e per quello d\'istituto.',
  },
  {
    icon: Zap,
    color: '#2d7a47', bg: '#e8f5e9',
    title: 'Pronto in pochi minuti',
    desc: 'Registrazione, configurazione e link condiviso: tutto in meno di 5 minuti.',
  },
  {
    icon: Tags,
    color: '#2d7a47', bg: '#e8f5e9',
    title: 'Categorie personalizzate',
    desc: 'Organizza le segnalazioni per argomento — didattica, strutture, clima e altro.',
  },
  {
    icon: BookStackSideIcon,
    color: '#2d7a47', bg: '#e8f5e9',
    title: 'Pensato per le scuole',
    desc: 'Non uno strumento generico: nato per il contesto scolastico italiano.',
  },
];

const steps = [
  { n: '01', title: 'Crei lo Sportello', desc: 'Come rappresentante ti registri, scegli il nome della box e ottieni un link unico da condividere ai tuoi compagni.' },
  { n: '02', title: 'Condividi il Link', desc: 'Inserisci il link nel gruppo classe, sul registro o nella bacheca virtuale. Non serve spiegare nulla di tecnico.' },
  { n: '03', title: 'I Compagni Segnalano', desc: 'Chiunque abbia un\'email scolastica può accedere con un codice OTP e inviare una segnalazione, anche in modo completamente anonimo.' },
  { n: '04', title: 'Rispondi e Agisci', desc: 'Gestisci le segnalazioni dal pannello, rispondi in privato e segni cosa è stato risolto. Porti la voce di tutti.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ruolo, setRuolo] = useState('classe'); // 'classe' | 'istituto'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", overflowX: 'hidden', background: 'white' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
        padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.04em', color: C.text }}>
          Dillo<span style={{ color: C.primary }}>Qui</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="lnav-desktop">
          {[{ label: 'Funzionalità', path: '#funzionalità' }, { label: 'Come Funziona', path: '#come-funziona' }, { label: 'Chi Siamo', path: '/chi-siamo' }].map(l => (
            <a key={l.label} href={l.path}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: C.muted, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = C.primary}
              onMouseLeave={e => e.target.style.color = C.muted}>{l.label}</a>
          ))}
          <button onClick={() => navigate('/admin/login')}
            style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 50, padding: '8px 22px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', color: C.text, transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >Accedi</button>
          <button onClick={() => navigate('/admin/login')}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 50, padding: '10px 26px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 16px ${C.primary}40`, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primaryD; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
          >Crea la tua Box <ArrowRight size={16} /></button>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.text }}
          className="lnav-mobile-btn">
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {/* Mobile menu (Floating Island) */}
      <div style={{
        position: 'fixed', top: 76, left: 24, right: 24, zIndex: 998,
        background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(16px)',
        borderRadius: 24, padding: '24px', border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '0 20px 48px rgba(0,0,0,0.12)',
        transform: menuOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.96)',
        opacity: menuOpen ? 1 : 0,
        visibility: menuOpen ? 'visible' : 'hidden',
        pointerEvents: menuOpen ? 'auto' : 'none',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transformOrigin: 'top center',
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          {[{ label: 'Funzionalità', path: '#funzionalità' }, { label: 'Come Funziona', path: '#come-funziona' }, { label: 'Chi Siamo', path: '/chi-siamo' }].map((item) => (
            <a key={item.label} href={item.path} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: C.text, fontSize: '1.25rem', fontWeight: 800, padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)' }}>
              {item.label} <ChevronRight size={18} color={C.muted} />
            </a>
          ))}
        </nav>
        <button onClick={() => { setMenuOpen(false); navigate('/admin/login'); }}
          style={{
            background: C.primary, color: 'white', border: 'none', borderRadius: 50,
            padding: '14px', fontWeight: 700, cursor: 'pointer', fontSize: '1.05rem',
            marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
          Crea la tua Box <ArrowRight size={16} />
        </button>
      </div>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        background: `linear-gradient(175deg, ${C.bg} 0%, white 60%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '8%', right: '8%', width: 320, height: 320, borderRadius: '50%', border: `1.5px solid ${C.primaryBorder}`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '12%', right: '12%', width: 200, height: 200, borderRadius: '50%', border: `1.5px solid ${C.primaryBorder}`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: 260, height: 260, borderRadius: '50%', border: `1.5px solid ${C.primaryBorder}`, opacity: 0.25, pointerEvents: 'none' }} />


        <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.25rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 28, maxWidth: 820, color: C.text }}>
          La voce di ogni studente,<br />
          <span style={{ color: C.primary }}>finalmente ascoltata.</span>
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: C.muted, maxWidth: 580, lineHeight: 1.75, marginBottom: 48, fontWeight: 400 }}>
          Dillo Qui è uno sportello di ascolto digitale pensato per i <strong style={{ color: C.text }}>rappresentanti d'istituto e di classe</strong>.
          Offre uno spazio sicuro per segnalazioni anonime, dialogo diretto e risoluzione efficace dei problemi.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/admin/login')}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 50, padding: '16px 38px', fontWeight: 700, cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 28px ${C.primary}40`, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = C.primaryD; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = C.primary; }}
          >
            Crea la tua Box <ArrowRight size={19} />
          </button>
          <button
            onClick={() => navigate('/box/demo')}
            style={{ background: 'white', color: C.text, border: `1.5px solid ${C.border}`, borderRadius: 50, padding: '16px 38px', fontWeight: 700, cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            Guarda la Demo <ChevronRight size={19} />
          </button>
        </div>
      </section>


      {/* ── PER CHI È ── */}
      <section id="per-chi-e" style={{ padding: '96px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ display: 'inline-block', background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '4px 16px', fontSize: '0.78rem', fontWeight: 700, color: C.primary, marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Per chi è</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.03em', color: C.text }}>Rappresentanti e scuole</h2>
            </div>
          </AnimatedSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Card Istituti — prima */}
            <AnimatedSection delay={0}>
              <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 20, padding: '32px', background: C.bg, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, color: C.primary, marginBottom: 20 }}>
                    <Building2 size={12} /> Istituti scolastici
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: C.text, marginBottom: 10 }}>Sei un istituto?</h3>
                  <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 24, fontSize: '0.95rem' }}>
                    Dai ai tuoi studenti un canale strutturato e sicuro per esprimersi, senza infrastrutture da gestire.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 23, marginTop: 'auto', marginBottom: 47 }}>
                  {[
                    'Canale d\'ascolto ufficiale e strutturato',
                    'Nessuna infrastruttura da gestire',
                    'Scalabilità su più classi',
                    'Adozione semplice per tutta la scuola',
                  ].map(t => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={16} color={C.primary} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.92rem', color: '#374151', fontWeight: 500 }}>{t}</span>
                    </div>
                  ))}
                </div>

                {/* Box info per pareggiare il gap */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                  <div style={{
                    background: 'white', borderRadius: 14, padding: '16px 18px', border: `1px solid ${C.border}`,
                    display: 'flex', gap: 14, alignItems: 'flex-start'
                  }}>
                    <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: C.primaryL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={18} color={C.primary} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: C.text, marginBottom: 4 }}>
                        Subito operativo
                      </div>
                      <p style={{ color: C.muted, fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>
                        Affida la gestione direttamente ai rappresentanti eletti. Non serve il coinvolgimento del team IT della scuola.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Card Rappresentanti — con tab ruoli integrati */}
            <AnimatedSection delay={100}>
              <div style={{ border: `2px solid ${C.primary}`, borderRadius: 20, padding: '32px', background: 'white', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, color: C.primary, marginBottom: 20 }}>
                    <Megaphone size={12} /> Rappresentanti
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: C.text, marginBottom: 10 }}>Sei un rappresentante?</h3>
                  <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 20, fontSize: '0.95rem' }}>
                    Hai finalmente uno strumento concreto per raccogliere i feedback della tua classe o del tuo istituto.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {[
                      'Box dedicata alla tua classe o istituto',
                      'Tutte le segnalazioni in un posto solo',
                      'Porta dati concreti',
                      'Rispondi ai tuoi compagni in modo riservato',
                    ].map(t => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={16} color={C.primary} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.92rem', color: '#374151', fontWeight: 500 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tab selector ruoli */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 'auto' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Che tipo di rappresentante sei?</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[
                      { id: 'classe', label: 'Di Classe', icon: Users },
                      { id: 'istituto', label: 'D\'Istituto', icon: Landmark },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setRuolo(id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.18s',
                          background: ruolo === id ? C.primary : C.primaryL,
                          color: ruolo === id ? 'white' : C.primary,
                          boxShadow: ruolo === id ? `0 3px 10px ${C.primary}35` : 'none',
                        }}
                      >
                        <Icon size={13} />{label}
                      </button>
                    ))}
                  </div>

                  {/* Dettaglio ruolo selezionato */}
                  <div style={{
                    background: C.primaryL, borderRadius: 14, padding: '16px 18px',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ruolo === 'classe'
                        ? <Users size={18} color="white" />
                        : <Landmark size={18} color="white" />
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: C.text, marginBottom: 4 }}>
                        {ruolo === 'classe' ? 'Rappresentante di Classe' : 'Rappresentante d\'Istituto'}
                      </div>
                      <p style={{ color: C.muted, fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>
                        {ruolo === 'classe'
                          ? 'Crea una box limitata alla tua classe. I tuoi compagni segnalano e tu ascolti, pronto per essere riportato ai professori e al Dirigente.'
                          : 'Apri una box d\'istituto. Raccogli le segnalazioni di tutti gli studenti e portale durante assemblee, consigli o incontri dedicati.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>


      <section id="funzionalità" style={{ padding: '96px 24px', background: C.bg }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <div style={{ display: 'inline-block', background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '4px 16px', fontSize: '0.78rem', fontWeight: 700, color: C.primary, marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Funzionalità</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 700, letterSpacing: '-0.03em', color: C.text, marginBottom: 14 }}>
                Uno strumento <strong style={{ color: '#2b7147ff', fontWeight: 900 }}>per studenti</strong> creato <strong style={{ color: '#0fa541ff', fontWeight: 900 }}>da studenti</strong>
              </h2>
              <p style={{ color: C.muted, fontSize: '1.05rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>Costruito per la realtà scolastica italiana, nato non da un’azienda ma dall'esperienza diretta di chi vive la scuola ogni giorno.
              </p>
            </div>
          </AnimatedSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 22 }}>
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 70}>
                <div style={{
                  background: 'white', borderRadius: 18, padding: '28px 28px 32px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`,
                  transition: 'transform 0.22s, box-shadow 0.22s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                    <f.icon size={24} color={f.color} />
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 8, color: C.text }}>{f.title}</h3>
                  <p style={{ color: C.muted, lineHeight: 1.7, fontSize: '0.92rem', margin: 0 }}>{f.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="come-funziona" style={{ padding: '96px 24px', background: 'white' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 68 }}>
              <div style={{ display: 'inline-block', background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '4px 16px', fontSize: '0.78rem', fontWeight: 700, color: C.primary, marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Come Funziona</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.03em', color: C.text }}>Da zero a operativo, in pochi passi</h2>
            </div>
          </AnimatedSection>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {steps.map((s, i) => (
              <AnimatedSection key={s.n} delay={i * 110}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                  <div style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 18, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${C.primary}30` }}>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em' }}>{s.n}</span>
                  </div>
                  <div style={{ paddingTop: 6 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 8, color: C.text }}>{s.title}</h3>
                    <p style={{ color: C.muted, lineHeight: 1.72, margin: 0, fontSize: '0.98rem', maxWidth: 580 }}>{s.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section style={{ padding: '96px 24px', background: 'white', textAlign: 'center' }}>
        <AnimatedSection>
          <div style={{ maxWidth: 660, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primaryL, border: `1px solid ${C.primaryBorder}`, borderRadius: 50, padding: '6px 16px', marginBottom: 28, fontSize: '0.82rem', fontWeight: 700, color: C.primary }}>
              <Eye size={13} /> Facile da attivare, semplice da usare
            </div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: C.text, marginBottom: 18 }}>
              Sei il rappresentante?<br />Allora hai uno strumento in più.
            </h2>
            <p style={{ color: C.muted, fontSize: '1.1rem', lineHeight: 1.72, marginBottom: 44 }}>
              Crea la box, condividi il link ai tuoi compagni e inizia ad ascoltare. Non ti chiediamo nulla di tecnico.
            </p>
            <button
              onClick={() => navigate('/admin/login')}
              style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 50, padding: '18px 50px', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: 12, boxShadow: `0 8px 28px ${C.primary}40`, transition: 'all 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = C.primaryD; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = C.primary; }}
            >
              Crea la tua Box <ArrowRight size={22} />
            </button>
          </div>
        </AnimatedSection>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: C.primary, color: 'rgba(255,255,255,0.55)', padding: '48px 24px 36px', textAlign: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: '1.35rem', marginBottom: 16, letterSpacing: '-0.03em' }}>
          <span style={{ color: 'white' }}>Dillo</span><span style={{ color: '#a7f3d0' }}>Qui</span>
        </div>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Privacy Policy', 'Termini di Servizio', 'Cookie Policy', 'Contatti'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'white'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
            >
              {l}
            </a>
          ))}
        </div>

        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />

        <p style={{ margin: '0 0 6px', fontSize: '0.88rem' }}>Progetto Marilli — Hackathon 2026</p>
        <p style={{ margin: 0, fontSize: '0.82rem' }}>© 2026 DilloQui. Tutti i diritti riservati.</p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .lnav-desktop { display: none !important; }
          .lnav-mobile-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
