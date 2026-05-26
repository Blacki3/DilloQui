import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { requestCode, verifyCode } from '../services/api';
import { Mail, KeyRound } from 'lucide-react';

export default function Verify({ slug }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isSuccess: false });
  const { loginStudent } = useAuth();

  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setMsg({ text: 'Inserisci la tua email', isSuccess: false });
      return;
    }

    setLoading(true);
    try {
      const res = await requestCode(trimmedEmail, slug);
      setMsg({ text: res.message, isSuccess: res.success });
      if (res.success) {
        setStep(2);
      }
    } catch (err) {
      setMsg({ text: 'Errore di rete', isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmedCode = code.trim();
    if (!/^[0-9]{6}$/.test(trimmedCode)) {
      setMsg({ text: 'Codice non valido', isSuccess: false });
      return;
    }

    setLoading(true);
    try {
      const res = await verifyCode(email, trimmedCode, slug);
      if (res.success) {
        setMsg({ text: 'Accesso effettuato ✅', isSuccess: true });
        loginStudent(res.token);
      } else {
        setMsg({ text: res.message, isSuccess: false });
      }
    } catch (err) {
      setMsg({ text: 'Errore di rete', isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const displaySlugName = slug ? slug.toUpperCase() : 'SCUOLA';

  return (
    <div className="app-container">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--color-primary-lighter)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--color-primary)' }}>
            {step === 1 ? <Mail size={32} /> : <KeyRound size={32} />}
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Verifica Accesso</h2>
          <div className="sub" style={{ margin: 0 }}>Dillo Qui - {displaySlugName}</div>
        </div>

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Inserisci la tua email scolastica</label>
            <input 
              type="email" 
              placeholder="es. nome.cognome@scuola.edu.it" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <Button type="submit" loading={loading}>
              Invia codice OTP
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Codice di verifica inviato a {email}</label>
            <input 
              maxLength="6" 
              placeholder="Codice a 6 cifre (mock: 123456)" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ marginBottom: '16px', letterSpacing: '2px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
            />
            <Button type="submit" loading={loading}>
              Verifica Codice
            </Button>
          </form>
        )}

        {msg.text && (
          <div className={`msg ${msg.isSuccess ? 'success' : 'error'}`}>
            {msg.text}
          </div>
        )}
      </Card>
    </div>
  );
}
