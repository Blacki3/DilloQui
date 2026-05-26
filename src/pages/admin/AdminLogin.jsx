import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h2>Accesso Admin</h2>
          <div className="sub" style={{ margin: 0 }}>Gestisci il tuo spazio su Dillo Qui</div>
        </div>

        <form onSubmit={handleLogin}>
          <label>Email Scuola</label>
          <input 
            type="email" 
            placeholder="admin@scuola.edu.it" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            Accedi al Pannello
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Non hai ancora uno spazio Dillo Qui? <a href="#" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>Registrati</a>
        </div>
      </Card>
    </div>
  );
}
