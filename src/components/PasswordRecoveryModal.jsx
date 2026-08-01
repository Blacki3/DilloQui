import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function PasswordRecoveryModal() {
  const { isRecoveringPassword, updatePassword, setIsRecoveringPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  if (!isRecoveringPassword) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setStatus({ ...status, error: 'La password deve avere almeno 6 caratteri' });
      return;
    }

    setStatus({ loading: true, error: null, success: false });
    const { error } = await updatePassword(newPassword);

    if (error) {
      setStatus({ loading: false, error: error.message, success: false });
    } else {
      setStatus({ loading: false, error: null, success: true });
      setTimeout(() => setIsRecoveringPassword(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{
            background: 'var(--b-white)', border: 'var(--b-border)',
            boxShadow: 'var(--b-shadow)', padding: 30,
            maxWidth: 400, width: '100%',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Lock size={24} />
            <h2 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1.2rem' }}>Imposta Nuova Password</h2>
          </div>
          
          {status.success ? (
            <div style={{ background: '#d4edda', color: '#155724', padding: 15, border: '2px solid #c3e6cb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={20} />
              <b>Password aggiornata con successo!</b>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                Inserisci la tua nuova password per completare il recupero dell'account.
              </p>
              
              <input
                type="password"
                placeholder="Nuova password (min 6 caratteri)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{
                  padding: '12px 15px', border: 'var(--b-border)',
                  fontFamily: 'inherit', fontSize: '1rem',
                  outline: 'none', background: '#f5f5f5'
                }}
              />
              
              {status.error && (
                <div style={{ color: 'red', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={14} /> {status.error}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={status.loading}
                className="brutalist-button"
                style={{
                  background: 'var(--b-yellow)', color: 'var(--b-black)',
                  border: 'var(--b-border)', padding: '12px',
                  fontWeight: 800, textTransform: 'uppercase',
                  cursor: status.loading ? 'not-allowed' : 'pointer',
                  marginTop: 10
                }}
              >
                {status.loading ? 'Aggiornamento...' : 'Salva Password'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
