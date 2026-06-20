import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  { icon: IncognitoIcon, tone: 'yellow', title: 'Segnalazioni Anonime', desc: 'Gli studenti segnalano senza paura. Risposte più oneste, sempre.' },
  { icon: LinkIcon, tone: 'blue', title: 'Un Link, Tutto Dentro', desc: 'Nessuna app da scaricare. Basta condividere il link della box.' },
  { icon: Users, tone: 'orange', title: 'Per Classe o Istituto', desc: 'Funziona per il singolo rappresentante di classe e per quello d\'istituto.' },
  { icon: Zap, tone: 'yellow', title: 'Pronto in 5 Minuti', desc: 'Registrazione, configurazione e link condiviso: tutto in meno di 5 minuti.' },
  { icon: Tags, tone: 'blue', title: 'Categorie Personalizzate', desc: 'Organizza le segnalazioni per argomento — didattica, strutture, clima.' },
  { icon: BookStackIcon, tone: 'black', title: 'Pensato per le Scuole', desc: 'Non uno strumento generico: nato per il contesto scolastico italiano.' },
];

const steps = [
  { n: '01', title: 'Crei lo Sportello', desc: 'Ti registri, scegli il nome della box e ottieni un link unico da condividere.', tone: 'yellow' },
  { n: '02', title: 'Condividi il Link', desc: 'Inserisci il link nel gruppo classe, sul registro o nella bacheca virtuale.', tone: 'orange' },
  { n: '03', title: 'I Compagni Segnalano', desc: 'Chiunque abbia una email scolastica accede con OTP e segnala.', tone: 'blue' },
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
            DILLOQUI è lo sportello di ascolto digitale per{' '}
            <span className="landing-accent-yellow">rappresentanti d'istituto e di classe</span>.
            Offre uno spazio sicuro per segnalazioni anonime, dialogo diretto e risoluzione efficace dei problemi.
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
              Rappresentanti &<br /><span className="landing-highlight">Scuole.</span>
            </h2>
          </div>

          <div className="landing-grid-two">
            <div className="landing-card">
              <div className="landing-mini-badge landing-mini-badge-light">
                <Building2 size={12} strokeWidth={3} /> Istituti Scolastici
              </div>
              <h3 className="landing-card-title">Sei un istituto?</h3>
              <p className="landing-card-copy">
                Dai ai tuoi studenti un canale strutturato e sicuro per esprimersi, senza infrastrutture da gestire.
              </p>
              <div className="landing-check-list">
                {[
                  'Canale d\'ascolto ufficiale e strutturato',
                  'Nessuna infrastruttura da gestire',
                  'Scalabilità su più classi',
                  'Adozione semplice per tutta la scuola',
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
                    <Clock size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="landing-info-title">Subito Operativo</div>
                    <p className="landing-info-copy">
                      Affida la gestione ai rappresentanti eletti. Non serve il team IT.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-card landing-card-accent">
              <div className="landing-mini-badge landing-mini-badge-dark">
                <Megaphone size={12} strokeWidth={3} /> Rappresentanti
              </div>
              <h3 className="landing-card-title">Sei un rappresentante?</h3>
              <p className="landing-card-copy-dark">
                Hai finalmente uno strumento concreto per raccogliere i feedback della tua classe o del tuo istituto.
              </p>
              <div className="landing-check-list">
                {[
                  'Box dedicata alla tua classe o istituto',
                  'Tutte le segnalazioni in un posto solo',
                  'Porta dati concreti alle riunioni',
                  'Rispondi ai compagni in modo riservato',
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
                  <div className="landing-role-icon">
                    {ruolo === 'classe' ? <Users size={18} strokeWidth={2.5} /> : <Landmark size={18} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <div className="landing-role-title">
                      {ruolo === 'classe' ? 'Rappresentante di Classe' : 'Rappresentante d\'Istituto'}
                    </div>
                    <p className="landing-role-copy">
                      {ruolo === 'classe'
                        ? 'Crea una box limitata alla tua classe. I tuoi compagni segnalano e tu ascolti, pronto per riportarlo ai prof e al Dirigente.'
                        : 'Apri una box d\'istituto. Raccogli le segnalazioni di tutti gli studenti per assemblee e consigli.'
                      }
                    </p>
                  </div>
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
          <div className="section-label section-label-dark">
            <Eye size={12} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Facile da attivare, semplice da usare
          </div>
          <h2 className="landing-final-title">
            Sei il rappresentante?<br />Allora hai uno<br /><span className="landing-highlight-dark">strumento in più.</span>
          </h2>
          <p className="landing-final-copy">
            Crea la box, condividi il link ai tuoi compagni e inizia ad ascoltare. Non ti chiediamo nulla di tecnico.
          </p>
          <button onClick={() => navigate('/admin/login')} className="landing-final-btn" id="cta-crea-box">
            Crea la tua Box <ArrowRight size={22} strokeWidth={3} />
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
        <p className="landing-footer-copy">
          Progetto Marilli — Hackathon 2026
        </p>
        <p className="landing-footer-copy small">
          © 2026 DILLOQUI. Tutti i diritti riservati.
        </p>
      </footer>
    </div>
  );
}
