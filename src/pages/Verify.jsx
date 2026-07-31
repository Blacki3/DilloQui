import { useState, useRef, useEffect, Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../utils/friendlyError';
import { getBox, getMyProfile, checkEmailAllowed } from '../services/db';
// Mock (solo per slug === 'demo')
import { getSettings, normalizeEmail, normalizeSlug } from '../services/mockSettings';
import { getStudentProfile, saveStudentProfile } from '../services/mockProfiles';
import { requestCode, verifyCode } from '../services/api';

import BrandWordmark from '../components/BrandWordmark';
import { Mail, ShieldCheck, AlertCircle, CheckCircle, ArrowRight, Check } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Email' },
  { n: 2, label: 'Codice' },
  { n: 3, label: 'Profilo' },
];

export default function Verify({ slug }) {
  // Preload del bundle principale in background
  useEffect(() => { import('../bundles/AppBundle'); }, []);

  const isDemo = slug === 'demo';
  const { loginStudent, sendStudentOtp, verifyStudentOtp, completeStudentProfile, logoutReal } = useAuth();

  // ─── Stato comune ───────────────────────────────────────────────────────
  const existingProfile = isDemo ? getStudentProfile() : {};
  const [email, setEmail] = useState(() =>
    localStorage.getItem(`dq_verify_email_${slug}`) ||
    (isDemo ? 'mail@nomescuola.edu.it' : existingProfile.email || '')
  );
  const [otpDigits, setOtpDigits] = useState(isDemo ? ['1', '2', '3', '4', '5', '6'] : ['', '', '', '', '', '']);
  const [step, setStep] = useState(() => parseInt(localStorage.getItem(`dq_verify_step_${slug}`)) || 1);
  const [nome, setNome] = useState(existingProfile.nome || (isDemo ? 'Mario' : ''));
  const [cognome, setCognome] = useState(existingProfile.cognome || (isDemo ? 'Rossi' : ''));
  const [classe, setClasse] = useState(existingProfile.classe || (isDemo ? '3B' : ''));
  const [loading, setLoading] = useState(false);
  const [boxState, setBoxState] = useState(isDemo ? 'found' : 'checking'); // 'checking' | 'found' | 'not_found'
  const [isClassRequired, setIsClassRequired] = useState(isDemo ? getSettings().requireClass : false);
  const [msg, setMsg] = useState({ text: '', isSuccess: false });
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  const emptyOtp = () => (isDemo ? ['1', '2', '3', '4', '5', '6'] : ['', '', '', '', '', '']);
  const clearOtp = () => setOtpDigits(emptyOtp());

  const goToStep = (n) => {
    // Tornando indietro (o ripartendo dall'email) azzera il codice:
    // altrimenti resta in memoria React e ricompare al passo 2.
    if (n < step || n === 1) clearOtp();
    setStep(n);
  };

  // Cooldown reinvio OTP
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const startResendCooldown = () => setResendCooldown(30);

  // Persiste lo step e l'email nel localStorage
  useEffect(() => { localStorage.setItem(`dq_verify_step_${slug}`, step.toString()); }, [step, slug]);
  useEffect(() => { if (email) localStorage.setItem(`dq_verify_email_${slug}`, email); }, [email, slug]);

  // Precompila il codice se si arriva dal bottone dell'email (?code=123456)
  useEffect(() => {
    if (isDemo) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && /^\d{6}$/.test(code)) {
      setOtpDigits(code.split(''));
      // Passa direttamente al passo 2 solo se conosciamo già l'email
      // (stesso dispositivo da cui è stata richiesta). Altrimenti l'utente
      // inserisce l'email al passo 1 e trova il codice già compilato.
      const storedEmail = localStorage.getItem(`dq_verify_email_${slug}`);
      if (storedEmail) {
        setEmail(storedEmail);
        setStep(2);
        setMsg({ text: 'Codice inserito dall\'email: premi Verifica.', isSuccess: true });
      }
      // Rimuove il codice dall'URL (niente codici nella cronologia)
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Controlla se la box esiste nel DB Supabase (solo se non è la demo)
  useEffect(() => {
    if (isDemo) {
      setBoxState('found');
      return;
    }
    setBoxState('checking');
    getBox(slug)
      .then(box => {
        if (box) {
          setBoxState('found');
          setIsClassRequired(box.require_class);
        } else {
          setBoxState('not_found');
        }
      })
      .catch(err => {
        console.error('Errore getBox:', err);
        setBoxState('not_found');
      });
  }, [slug, isDemo]);

  // ─── OTP Handlers ──────────────────────────────────────────────────────

  const handleSendCode = async (e) => {
    e.preventDefault();
    const trimmedEmail = isDemo ? normalizeEmail(email) : email.trim().toLowerCase();
    if (!trimmedEmail) { setMsg({ text: 'Inserisci la tua email', isSuccess: false }); return; }
    setLoading(true);
    try {
      if (isDemo) {
        // DEMO: usa mock api
        const res = await requestCode(trimmedEmail, slug);
        setMsg({ text: res.message, isSuccess: res.success });
        if (res.success) { setEmail(trimmedEmail); clearOtp(); startResendCooldown(); setStep(2); }
      } else {
        // REALE: controlla whitelist via RPC (non espone la lista al client)
        const box = await getBox(slug);
        if (!box) { setMsg({ text: 'Box non trovata. Verifica il link.', isSuccess: false }); return; }

        const allowed = await checkEmailAllowed(slug, trimmedEmail);
        if (!allowed) {
          setMsg({ text: 'Email non autorizzata per questa Box.', isSuccess: false });
          return;
        }

        await sendStudentOtp(trimmedEmail, slug, box.name || slug);
        setEmail(trimmedEmail);
        setMsg({ text: `Codice inviato a ${trimmedEmail}`, isSuccess: true });
        clearOtp();
        startResendCooldown();
        setStep(2);
      }
    } catch (err) {
      console.error('Invio OTP:', err);
      setMsg({ text: friendlyError(err, 'Non siamo riusciti a inviarti il codice. Riprova più tardi o contattaci.'), isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading || !email) return;
    setLoading(true);
    try {
      if (isDemo) {
        const res = await requestCode(email, slug);
        setMsg({ text: res.message || 'Codice reinviato (demo).', isSuccess: res.success });
        if (res.success) {
          clearOtp();
          startResendCooldown();
        }
      } else {
        const box = await getBox(slug);
        if (!box) {
          setMsg({ text: 'Box non trovata. Verifica il link.', isSuccess: false });
          return;
        }
        await sendStudentOtp(email, slug, box.name || slug);
        setMsg({ text: `Nuovo codice inviato a ${email}`, isSuccess: true });
        clearOtp();
        startResendCooldown();
      }
    } catch (err) {
      console.error('Reinvio OTP:', err);
      setMsg({ text: friendlyError(err, 'Non siamo riusciti a reinviarti il codice. Riprova tra poco.'), isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const fillOtpFromString = (raw) => {
    const cleaned = String(raw || '').replace(/\D/g, '').slice(0, 6);
    if (!cleaned) return false;
    const next = ['', '', '', '', '', ''];
    cleaned.split('').forEach((d, i) => { next[i] = d; });
    setOtpDigits(next);
    inputRefs.current[Math.min(cleaned.length, 5)]?.focus();
    return true;
  };

  const handleOtpChange = (index, value) => {
    // Senza maxLength=1: paste e autofill possono arrivare come stringa lunga
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      fillOtpFromString(cleaned);
      return;
    }
    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Incolla dell'intero codice (anche con spazi, es. "4 2 9 5 1 7")
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') || '';
    fillOtpFromString(pasted);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) { setMsg({ text: 'Inserisci tutte e 6 le cifre', isSuccess: false }); return; }
    setLoading(true);
    try {
      if (isDemo) {
        // DEMO: usa mock api
        const res = await verifyCode(email, code, slug);
        if (res.success) { setMsg({ text: 'Codice corretto!', isSuccess: true }); setStep(3); }
        else setMsg({ text: res.message, isSuccess: false });
      } else {
        // REALE: verifica OTP con Supabase
        await verifyStudentOtp(email, code);

        // ── Separazione account: la box NON si naviga con l'account admin ──
        const prof = await getMyProfile();
        if (prof?.role === 'admin') {
          await logoutReal();
          clearOtp();
          setMsg({ text: 'Questa email appartiene a un account amministratore. Per accedere allo sportello come studente usa un\'altra email.', isSuccess: false });
          setStep(1);
          return;
        }
        // Uno studente non può "saltare" in una box diversa dalla sua
        if (prof?.box_slug && prof.box_slug !== slug) {
          await logoutReal();
          clearOtp();
          setMsg({ text: 'Questa email è già registrata in un altro sportello.', isSuccess: false });
          setStep(1);
          return;
        }

        // Studente già completo per questa box: salta passo 3.
        // verifyStudentOtp ha già refreshato il profilo nel context →
        // BoxVerifyFlow reindirizza al forum (stesso gate: nome + box_slug).
        if (prof?.nome && prof.box_slug === slug) {
          localStorage.removeItem(`dq_verify_step_${slug}`);
          localStorage.removeItem(`dq_verify_email_${slug}`);
          setMsg({ text: 'Accesso in corso...', isSuccess: true });
          return;
        }

        setMsg({ text: 'Codice corretto!', isSuccess: true });
        setStep(3);
      }
    } catch (err) {
      console.error('Verifica OTP:', err);
      setMsg({ text: friendlyError(err, 'Codice errato o scaduto'), isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim() || (isClassRequired && !classe.trim())) {
      setMsg({ text: 'Compila tutti i campi obbligatori', isSuccess: false });
      return;
    }
    setLoading(true);
    try {
      if (isDemo) {
        // DEMO: salva profilo in localStorage e token mock
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
      } else {
        // REALE: salva profilo su Supabase
        await completeStudentProfile({
          nome: nome.trim(),
          cognome: cognome.trim(),
          classe: isClassRequired ? classe.trim() : '',
          boxSlug: slug,
        });
        setMsg({ text: 'Profilo completato! Accesso in corso...', isSuccess: true });
        localStorage.removeItem(`dq_verify_step_${slug}`);
        localStorage.removeItem(`dq_verify_email_${slug}`);
        // La sessione Supabase è già attiva dopo verifyStudentOtp, il redirect
        // avviene automaticamente tramite BoxVerifyFlow in App.jsx
      }
    } catch (err) {
      setMsg({ text: friendlyError(err, 'Errore nel salvataggio del profilo. Riprova più tardi.'), isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Schermata Caricamento ───────────────────────────────────────
  if (boxState === 'checking') {
    return (
      <div className="app-container">
        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          <div className="auth-wordmark"><BrandWordmark /></div>
          <div className="verify-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: 'var(--b-gray)' }}>⏳ Verifica dello sportello in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Schermata Box Non Trovata (404) ────────────────────────────
  if (boxState === 'not_found') {
    return (
      <div className="app-container">
        <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
          <div className="auth-wordmark">
            <BrandWordmark />
          </div>

          <div className="verify-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            {/* Badge 404 */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--b-red)', color: '#FFFFFF',
              padding: '6px 16px', fontSize: '0.75rem', fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 20, border: '2px solid var(--b-black)',
              boxShadow: 'var(--b-shadow-sm)'
            }}>
              <AlertCircle size={15} strokeWidth={3} />
              404 — Box Non Trovata
            </div>

            <h2 style={{ marginBottom: 10, textTransform: 'uppercase' }}>
              Sportello non trovato
            </h2>

            <p className="verify-slug" style={{ marginBottom: 24, lineHeight: 1.5, fontSize: '0.9rem' }}>
              Lo spazio <strong style={{ color: 'var(--b-black)', fontFamily: "'IBM Plex Mono', monospace" }}>dilloqui.netlify.app/box/{slug}</strong> non esiste o l&apos;indirizzo web inserito non è corretto.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a
                href="/box/demo"
                className="btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  textDecoration: 'none'
                }}
              >
                Prova la Demo Gratuita <ArrowRight size={16} strokeWidth={3} />
              </a>

              <a
                href="/admin/login"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', background: 'var(--b-white)', color: 'var(--b-black)',
                  border: '3px solid var(--b-black)', fontWeight: 800, fontSize: '0.85rem',
                  textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.04em',
                  boxShadow: 'var(--b-shadow-sm)', transition: 'transform 0.1s',
                  fontFamily: "'Space Grotesk', sans-serif"
                }}
              >
                Crea uno Sportello per la tua scuola
              </a>
            </div>

            <div className="verify-footer" style={{ marginTop: 24 }}>
              Verifica di aver digitato correttamente il link fornito dai tuoi rappresentanti.
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <Fragment key={s.n}>
                <div className={`auth-step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                  <div className="auth-step-circle">
                    {step > s.n ? <Check size={14} strokeWidth={3} /> : s.n}
                  </div>
                  <span className="auth-step-label">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`auth-step-line ${step > s.n ? 'done' : ''}`} />
                )}
              </Fragment>
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
            <span style={{ color: 'var(--b-gray)' }}>dilloqui.netlify.app/box/</span>
            <span style={{ color: 'var(--b-black)', fontWeight: 800 }}>{slug?.toLowerCase()}</span>
          </div>

          {/* ── Step 1: Email ── */}
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

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <>
              <h2 style={{ marginBottom: 6 }}>Inserisci il Codice</h2>
              <p className="verify-slug">
                Inviato a <strong style={{ color: 'var(--b-black)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.88rem' }}>{email}</strong>
              </p>
              {isDemo && (
                <p style={{ fontSize: '0.78rem', color: 'var(--b-gray)', marginBottom: 8 }}>
                  (Demo: usa qualsiasi 6 cifre, es. 123456)
                </p>
              )}

              <form onSubmit={handleVerify}>
                <div className="otp-inputs">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="·"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
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
                type="button"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0}
                style={{
                  background: 'none', border: 'none', cursor: resendCooldown > 0 || loading ? 'not-allowed' : 'pointer',
                  color: resendCooldown > 0 ? 'var(--b-gray)' : 'var(--b-black)',
                  fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline', marginTop: 14,
                  fontFamily: "'Space Grotesk', sans-serif", opacity: resendCooldown > 0 || loading ? 0.6 : 1,
                }}
                id="verify-resend-btn"
              >
                {resendCooldown > 0 ? `Reinvia codice tra ${resendCooldown}s` : 'Reinvia codice'}
              </button>

              <button
                onClick={() => goToStep(1)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--b-gray)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'underline', marginTop: 8, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ← Cambia email
              </button>
            </>
          )}

          {/* ── Step 3: Profilo ── */}
          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 6 }}>Completa il Profilo</h2>
              <p className="verify-slug">Dicci chi sei prima di iniziare</p>

              <form onSubmit={handleCompleteProfile}>
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
                <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading} id="verify-complete-btn">
                  {loading ? 'Salvataggio...' : 'Entra nello Sportello →'}
                </button>
              </form>
            </>
          )}

          {msg.text && (
            <div className={`msg ${msg.isSuccess ? 'success' : 'error'}`} style={{ marginTop: 14 }}>
              {msg.isSuccess ? <CheckCircle size={16} strokeWidth={2.5} /> : <AlertCircle size={16} strokeWidth={2.5} />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="verify-footer">
            Non hai ancora uno spazio DILLOQUI?{' '}
            {isDemo ? (
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
