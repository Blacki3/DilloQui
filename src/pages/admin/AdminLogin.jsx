import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('mail@nomescuola.edu.it');
  const [password, setPassword] = useState('12345678');
  
  // Registration fields
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [nomeSportello, setNomeSportello] = useState('');

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin, isAdminAuthenticated } = useAuth();

  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulazione login API
    setTimeout(() => {
      setLoading(false);
      loginAdmin("mock-admin-token");
      navigate('/admin/dashboard');
    }, 1000);
  };

  return (
    <div className="app-container">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'var(--color-primary-lighter)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--color-primary)' }}>
            <ShieldCheck size={32} />
          </div>
          <h2>{isRegistering ? 'Crea il tuo Sportello' : 'Accesso Admin'}</h2>
          <div className="sub" style={{ margin: 0 }}>
            {isRegistering ? 'Configura un nuovo spazio Dillo Qui' : 'Gestisci il tuo spazio su Dillo Qui'}
          </div>
        </div>

        <form onSubmit={handleLogin}>
          {isRegistering && (
            <>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label>Nome</label>
                  <input type="text" placeholder="Mario" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Cognome</label>
                  <input type="text" placeholder="Rossi" value={cognome} onChange={e => setCognome(e.target.value)} required />
                </div>
              </div>

              <label>Nome Sportello / Scuola</label>
              <input type="text" placeholder="Es. Liceo Leonardo da Vinci" value={nomeSportello} onChange={e => setNomeSportello(e.target.value)} required style={{ marginBottom: '16px' }} />
            </>
          )}

          <label>Email Scuola</label>
          <input 
            type="email" 
            placeholder="admin@scuola.edu.it" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: '16px' }}
          />

          <label>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" loading={loading} style={{ marginTop: '16px' }}>
            {isRegistering ? 'Registrati e Crea Sportello' : 'Accedi al Pannello'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          {isRegistering ? 'Hai già uno sportello?' : 'Non hai ancora uno spazio Dillo Qui?'} <button onClick={() => setIsRegistering(!isRegistering)} style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{isRegistering ? 'Accedi' : 'Registrati'}</button>
        </div>
      </Card>
    </div>
  );
}
