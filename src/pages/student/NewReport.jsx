import { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Popup from '../../components/Popup';
import Select from '../../components/Select';
import { useAuth } from '../../context/AuthContext';
import { Send, Globe2, Lock, UserX, User } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function NewReport() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { studentToken } = useAuth();
  
  const [isPublic, setIsPublic] = useState(false);
  const [anonimo, setAnonimo] = useState(false);
  const [titolo, setTitolo] = useState('');
  const [tipo, setTipo] = useState('Problema');
  const [problema, setProblema] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleInvia = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowPopup(true);
    }, 1000);
  };

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--color-text-main)' }}>Nuova Segnalazione</h1>
        <div style={{ color: 'var(--color-text-muted)' }}>Compila il form per inviare la tua richiesta alla scuola.</div>
      </div>
      
      <form onSubmit={handleInvia} className="report-form-layout">
        
        {/* Colonna Sinistra (Form Principale) */}
        <div className="report-form-main">
          <Card style={{ maxWidth: '100%' }}>
            <h3 style={{ marginBottom: '24px', color: 'var(--color-text-main)' }}>Dettagli della Segnalazione</h3>
            
            <label>Titolo Riassuntivo</label>
            <input 
              placeholder="Es. Mancano sedie in laboratorio..." 
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              required
            />

            <label>Categoria</label>
            <Select 
              value={tipo} 
              onChange={setTipo} 
              options={['Problema', 'Proposta', 'Dubbio']} 
            />

            <label>Descrizione completa</label>
            <textarea 
              placeholder="Spiega bene di cosa si tratta, includendo tutti i dettagli utili..." 
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              style={{ minHeight: '200px' }}
              required
            />
          </Card>
        </div>

        {/* Colonna Destra (Impostazioni e Invio) */}
        <div className="report-form-side">
          
          <Card style={{ maxWidth: '100%' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--color-text-main)' }}>Visibilità</h3>
            
            {/* Toggle Pubblico/Privato */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div 
                onClick={() => setIsPublic(false)}
                style={{ padding: '16px', borderRadius: '12px', border: isPublic ? '1px solid #e5e7eb' : '2px solid var(--color-primary)', background: isPublic ? '#f9fafb' : 'var(--color-primary-lighter)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', opacity: isPublic ? 0.7 : 1, transition: '0.2s' }}
              >
                <Lock size={28} color={isPublic ? 'var(--color-text-muted)' : 'var(--color-primary)'} />
                <div>
                  <div style={{ fontWeight: '600', color: isPublic ? 'var(--color-text-muted)' : 'var(--color-primary)', marginBottom: '4px' }}>Privata</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>Solo i professori referenti potranno leggere questo messaggio.</div>
                </div>
              </div>
              
              <div 
                onClick={() => setIsPublic(true)}
                style={{ padding: '16px', borderRadius: '12px', border: !isPublic ? '1px solid #e5e7eb' : '2px solid var(--color-primary)', background: !isPublic ? '#f9fafb' : 'var(--color-primary-lighter)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', opacity: !isPublic ? 0.7 : 1, transition: '0.2s' }}
              >
                <Globe2 size={28} color={!isPublic ? 'var(--color-text-muted)' : 'var(--color-primary)'} />
                <div>
                  <div style={{ fontWeight: '600', color: !isPublic ? 'var(--color-text-muted)' : 'var(--color-primary)', marginBottom: '4px' }}>Pubblica (Bacheca)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>Sarà visibile sul forum per ricevere voti e supporto dagli studenti.</div>
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: '16px', marginTop: '24px', color: 'var(--color-text-main)' }}>Identità</h3>
            
            <div 
              onClick={() => setAnonimo(!anonimo)}
              style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                border: anonimo ? '2px solid var(--color-primary)' : '1px solid #e5e7eb', 
                background: anonimo ? 'var(--color-primary-lighter)' : '#f9fafb', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                transition: '0.2s' 
              }}
            >
              {anonimo ? (
                <UserX size={28} color="var(--color-primary)" />
              ) : (
                <User size={28} color="var(--color-text-muted)" />
              )}
              <div>
                <div style={{ fontWeight: '600', color: anonimo ? 'var(--color-primary)' : 'var(--color-text-main)', marginBottom: '4px' }}>
                  {anonimo ? 'Modalità Anonima Attiva' : 'Invia con il tuo Nome'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  {anonimo ? 'Nessuno saprà che sei stato tu a scrivere.' : 'I referenti vedranno la tua identità.'}
                </div>
              </div>
            </div>
          </Card>

          <Button type="submit" loading={loading} style={{ height: '60px', fontSize: '1.1rem' }}>
            Invia Segnalazione <Send size={20} />
          </Button>
          
        </div>
      </form>

      <Popup 
        show={showPopup} 
        title="Inviata con successo!" 
        message={isPublic ? "La tua segnalazione è ora visibile nella Bacheca pubblica." : "La tua segnalazione è stata inviata privatamente ai referenti."} 
        onClose={() => {
          setShowPopup(false);
          navigate(`/box/${slug}/${isPublic ? 'forum' : 'history'}`);
        }}
      />
    </div>
  );
}
