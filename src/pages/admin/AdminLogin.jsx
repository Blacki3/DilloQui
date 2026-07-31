import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginAdmin, loginAdminReal, registerAdminReal, isRealAdminAuthenticated, isAdminAuthenticated } = useAuth();

  useEffect(() => {
    // Preload del bundle principale in background
    import('../../bundles/AppBundle');
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
        // ── DEMO: login mock invariato ──────────────────────────────────
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
        // ── REALE: login o registrazione con Supabase ───────────────────
        if (isRegistering) {
          if (!nome.trim() || !cognome.trim() || !nomeSportello.trim()) {
            setError('Compila tutti i campi richiesti per la registrazione.');
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
              onClick={() => setIsRegistering(false)}
              type="button"
              id="admin-tab-login"
            >
              Accedi
            </button>
            <button
              className={`auth-tab ${isRegistering ? 'active' : ''}`}
              onClick={() => setIsRegistering(true)}
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
