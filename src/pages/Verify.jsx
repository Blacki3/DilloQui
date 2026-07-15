import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestCode, verifyCode } from '../services/api';
import { getSettings, normalizeEmail, normalizeSlug } from '../services/mockSettings';
import { getStudentProfile, saveStudentProfile } from '../services/mockProfiles';
import BrandWordmark from '../components/BrandWordmark';
import { Mail, ShieldCheck, AlertCircle, CheckCircle, ArrowRight, Check } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Email' },
  { n: 2, label: 'Codice' },
  { n: 3, label: 'Profilo' },
];

export default function Verify({ slug }) {
  // Preload del bundle principale in background mentre l'utente è in questa pagina
  useEffect(() => {
    import('../bundles/AppBundle');
  }, []);

  const existingProfile = getStudentProfile();
  const [email, setEmail] = useState(() => {
    return localStorage.getItem(`dq_verify_email_${slug}`) || (slug === 'demo' ? 'mail@nomescuola.edu.it' : existingProfile.email || '');
  });
  const [otpDigits, setOtpDigits] = useState(slug === 'demo' ? ['1', '2', '3', '4', '5', '6'] : ['', '', '', '', '', '']);
  const [step, setStep] = useState(() => {
    return parseInt(localStorage.getItem(`dq_verify_step_${slug}`)) || 1;
  });

  useEffect(() => {
    localStorage.setItem(`dq_verify_step_${slug}`, step.toString());
  }, [step, slug]);

  useEffect(() => {
    if (email) localStorage.setItem(`dq_verify_email_${slug}`, email);
  }, [email, slug]);
  const [nome, setNome] = useState(existingProfile.nome || (slug === 'demo' ? 'Mario' : ''));
  const [cognome, setCognome] = useState(existingProfile.cognome || (slug === 'demo' ? 'Rossi' : ''));
  const [classe, setClasse] = useState(existingProfile.classe || (slug === 'demo' ? '3B' : ''));
  const [loading, setLoading] = useState(false);
  const settings = getSettings();
  const isClassRequired = settings.requireClass;
  const [msg, setMsg] = useState({ text: '', isSuccess: false });
  const { loginStudent } = useAuth();
  const inputRefs = useRef([]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail) { setMsg({ text: 'Inserisci la tua email', isSuccess: false }); return; }
    setLoading(true);
    try {
      const res = await requestCode(trimmedEmail, slug);
      setMsg({ text: res.message, isSuccess: res.success });
      if (res.success) {
        setEmail(trimmedEmail);
        setStep(2);
      }
    } catch { setMsg({ text: 'Errore di rete', isSuccess: false }); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) { setMsg({ text: 'Inserisci tutte e 6 le cifre', isSuccess: false }); return; }
    setLoading(true);
    try {
      const res = await verifyCode(email, code, slug);
      if (res.success) {
        setMsg({ text: 'Codice corretto!', isSuccess: true });
        setStep(3);
      } else {
        setMsg({ text: res.message, isSuccess: false });
      }
    } catch { setMsg({ text: 'Errore di rete', isSuccess: false }); }
    finally { setLoading(false); }
  };

  return (
    <div className="app-container">
      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Wordmark sopra la card */}
        <div className="auth-wordmark">
          <BrandWordmark />
        </div>

        <div className="verify-card">

          {/* Step indicator */}
          <div className="auth-steps">
            {STEPS.map((s, i) => (
              <>
                <div key={s.n} className={`auth-step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                  <div className="auth-step-circle">
                    {step > s.n ? <Check size={14} strokeWidth={3} /> : s.n}
                  </div>
                  <span className="auth-step-label">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div key={`line-${s.n}`} className={`auth-step-line ${step > s.n ? 'done' : ''}`} />
                )}
              </>
            ))}
          </div>

          {/* Icona + Slug pill */}
          <div className="verify-logo">
            <div style={{
              width: 60, height: 60, background: 'var(--b-yellow)',
              border: 'var(--b-border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: 'var(--b-shadow)',
            }}>
              <ShieldCheck size={30} color="var(--b-black)" strokeWidth={2.5} />
            </div>
          </div>

          <div className="slug-pill" style={{ marginBottom: 20 }}>
            <span style={{ color: 'var(--b-gray)' }}>dilloqui.app/box/</span>
            <span style={{ color: 'var(--b-black)', fontWeight: 800 }}>{slug?.toLowerCase()}</span>
          </div>

          {step === 1 && (
            <>
              <h2 style={{ marginBottom: 6 }}>Accedi allo Sportello</h2>
              <p className="verify-slug">Inserisci la tua email scolastica per ricevere il codice di accesso</p>

              <form onSubmit={handleSendCode}>
                <div className="email-input-wrapper">
                  <Mail size={18} strokeWidth={2.5} />
                  <div className="divider" />
                  <input
                    type="email"
                    placeholder="nome.cognome@scuola.edu.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    id="verify-email-input"
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} id="verify-send-btn">
                  {loading ? 'Invio in corso...' : <>Invia Codice OTP <ArrowRight size={16} strokeWidth={3} /></>}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ marginBottom: 6 }}>Inserisci il Codice</h2>
              <p className="verify-slug">
                Inviato a <strong style={{ color: 'var(--b-black)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.88rem' }}>{email}</strong>
              </p>

              <form onSubmit={handleVerify}>
                <div className="otp-inputs">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      placeholder="·"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      id={`otp-digit-${i}`}
                    />
                  ))}
                </div>

                <button type="submit" className="btn-primary" disabled={loading} id="verify-otp-btn">
                  {loading ? 'Verifica...' : <>Verifica Codice <ArrowRight size={16} strokeWidth={3} /></>}
                </button>
              </form>

              <button
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--b-gray)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'underline', marginTop: 12, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ← Cambia email
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 6 }}>Completa il Profilo</h2>
              <p className="verify-slug">Dicci chi sei prima di iniziare</p>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!nome.trim() || !cognome.trim() || (isClassRequired && !classe.trim())) {
                  setMsg({ text: 'Compila tutti i campi obbligatori', isSuccess: false });
                  return;
                }
                const normalizedSlug = normalizeSlug(slug) || 'demo';
                saveStudentProfile({
                  ...existingProfile,
                  email: normalizeEmail(email),
                  nome: nome.trim(),
                  cognome: cognome.trim(),
                  classe: isClassRequired ? classe.trim() : '',
                });
                setMsg({ text: 'Profilo completato! Accesso in corso...', isSuccess: true });
                localStorage.removeItem(`dq_verify_step_${slug}`);
                localStorage.removeItem(`dq_verify_email_${slug}`);
                setTimeout(() => loginStudent(`mock-session-${normalizedSlug}-${Date.now()}`), 600);
              }}>
                <div style={{ display: 'flex', gap: 10, textAlign: 'left' }}>
                  <div style={{ flex: 1 }}>
                    <label>Nome</label>
                    <input placeholder="Mario" value={nome} onChange={(e) => setNome(e.target.value)} required id="verify-nome" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Cognome</label>
                    <input placeholder="Rossi" value={cognome} onChange={(e) => setCognome(e.target.value)} required id="verify-cognome" />
                  </div>
                </div>
                {isClassRequired && (
                  <>
                    <label style={{ textAlign: 'left', display: 'block' }}>Classe</label>
                    <input placeholder="Es. 3B" value={classe} onChange={(e) => setClasse(e.target.value)} required id="verify-classe" />
                  </>
                )}
                <button type="submit" className="btn-primary" style={{ marginTop: 8 }} id="verify-complete-btn">
                  Entra nello Sportello →
                </button>
              </form>
            </>
          )}

          {msg.text && (
            <div className={`msg ${msg.isSuccess ? 'success' : 'error'}`} style={{ marginTop: 14 }}>
              {msg.isSuccess ? <CheckCircle size={16} strokeWidth={2.5} /> : <AlertCircle size={16} strokeWidth={2.5} />}
              {msg.text}
            </div>
          )}

          <div className="verify-footer">
            Non hai ancora uno spazio DILLOQUI?{' '}
            {slug === 'demo' ? (
              <span
                style={{ cursor: 'not-allowed', color: 'var(--b-gray)', textDecoration: 'line-through' }}
                title="Funzione disabilitata in questa demo"
              >
                Registrati
              </span>
            ) : (
              <a href="/admin/login">Registrati</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
