import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap, CheckCircle2, ArrowRight,
  Users, Landmark, Building2, Clock,
  Link as LinkIcon, Tags, Library, Megaphone, Eye
} from 'lucide-react';
import BrandWordmark from '../components/BrandWordmark';

const IncognitoIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 13l2-7h12l2 7" />
    <path d="M2 13h20" />
    <circle cx="7" cy="18" r="3" />
    <circle cx="17" cy="18" r="3" />
    <path d="M10 18h4" />
  </svg>
);

const BookStackIcon = ({ size = 24 }) => (
  <Library size={size} strokeWidth={2} />
);

const features = [
  { icon: IncognitoIcon, tone: 'yellow', title: 'SEGNALAZIONI ANONIME', desc: 'Gli studenti segnalano senza paura. Risposte più oneste, sempre.' },
  { icon: LinkIcon, tone: 'blue', title: 'UN LINK, TUTTO DENTRO', desc: 'Nessuna app da scaricare. Basta condividere il link della box.' },
  { icon: Users, tone: 'orange', title: 'PER CLASSE O ISTITUTO', desc: 'Funziona per il singolo rappresentante di classe e per quello d\'istituto.' },
  { icon: Zap, tone: 'yellow', title: 'PRONTO IN 5 MINUTI', desc: 'Registrazione, configurazione e link condiviso: tutto in meno di 5 minuti.' },
  { icon: Tags, tone: 'blue', title: 'CATEGORIE PERSONALIZZATE', desc: 'Organizza le segnalazioni per argomento — didattica, strutture, clima.' },
  { icon: BookStackIcon, tone: 'black', title: 'PENSATO PER LE SCUOLE', desc: 'Non è uno strumento generico, è pensato appositamente per la scuola.' },
];

const steps = [
  { n: '01', title: 'Crei lo Sportello', desc: 'Ti registri, scegli il nome della box e ottieni un link unico da condividere.', tone: 'yellow' },
  { n: '02', title: 'Condividi il Link', desc: 'Inserisci il link nel gruppo classe, sul registro o nella bacheca virtuale.', tone: 'orange' },
  { n: '03', title: 'I Compagni Segnalano', desc: 'Chiunque abbia una email scolastica abilitata accede con OTP e segnala.', tone: 'blue' },
  { n: '04', title: 'Rispondi e Agisci', desc: 'Gestisci le segnalazioni dal pannello, rispondi in privato e segni cosa è stato risolto.', tone: 'black' },
];

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ruolo, setRuolo] = useState('classe');

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (!target) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  }, [location.state]);

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-grid" />
        <div className="landing-hero-accent top" />
        <div className="landing-hero-accent bottom" />

        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            LA VOCE DI<br />
            <span className="landing-accent-yellow">OGNI STUDENTE</span><br />
            FINALMENTE<br />
            <span style={{ color: '#000' }} className="landing-highlight">ASCOLTATA.</span>
          </h1>

          <p className="landing-hero-subtitle">
            Non tutti hanno il coraggio di farsi ascoltare. DILLOQUI permette a ogni studente di segnalare disagi e problemi in modo sicuro e anonimo. La base perfetta per costruire una scuola basata sulle <span className="landing-accent-yellow">necessità reali.</span>
          </p>

          <div className="landing-hero-cta">
            <button onClick={() => navigate('/admin/login')} className="landing-btn-primary" id="hero-cta-primary">
              Crea la tua Box <ArrowRight size={18} strokeWidth={3} />
            </button>
            <button onClick={() => navigate('/box/demo')} className="landing-btn-ghost" id="hero-cta-demo">
              Guarda la Demo →
            </button>
          </div>
        </div>
      </section>


      <section id="per-chi-e" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-head">
            <div className="section-label">Per chi è</div>
            <h2 className="landing-title">
              Non è il solito<br /><span className="landing-highlight">sondaggio.</span>
            </h2>
          </div>

          <div className="landing-grid-two">
            <div className="landing-card">
              <div className="landing-card-header">
                <div className="landing-mini-badge landing-mini-badge-light">
                  <Building2 size={12} strokeWidth={3} /> Istituti Scolastici
                </div>
                <h3 className="landing-card-title">Sei un istituto?</h3>
                <p className="landing-card-copy">
                  Dai ai tuoi studenti un canale strutturato e sicuro per esprimersi, senza infrastrutture da gestire
                </p>
              </div>

              <div className="landing-check-list left-card-list">
                {[
                  'Spazio d\'ascolto ufficiale',
                  'Zero stress per i tecnici della scuola',
                  'Privacy e anonimato blindati',
                  'Scalabilità su più classi',
                ].map((t) => (
                  <div key={t} className="landing-check-item">
                    <div className="landing-check-icon">
                      <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="landing-info-box-wrap">
                <div className="landing-info-box">
                  <div className="landing-info-icon">
                    <Clock size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="landing-info-title">Subito operativo</div>
                    <p className="landing-info-copy">
                      Affida la gestione ai rappresentanti eletti. Non serve il team IT.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-card landing-card-accent">
              <div className="landing-card-header">
                <div className="landing-mini-badge landing-mini-badge-dark">
                  <Megaphone size={12} strokeWidth={3} /> Rappresentanti
                </div>
                <h3 className="landing-card-title">Sei un rappresentante?</h3>
                <p className="landing-card-copy-dark">
                  Hai finalmente uno strumento concreto per raccogliere i feedback della tua classe o del tuo istituto.
                </p>
              </div>
              <div className="landing-check-list">
                {[
                  'Box dedicata alla tua classe o istituto',
                  'Rispondi in privato e in anonimo',
                  'Fatti prendere sul serio ai Consigli',
                  'Decidi tu le categorie dei problemi',
                ].map((t) => (
                  <div key={t} className="landing-check-item">
                    <div className="landing-check-icon dark">
                      <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              <div className="landing-info-box-wrap">
                <p className="landing-tab-label">Che tipo di rappresentante sei?</p>
                <div className="landing-tab-list">
                  {[
                    { id: 'classe', label: 'Di Classe', icon: Users },
                    { id: 'istituto', label: 'D\'Istituto', icon: Landmark },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setRuolo(id)}
                      className={`landing-tab-btn ${ruolo === id ? 'active' : ''}`}
                    >
                      <Icon size={12} strokeWidth={3} />{label}
                    </button>
                  ))}
                </div>
                <div className="landing-role-box">
                  <AnimatePresence mode="wait">
                    <motion.div
                      className="landing-role-inner"
                      key={ruolo}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}
                    >
                      <div className="landing-role-icon">
                        {ruolo === 'classe' ? <Users size={16} strokeWidth={2.5} /> : <Landmark size={16} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <div className="landing-role-title">
                          {ruolo === 'classe' ? 'RAPPRESENTANTE DI CLASSE' : "RAPPRESENTANTE D'ISTITUTO"}
                        </div>
                        <p className="landing-role-copy">
                          {ruolo === 'classe'
                            ? 'Crea una box limitata alla tua classe. I tuoi compagni segnalano e tu ascolti, pronto per riportarlo ai prof e al Dirigente.'
                            : 'Apri una box d\'istituto. Raccogli le segnalazioni di tutti gli studenti per assemblee e consigli.'
                          }
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="funzionalita" className="landing-section landing-section-white bordered">
        <div className="landing-container landing-container-wide">
          <div className="landing-section-head center">
            <div className="section-label">Funzionalità</div>
            <h2 className="landing-title center">
              Uno strumento <span className="landing-highlight">per studenti</span>{' '}
              creato <span className="landing-highlight-blue">da studenti</span>
            </h2>
          </div>

          <div className="landing-feature-grid">
            {features.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <div className={`landing-feature-icon ${f.tone}`}>
                  <f.icon size={24} strokeWidth={2} />
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-copy">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="come-funziona" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-head">
            <div className="section-label">Come Funziona</div>
            <h2 className="landing-title">
              Da zero a operativo,<br /><span className="landing-highlight-dark">in pochi passi.</span>
            </h2>
          </div>

          <div className="landing-steps">
            {steps.map((s, i) => (
              <div key={s.n} className={`landing-step ${i < steps.length - 1 ? 'with-divider' : ''}`}>
                <div className={`landing-step-number ${s.tone}`}>
                  <span>{s.n}</span>
                </div>
                <div className="landing-step-content">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="landing-final-cta">
        <div className="landing-container center">

          <h2 className="landing-final-title">
            SEI IL RAPPRESENTANTE?<br />ALLORA HAI UNO<br /><span className="landing-highlight-dark">STRUMENTO IN PIÙ.</span>
          </h2>
          <p className="landing-final-copy">
            Non c'è niente da installare Crea la box, condividi il link ai tuoi compagni e inizia ad ascoltare.
          </p>
          <button onClick={() => navigate('/admin/login')} className="landing-final-btn" id="cta-crea-box">
            Apri la tua Box ORA <ArrowRight size={22} strokeWidth={3} />
          </button>
        </div>
      </section>


      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <BrandWordmark variant="inverted" />
        </div>
        <div className="landing-footer-links">
          {['Privacy Policy', 'Termini di Servizio', 'Cookie Policy', 'Contatti'].map((l, i) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="landing-footer-link"
              style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.25)' : 'none' }}
            >
              {l}
            </a>
          ))}
        </div>
        <div className="landing-footer-divider" />

        <p className="landing-footer-copy small">
          © 2026 DILLOQUI. Tutti i diritti riservati.
        </p>
      </footer>
    </div>
  );
}
