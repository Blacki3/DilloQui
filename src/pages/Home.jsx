import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Popup from '../components/Popup';
import { useAuth } from '../context/AuthContext';
import { sendData } from '../services/api';
import { Send, UserCircle2, UserX2 } from 'lucide-react';

export default function Home({ slug }) {
  const { studentToken, logoutStudent } = useAuth();
  const [anonimo, setAnonimo] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('problema');
  const [problema, setProblema] = useState('');
  const [soluzione, setSoluzione] = useState('');
  const [preferenza, setPreferenza] = useState('classe');
  
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleToggleAnonimo = () => {
    setAnonimo(!anonimo);
    if (!anonimo) setNome('');
  };

  const handleInvia = async () => {
    setLoading(true);
    const data = { anonimo, nome, tipo, problema, soluzione, preferenza };
    
    try {
      const res = await sendData(data, studentToken, slug);
      if (res.success) {
        setShowPopup(true);
      }
    } catch (err) {
      alert("Errore nell'invio");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowPopup(false);
    setAnonimo(false);
    setNome('');
    setTipo('problema');
    setProblema('');
    setSoluzione('');
    setPreferenza('classe');
  };

  const displaySlugName = slug ? slug.toUpperCase() : 'SCUOLA';

  return (
    <div className="app-container" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
      <Card className="home-card" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Dillo Qui</h2>
            <div className="sub" style={{ margin: 0 }}>Rete: {displaySlugName}</div>
          </div>
          <button 
            onClick={logoutStudent} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--color-text-muted)', 
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.875rem'
            }}
          >
            Esci
          </button>
        </div>

        <div style={{ background: 'var(--color-primary-lighter)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', cursor: 'pointer' }} onClick={handleToggleAnonimo}>
          <div style={{ color: 'var(--color-primary)' }}>
            {anonimo ? <UserX2 size={28} /> : <UserCircle2 size={28} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>Modalità {anonimo ? 'Anonima' : 'Visibile'}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-primary)', opacity: 0.8 }}>Clicca per cambiare</div>
          </div>
        </div>

        {!anonimo && (
          <div style={{ marginBottom: '16px' }}>
            <label>Il tuo nome</label>
            <input 
              placeholder="Inserisci il tuo nome e cognome" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
        )}

        <label>Tipo di segnalazione</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="problema">Un problema</option>
          <option value="proposta">Una proposta</option>
          <option value="dubbio">Un dubbio</option>
        </select>

        <label>Descrizione</label>
        <textarea 
          placeholder={`Descrivi il tuo ${tipo}...`} 
          value={problema}
          onChange={(e) => setProblema(e.target.value)}
        />

        <label>Possibile Soluzione (Opzionale)</label>
        <textarea 
          placeholder="Come pensi che si possa risolvere?" 
          value={soluzione}
          onChange={(e) => setSoluzione(e.target.value)}
        />

        <label>A chi vuoi rivolgerti?</label>
        <select value={preferenza} onChange={(e) => setPreferenza(e.target.value)}>
          <option value="classe">Solo alla classe</option>
          <option value="professori">Solo ai professori</option>
          <option value="rappresentanti">Solo ai rappresentanti</option>
          <option value="tutti">A tutti</option>
        </select>

        <Button onClick={handleInvia} loading={loading} style={{ marginTop: '24px' }}>
          Invia Segnalazione <Send size={18} />
        </Button>
      </Card>

      <Popup 
        show={showPopup} 
        title="Segnalazione inviata!" 
        message={`Il tuo messaggio è stato registrato su Dillo Qui (${displaySlugName}). Grazie per il tuo contributo.`} 
        onClose={resetForm}
      />
    </div>
  );
}
