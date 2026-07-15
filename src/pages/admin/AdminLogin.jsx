import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAdminProfile, saveAdminProfile } from '../../services/mockProfiles';
import BrandWordmark from '../../components/BrandWordmark';

export default function AdminLogin() {
  const [email, setEmail] = useState('mail@nomescuola.edu.it');
  const [password, setPassword] = useState('12345678');
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [nomeSportello, setNomeSportello] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin, isAdminAuthenticated } = useAuth();

  useEffect(() => {
    // Preload del bundle principale in background mentre l'utente è in questa pagina
    import('../../bundles/AppBundle');
    if (isAdminAuthenticated) navigate('/admin/dashboard', { replace: true });
  }, [isAdminAuthenticated, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const previous = getAdminProfile();
      saveAdminProfile({
        ...previous,
        email: email.trim().toLowerCase(),
        nome: isRegistering ? nome.trim() : previous.nome,
        cognome: isRegistering ? cognome.trim() : previous.cognome,
      });
      setLoading(false);
      loginAdmin("mock-admin-token");
      navigate('/admin/dashboard');
    }, 900);
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
            Area Rappresentanti
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
            {isRegistering ? 'Configura un nuovo spazio DILLOQUI per la tua scuola' : 'Accedi al pannello di gestione DILLOQUI'}
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
