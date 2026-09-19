import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, MailCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../utils/friendlyError';
import { getAdminProfile, saveAdminProfile } from '../../services/mockProfiles';
import BrandWordmark from '../../components/BrandWordmark';

export default function AdminLogin() {
  const location = useLocation();
  // Determina se siamo sulla route demo (/demo/admin) o reale (/admin)
  const isDemo = location.pathname.startsWith('/demo/');

  // Prefill solo in demo; su /admin/login campi vuoti
  const [email, setEmail] = useState(isDemo ? 'mail@nomescuola.edu.it' : '');
  const [password, setPassword] = useState(isDemo ? '12345678' : '');
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [nomeSportello, setNomeSportello] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoverySent, setRecoverySent] = useState('');
  const navigate = useNavigate();
  const { loginAdmin, loginAdminReal, registerAdminReal, isRealAdminAuthenticated, isAdminAuthenticated } = useAuth();

  useEffect(() => {
    // Preload del bundle principale in background
    // Removed AppBundle preloading
    if (isDemo) {
      if (isAdminAuthenticated) {
        navigate('/demo/admin/dashboard', { replace: true });
      }
    } else if (isRealAdminAuthenticated) {
      // Token mock NON deve sbloccare /admin
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isRealAdminAuthenticated, isAdminAuthenticated, navigate, isDemo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isDemo) {
        // DEMO: login mock invariato
        const previous = getAdminProfile();
        saveAdminProfile({
          ...previous,
          email: email.trim().toLowerCase(),
          nome: isRegistering ? nome.trim() : previous.nome,
          cognome: isRegistering ? cognome.trim() : previous.cognome,
        });
        loginAdmin('mock-admin-token');
        navigate('/demo/admin/dashboard');
      } else {
        // REALE: login o registrazione con Supabase
        if (isRegistering) {
          if (!nome.trim() || !cognome.trim() || !nomeSportello.trim()) {
            setError('Compila tutti i campi richiesti per la registrazione.');
            setLoading(false);
            return;
          }
          if (!acceptedTerms) {
            setError('Devi accettare i Termini di Servizio e la Privacy Policy per registrarti.');
            setLoading(false);
            return;
          }
          await registerAdminReal({
            email: email.trim().toLowerCase(),
            password,
            nome: nome.trim(),
            cognome: cognome.trim(),
            nomeSportello: nomeSportello.trim(),
          });
        } else {
          await loginAdminReal(email.trim().toLowerCase(), password);
        }
        // Il redirect avviene automaticamente tramite l'useEffect sopra quando isRealAdminAuthenticated diventa true
      }
    } catch (err) {
      setError(friendlyError(err, 'Errore durante la richiesta. Verifica i dati inseriti.'));
    } finally {
      setLoading(false);
    }
  };

  // Il link contenuto nell'email riporta su questa stessa pagina: al rientro
  // Supabase emette PASSWORD_RECOVERY e PasswordRecoveryModal, montato a
  // livello di App, chiede la nuova password sopra qualunque rotta.
  const handleForgotPassword = async () => {
    setError('');
    setRecoverySent('');

    const target = email.trim().toLowerCase();
    if (!target) {
      setError('Inserisci la tua email, poi richiedi il recupero.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (resetError) throw resetError;
      setRecoverySent(target);
    } catch (err) {
      setError(friendlyError(err, 'Invio email non riuscito. Riprova tra qualche minuto.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

        {/* Wordmark sopra la card */}
        <div className="auth-wordmark">
          <BrandWordmark />
        </div>

        <div className="verify-card" style={{ maxWidth: 460 }}>

          {/* Badge area riservata */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--b-black)', color: 'var(--b-yellow)',
            padding: '5px 14px', fontSize: '0.72rem', fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            <ShieldCheck size={13} strokeWidth={2.5} />
            {isDemo ? 'Area Rappresentanti (Demo)' : 'Area Rappresentanti'}
          </div>

          {/* Tab bar Login / Registrazione */}
          <div className="auth-tab-bar">
            <button
              className={`auth-tab ${!isRegistering ? 'active' : ''}`}
              onClick={() => { setIsRegistering(false); setRecoverySent(''); }}
              type="button"
              id="admin-tab-login"
            >
              Accedi
            </button>
            <button
              className={`auth-tab ${isRegistering ? 'active' : ''}`}
              onClick={() => { setIsRegistering(true); setRecoverySent(''); }}
              type="button"
              id="admin-tab-register"
            >
              Registrati
            </button>
          </div>

          <h2 style={{ marginBottom: 6 }}>
            {isRegistering ? 'Crea il tuo Sportello' : 'Bentornato'}
          </h2>
          <p className="verify-slug">
            {isRegistering
              ? 'Configura un nuovo spazio DILLOQUI per la tua scuola'
              : 'Accedi al pannello di gestione DILLOQUI'}
          </p>

          <form onSubmit={handleLogin}>
            {isRegistering && (
              <>
                <div style={{ display: 'flex', gap: 10, textAlign: 'left' }}>
                  <div style={{ flex: 1 }}>
                    <label>Nome</label>
                    <input type="text" placeholder="Mario" value={nome} onChange={e => setNome(e.target.value)} required id="admin-reg-nome" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Cognome</label>
                    <input type="text" placeholder="Rossi" value={cognome} onChange={e => setCognome(e.target.value)} required id="admin-reg-cognome" />
                  </div>
                </div>
                <label style={{ textAlign: 'left', display: 'block' }}>Nome Sportello / Scuola</label>
                <input type="text" placeholder="Es. Liceo Leonardo da Vinci" value={nomeSportello} onChange={e => setNomeSportello(e.target.value)} required id="admin-reg-sportello" />

                {!isDemo && (
                  <p style={{ textAlign: 'left', fontSize: '0.78rem', color: 'var(--b-gray)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    Registrandoti con un indirizzo <strong>@nomescuola.edu.it</strong> lo sportello risulta subito verificato.
                    Con un altro dominio resta attivo lo stesso, ma gli studenti vedranno un avviso finché non lo verifichiamo.
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 8, textAlign: 'left' }}>
                  <input 
                    type="checkbox" 
                    id="admin-terms-check" 
                    checked={acceptedTerms} 
                    onChange={e => setAcceptedTerms(e.target.checked)} 
                    style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2, cursor: 'pointer', accentColor: 'var(--b-black)' }}
                  />
                  <label htmlFor="admin-terms-check" style={{ fontSize: '0.85rem', color: 'var(--b-black)', fontWeight: 500, lineHeight: 1.4 }}>
                    Dichiaro di aver letto e accetto i <a href="/termini" target="_blank" rel="noreferrer" style={{color: 'var(--b-black)', textDecoration: 'underline'}}>Termini di Servizio</a> e la <a href="/privacy" target="_blank" rel="noreferrer" style={{color: 'var(--b-black)', textDecoration: 'underline'}}>Privacy Policy</a>.
                  </label>
                </div>
              </>
            )}

            <label style={{ textAlign: 'left', display: 'block' }}>Email Scuola</label>
            <input
              type="email"
              placeholder="admin@scuola.edu.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="admin-email-input"
            />

            <label style={{ textAlign: 'left', display: 'block' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              id="admin-password-input"
            />

            {!isRegistering && !isDemo && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                id="admin-forgot-password"
                style={{
                  display: 'block', textAlign: 'left', marginTop: 8,
                  background: 'none', border: 'none', padding: 0,
                  font: 'inherit', fontSize: '0.8rem', fontWeight: 700,
                  color: 'var(--b-gray)',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Password dimenticata?
              </button>
            )}

            {recoverySent && (
              <div className="msg success" style={{ marginTop: 8 }}>
                <MailCheck size={16} strokeWidth={2.5} />
                <span>
                  Email inviata a <strong>{recoverySent}</strong>. Apri il link dal
                  messaggio: tornerai qui e potrai scegliere una nuova password.
                </span>
              </div>
            )}

            {error && (
              <div className="msg error" style={{ marginTop: 8 }}>
                <AlertCircle size={16} strokeWidth={2.5} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }} id="admin-login-btn">
              {loading ? '⏳ Accesso in corso...' : (
                <>{isRegistering ? 'Registrati e Crea Sportello' : 'Accedi al Pannello'} <ArrowRight size={16} strokeWidth={3} /></>
              )}
            </button>
          </form>

          <div className="verify-footer">
            Sei uno studente?{' '}
            <a href="/box/demo">Prova la Demo →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
