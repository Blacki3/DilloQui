import { useState } from 'react';
import Popup from '../../components/Popup';
import Select from '../../components/Select';
import { Send, Lock, Globe2, UserX, User, ArrowRight, Shield } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { addReport } from '../../services/mockStore';
import { getSettings } from '../../services/mockSettings';
import { getStudentProfile } from '../../services/mockProfiles';

export default function NewReport() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const settings = getSettings();
  const studentProfile = getStudentProfile();
  const categoryOptions = settings.categories.length ? settings.categories : ['Un problema', 'Una proposta', 'Un dubbio'];

  const [isPublic, setIsPublic] = useState(false);
  const [anonimo, setAnonimo] = useState(studentProfile.defaultAnon);
  const [titolo, setTitolo] = useState('');
  const [tipo, setTipo] = useState('');
  const [problema, setProblema] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleInvia = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      addReport({
        type: (tipo || categoryOptions[0] || 'Problema').toLowerCase(),
        title: titolo.trim(),
        content: problema.trim(),
        isPublic,
        anonimo,
        authorName: `${studentProfile.nome} ${studentProfile.cognome}`.trim() || 'Tu',
      });
      setLoading(false);
      setShowPopup(true);
    }, 1000);
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', maxWidth: 680 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 10, height: 32, background: 'var(--b-yellow)', border: '2px solid var(--b-black)' }} />
          <h1 style={{ textTransform: 'uppercase', margin: 0 }}>Nuova Segnalazione</h1>
        </div>
        {/* Privacy notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--b-yellow)', border: 'var(--b-border)',
          padding: '10px 16px', boxShadow: 'var(--b-shadow-sm)',
          fontSize: '0.82rem', fontWeight: 700,
        }}>
          <Shield size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span>La tua identità è protetta — visibile solo agli amministratori autorizzati.</span>
        </div>
      </div>

      <form onSubmit={handleInvia}>
        <div className="flat-panel" style={{ marginBottom: 16 }}>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 20, borderBottom: '2px solid var(--b-black)', paddingBottom: 12 }}>
            Dettagli della Segnalazione
          </h3>

          <label>Titolo Riassuntivo</label>
          <input
            placeholder="Es. Mancano sedie in laboratorio..."
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            required
            id="new-report-title"
          />

          <label>Categoria</label>
          <Select
            value={tipo}
            onChange={setTipo}
            options={categoryOptions}
            placeholder="Seleziona una categoria"
          />

          <label>Descrizione Completa</label>
          <textarea
            placeholder="Spiega bene di cosa si tratta, includendo tutti i dettagli utili..."
            value={problema}
            onChange={(e) => setProblema(e.target.value)}
            style={{ minHeight: 160 }}
            required
            id="new-report-desc"
          />
        </div>

        {/* Visibilità */}
        <div className="flat-panel" style={{ marginBottom: 16 }}>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 14, borderBottom: '2px solid var(--b-black)', paddingBottom: 12 }}>Visibilità</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              className={`option-row ${!isPublic ? 'selected' : ''}`}
              onClick={() => setIsPublic(false)}
              id="visibility-private"
            >
              <Lock size={20} strokeWidth={2.5} />
              <div>
                PRIVATA
                <div className="option-row-sub">Solo i referenti potranno leggere questo messaggio.</div>
              </div>
            </div>
            <div
              className={`option-row ${isPublic ? 'selected' : ''}`}
              onClick={() => setIsPublic(true)}
              id="visibility-public"
            >
              <Globe2 size={20} strokeWidth={2.5} />
              <div>
                PUBBLICA (BACHECA)
                <div className="option-row-sub">Sarà visibile sul forum per ricevere voti e supporto.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Identità */}
        <div className="flat-panel" style={{ marginBottom: 20 }}>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 14, borderBottom: '2px solid var(--b-black)', paddingBottom: 12 }}>Identità</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              className={`option-row ${anonimo ? 'selected' : ''}`}
              onClick={() => setAnonimo(true)}
              id="identity-anon"
            >
              <UserX size={20} strokeWidth={2.5} />
              <div>
                ANONIMO
                <div className="option-row-sub">I referenti non vedranno la tua identità.</div>
              </div>
            </div>
            <div
              className={`option-row ${!anonimo ? 'selected' : ''}`}
              onClick={() => setAnonimo(false)}
              id="identity-named"
            >
              <User size={20} strokeWidth={2.5} />
              <div>
                CON IL TUO NOME
                <div className="option-row-sub">I referenti vedranno la tua identità.</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button type="submit" className="btn-primary" disabled={loading} id="new-report-submit">
            {loading ? '⏳ Invio in corso...' : <><Send size={17} strokeWidth={2.5} /> Invia Segnalazione <ArrowRight size={15} strokeWidth={3} /></>}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(`/box/${slug}/forum`)}
            id="new-report-cancel"
          >
            Annulla
          </button>
        </div>
      </form>

      <Popup
        show={showPopup}
        title="✓ Inviata con successo!"
        message={isPublic ? 'La tua segnalazione è ora visibile nella Bacheca.' : 'La tua segnalazione è stata inviata privatamente ai referenti.'}
        onClose={() => { setShowPopup(false); navigate(`/box/${slug}/${isPublic ? 'forum' : 'history'}`); }}
      />
    </div>
  );
}
