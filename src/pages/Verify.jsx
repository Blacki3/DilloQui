import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestCode, verifyCode } from '../services/api';
import { Mail, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';

export default function Verify({ slug }) {
  const [email, setEmail] = useState(slug === 'demo' ? 'mail@nomescuola.edu.it' : '');
  const [otpDigits, setOtpDigits] = useState(slug === 'demo' ? ['1', '2', '3', '4', '5', '6'] : ['', '', '', '', '', '']);
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState(slug === 'demo' ? 'Mario' : '');
  const [cognome, setCognome] = useState(slug === 'demo' ? 'Rossi' : '');
  const [classe, setClasse] = useState(slug === 'demo' ? '3B' : '');
  const [loading, setLoading] = useState(false);
  const isClassRequired = true; // Mock: se l'admin ha attivato l'obbligo classe
  const [msg, setMsg] = useState({ text: '', isSuccess: false });
  const { loginStudent } = useAuth();
  const inputRefs = useRef([]);

  const displaySlugName = slug ? slug.toUpperCase() : 'SCUOLA';

  const handleSendCode = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setMsg({ text: 'Inserisci la tua email', isSuccess: false }); return; }
    setLoading(true);
    try {
      const res = await requestCode(trimmedEmail, slug);
      setMsg({ text: res.message, isSuccess: res.success });
      if (res.success) setStep(2);
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
        // In un app reale: if (res.isFirstLogin) setStep(3); else loginStudent(res.token);
        setStep(3);
      } else {
        setMsg({ text: res.message, isSuccess: false });
      }
    } catch { setMsg({ text: 'Errore di rete', isSuccess: false }); }
    finally { setLoading(false); }
  };

  return (
    <div className="app-container">
      <div className="verify-card">
        
        {/* Logo */}
        <div className="verify-logo">
          <ShieldCheck size={72} color="var(--color-primary)" strokeWidth={1.5} />
        </div>

        {step === 1 ? (
          <>
            <h2>Verifica Accesso</h2>
            {/* Sottodominio visualizzato come pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              background: '#f0f7f0', border: '1.5px solid var(--color-primary-light)',
              borderRadius: 50, padding: '6px 16px', margin: '0 auto 24px',
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              <span style={{ color: 'var(--color-text-muted)' }}>dilloqui.app/box/</span>
              <span style={{ color: 'var(--color-primary)' }}>{slug?.toLowerCase()}</span>
            </div>

            <form onSubmit={handleSendCode}>
              <div className="email-input-wrapper">
                <Mail size={18} />
                <div className="divider" />
                <input
                  type="email"
                  placeholder="es. nome.cognome@scuola.edu.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Invio in corso...' : 'Invia codice OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Inserisci Codice OTP</h2>
            <p className="verify-slug">Codice di verifica inviato a <strong>{email}</strong></p>

            <form onSubmit={handleVerify}>
              <div className="otp-inputs">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Verifica in corso...' : 'Verifica Codice'}
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <div style={{ marginTop: 20 }}>
            <h2>Completa il Profilo</h2>
            <p className="verify-slug">Dicci chi sei prima di iniziare</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if(!nome.trim() || !cognome.trim() || (isClassRequired && !classe.trim())) {
                setMsg({ text: 'Compila tutti i campi obbligatori', isSuccess: false });
                return;
              }
              // Simulazione salvataggio profilo e login
              setMsg({ text: 'Profilo completato! Accesso in corso...', isSuccess: true });
              setTimeout(() => {
                loginStudent('mock-token');
              }, 600);
            }}>
              <div className="email-input-wrapper" style={{ marginBottom: 12 }}>
                <input 
                  placeholder="Nome" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  required 
                />
              </div>
              <div className="email-input-wrapper" style={{ marginBottom: 12 }}>
                <input 
                  placeholder="Cognome" 
                  value={cognome} 
                  onChange={(e) => setCognome(e.target.value)} 
                  required 
                />
              </div>
              {isClassRequired && (
                <div className="email-input-wrapper" style={{ marginBottom: 12 }}>
                  <input 
                    placeholder="Classe (es. 3B)" 
                    value={classe} 
                    onChange={(e) => setClasse(e.target.value)} 
                    required 
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
                Entra nello Sportello
              </button>
            </form>
          </div>
        )}

        {msg.text && (
          <div className={`msg ${msg.isSuccess ? 'success' : 'error'}`}>
            {msg.isSuccess
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        <div className="verify-footer">
          Non hai ancora uno spazio Dillo Qui?{' '}
          <a href="#">Registrati</a>
        </div>
      </div>
    </div>
  );
}
