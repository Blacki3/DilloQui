import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAdminProfile, saveAdminProfile } from '../../services/mockProfiles';

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
      <div className="verify-card" style={{ maxWidth: 460 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, background: 'var(--b-yellow)',
            border: 'var(--b-border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: 'var(--b-shadow)',
          }}>
            <ShieldCheck size={32} color="var(--b-black)" strokeWidth={2.5} />
          </div>
          <h2 style={{ textTransform: 'uppercase', marginBottom: 6 }}>
            {isRegistering ? 'Crea il tuo Sportello' : 'Accesso Admin'}
          </h2>
          <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem' }}>
            {isRegistering ? 'Configura un nuovo spazio DILLOQUI' : 'Gestisci il tuo spazio su DILLOQUI'}
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {isRegistering && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>Nome</label>
                  <input type="text" placeholder="Mario" value={nome} onChange={e => setNome(e.target.value)} required id="admin-reg-nome" />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Cognome</label>
                  <input type="text" placeholder="Rossi" value={cognome} onChange={e => setCognome(e.target.value)} required id="admin-reg-cognome" />
                </div>
              </div>
              <label>Nome Sportello / Scuola</label>
              <input type="text" placeholder="Es. Liceo Leonardo da Vinci" value={nomeSportello} onChange={e => setNomeSportello(e.target.value)} required id="admin-reg-sportello" />
            </>
          )}

          <label>Email Scuola</label>
          <input
            type="email"
            placeholder="admin@scuola.edu.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            id="admin-email-input"
          />

          <label>Password</label>
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

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--b-gray)', borderTop: 'var(--b-border-thin)', paddingTop: 16 }}>
          {isRegistering ? 'Hai già uno sportello?' : 'Non hai ancora uno spazio DILLOQUI?'}{' '}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ color: 'var(--b-black)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: "'Space Grotesk', sans-serif", textUnderlineOffset: 3, fontSize: '0.875rem' }}
            id="admin-toggle-mode"
          >
            {isRegistering ? 'Accedi' : 'Registrati'}
          </button>
        </div>
      </div>
    </div>
  );
}
