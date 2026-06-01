import { useState } from 'react';
import Button from '../../components/Button';
import Popup from '../../components/Popup';
import Select from '../../components/Select';
import { useAuth } from '../../context/AuthContext';
import { Send, Lock, Globe2, UserX, User } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function NewReport() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { studentToken } = useAuth();

  const [isPublic, setIsPublic] = useState(false);
  const [anonimo, setAnonimo] = useState(true); // default anonimo come nello stitch
  const [titolo, setTitolo] = useState('');
  const [tipo, setTipo] = useState('');
  const [problema, setProblema] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleInvia = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setShowPopup(true); }, 1000);
  };

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24 }}>Nuova Segnalazione</h1>

      <form onSubmit={handleInvia} className="report-form-layout">

        {/* Colonna principale */}
        <div className="report-form-main">
          <div className="flat-panel">
            <h3 style={{ marginBottom: 20 }}>Dettagli della Segnalazione</h3>

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
              placeholder="Seleziona una categoria"
            />

            <label>Descrizione completa</label>
            <textarea
              placeholder="Spiega bene di cosa si tratta, includendo tutti i dettagli utili..."
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              style={{ minHeight: 160 }}
              required
            />

            {/* Visibilità */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
              <h3 style={{ margin: 0 }}>Visibilità</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              <div
                className={`option-row ${!isPublic ? 'selected' : ''}`}
                onClick={() => setIsPublic(false)}
              >
                <Lock size={22} />
                <div>
                  Privata
                  <div className="option-row-sub">Solo i professori referenti potranno leggere questo messaggio.</div>
                </div>
              </div>
              <div
                className={`option-row ${isPublic ? 'selected' : ''}`}
                onClick={() => setIsPublic(true)}
                style={!isPublic ? {} : {}}
              >
                <Globe2 size={22} />
                <div>
                  Pubblica (Bacheca)
                  <div className="option-row-sub">Sarà visibile sul forum per ricevere voti e supporto.</div>
                </div>
              </div>
            </div>

            {/* Identità */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Identità</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              <div
                className={`option-row ${anonimo ? 'selected' : ''}`}
                onClick={() => setAnonimo(true)}
              >
                <UserX size={22} />
                <div>
                  Anonimo
                  <div className="option-row-sub">I referenti non vedranno la tua identità.</div>
                </div>
              </div>
              <div
                className={`option-row ${!anonimo ? 'selected' : ''}`}
                onClick={() => setAnonimo(false)}
              >
                <User size={22} />
                <div>
                  Invia con il tuo Nome
                  <div className="option-row-sub">I referenti vedranno la tua identità.</div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Invio in corso...' : <><Send size={18} /> Invia Segnalazione</>}
            </button>
          </div>
        </div>
      </form>

      <Popup
        show={showPopup}
        title="Inviata con successo!"
        message={isPublic ? 'La tua segnalazione è ora visibile nella Bacheca.' : 'La tua segnalazione è stata inviata privatamente ai referenti.'}
        onClose={() => { setShowPopup(false); navigate(`/box/${slug}/${isPublic ? 'forum' : 'history'}`); }}
      />
    </div>
  );
}
