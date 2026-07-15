import { useState } from 'react';
import Popup from '../../components/Popup';
import Select from '../../components/Select';
import { Send, Lock, Globe2, UserX, User, ArrowRight, Shield, BookMarked, Archive } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { addReport } from '../../services/mockStore';
import { getSettings } from '../../services/mockSettings';
import { getStudentProfile } from '../../services/mockProfiles';
import { saveDraft, getDraftById, deleteDraft, countDrafts } from '../../services/draftStore';

/* Icona incognito da public/incognito-svgrepo-com.svg */
function IncognitoIcon({ size = 24 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.92"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="0.5 11.04 12 11.04 23.5 11.04" />
      <path d="M19.67,11H4.33L5,4.68A2.54,2.54,0,0,1,7.57,2.42h0a2.47,2.47,0,0,1,1.13.27h0a7.43,7.43,0,0,0,6.6,0h0a2.47,2.47,0,0,1,1.13-.27h0A2.54,2.54,0,0,1,19,4.68Z" />
      <circle cx="6.73" cy="18.23" r="3.35" />
      <circle cx="17.27" cy="18.23" r="3.35" />
      <path d="M10.08,18.71a1.92,1.92,0,1,1,3.84,0" />
      <line x1="1.46" y1="15.83" x2="4.33" y2="15.83" />
      <line x1="19.67" y1="15.83" x2="22.54" y2="15.83" />
    </svg>
  );
}

export default function NewReport() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  const settings = getSettings();
  const studentProfile = getStudentProfile();
  const categoryOptions = settings.categories.length ? settings.categories : ['Un problema', 'Una proposta', 'Un dubbio'];

  // Carica bozza se c'è un draftId nell'URL
  const existingDraft = draftId ? getDraftById(draftId) : null;

  const [isPublic, setIsPublic] = useState(existingDraft?.isPublic ?? false);
  const [anonimo, setAnonimo] = useState(existingDraft?.anonimo ?? studentProfile.defaultAnon);
  const [titolo, setTitolo] = useState(existingDraft?.titolo || '');
  const [tipo, setTipo] = useState(existingDraft?.tipo || '');
  const [problema, setProblema] = useState(existingDraft?.problema || '');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState(''); // '' | 'saved'
  const [error, setError] = useState('');

  const totalDrafts = countDrafts();

  const handleSaveDraft = () => {
    saveDraft({ id: draftId || undefined, titolo, tipo, problema, isPublic, anonimo });
    setDraftFeedback('saved');
    setTimeout(() => setDraftFeedback(''), 2000);
  };

  const handleInvia = async (e) => {
    e.preventDefault();
    if (titolo.trim().length < 5) {
      setError('Il titolo deve contenere almeno 5 caratteri.');
      return;
    }
    if (problema.trim().length < 20) {
      setError('La descrizione deve contenere almeno 20 caratteri.');
      return;
    }
    if (!tipo && !categoryOptions.includes(tipo)) {
      setError('Seleziona una categoria valida.');
      return;
    }

    setError('');
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
      // Elimina la bozza se era una bozza in modifica
      if (draftId) deleteDraft(draftId);
      setLoading(false);
      setShowPopup(true);
    }, 1000);
  };

  return (
    <form onSubmit={handleInvia} className="new-report-grid">

      {/* Header — full width su desktop */}
      <div className="new-report-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 32, background: 'var(--b-yellow)', border: '2px solid var(--b-black)' }} />
            <h1 style={{ textTransform: 'uppercase', margin: 0 }}>
              {draftId ? 'Modifica Bozza' : 'Nuova Segnalazione'}
            </h1>
          </div>

          {/* Bottone Bozze con badge — nascosto su mobile (usa lo speed dial) */}
          <button
            type="button"
            className="hide-on-mobile"
            onClick={() => navigate(`/box/${slug}/drafts`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
              background: 'var(--b-white)', color: 'var(--b-black)', border: 'var(--b-border)',
              padding: '7px 14px', fontWeight: 800, fontSize: '0.78rem',
              textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: 'var(--b-shadow-sm)', letterSpacing: '0.04em',
            }}
            id="open-drafts-btn"
          >
            <Archive size={14} strokeWidth={2.5} />
            Bozze
            {totalDrafts > 0 && (
              <span style={{
                position: 'absolute', top: -8, right: -8,
                background: 'var(--b-red)', color: 'var(--b-white)',
                fontSize: '0.65rem', fontWeight: 900, fontFamily: "'IBM Plex Mono', monospace",
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: '2px solid var(--b-black)'
              }}>
                {totalDrafts}
              </span>
            )}
          </button>
        </div>

        {/* Privacy notice — visibile solo se anonimo */}
        {anonimo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--b-yellow)', border: 'var(--b-border)',
            padding: '10px 16px', boxShadow: 'var(--b-shadow-sm)',
            fontSize: '0.82rem', fontWeight: 700,
          }}>
            <Shield size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span>La tua identità è protetta — visibile solo agli amministratori autorizzati.</span>
          </div>
        )}
      </div>

      {/* Colonna sinistra — Dettagli */}
      <div className="new-report-col-left">
        {error && (
          <div style={{ background: 'var(--b-red)', color: 'white', padding: '12px 16px', marginBottom: 16, border: '2px solid var(--b-black)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>
            Attenzione: {error}
          </div>
        )}

        <div className="flat-panel">
          <h3 style={{ textTransform: 'uppercase', marginBottom: 20, borderBottom: '2px solid var(--b-black)', paddingBottom: 12 }}>
            Dettagli
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <label>Titolo Riassuntivo</label>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--b-gray)' }}>{titolo.length}/80</span>
          </div>
          <input
            placeholder="Es. Mancano sedie in laboratorio..."
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            maxLength={80}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <label>Descrizione</label>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--b-gray)' }}>{problema.length}/1000</span>
          </div>
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: anonimo ? 'var(--b-cream)' : 'var(--b-white)',
            transition: 'background 0.3s ease',
            border: '2px solid var(--b-black)'
          }}>
            <div style={{
              position: 'absolute',
              right: 16, bottom: 16,
              opacity: anonimo ? 0.08 : 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: 'none',
              color: 'var(--b-black)',
              lineHeight: 0,
            }}>
              <IncognitoIcon size={120} />
            </div>
            <textarea
              placeholder="Spiega bene di cosa si tratta, includendo tutti i dettagli utili..."
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              maxLength={1000}
              style={{ minHeight: 200, width: '100%', border: 'none', boxShadow: 'none', margin: 0, background: 'transparent', position: 'relative', zIndex: 1, resize: 'vertical' }}
              required
              id="new-report-desc"
            />
          </div>
        </div>
      </div>

      {/* Colonna destra — un unico rettangolo con bottoni in fondo */}
      <div className="new-report-col-right">
        <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

          {/* Visibilità */}
          <div>
            <h3 style={{ textTransform: 'uppercase', marginBottom: 10, borderBottom: '2px solid var(--b-black)', paddingBottom: 8, fontSize: '0.85rem' }}>Visibilità</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                className={`option-row ${!isPublic ? 'selected' : ''}`}
                onClick={() => setIsPublic(false)}
                id="visibility-private"
              >
                <Lock size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  PRIVATA
                  <div className="option-row-sub">Solo i referenti la leggono.</div>
                </div>
              </div>
              <div
                className={`option-row ${isPublic ? 'selected' : ''}`}
                onClick={() => setIsPublic(true)}
                id="visibility-public"
              >
                <Globe2 size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  PUBBLICA
                  <div className="option-row-sub">Visibile in bacheca.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Divisore */}
          <div style={{ height: 2, background: 'var(--b-black)', margin: '0 -24px' }} />

          {/* Identità */}
          <div>
            <h3 style={{ textTransform: 'uppercase', marginBottom: 10, borderBottom: '2px solid var(--b-black)', paddingBottom: 8, fontSize: '0.85rem' }}>Identità</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                className={`option-row ${anonimo ? 'selected' : ''}`}
                onClick={() => setAnonimo(true)}
                id="identity-anon"
              >
                <UserX size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  ANONIMO
                  <div className="option-row-sub">Identità nascosta.</div>
                </div>
              </div>
              <div
                className={`option-row ${!anonimo ? 'selected' : ''}`}
                onClick={() => setAnonimo(false)}
                id="identity-named"
              >
                <User size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  CON IL NOME
                  <div className="option-row-sub">Identità visibile.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Spazio flessibile — spinge i bottoni in fondo */}
          <div style={{ flex: 1 }} />

          {/* Divisore */}
          <div style={{ height: 2, background: 'var(--b-black)', margin: '0 -24px' }} />

          {/* Bottoni */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="submit" className="btn-primary" disabled={loading} id="new-report-submit">
              {loading ? '⏳ Invio in corso...' : <><Send size={15} strokeWidth={2.5} /> Invia <ArrowRight size={13} strokeWidth={3} /></>}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/box/${slug}/forum`)}
                id="new-report-cancel"
                style={{ flex: 1 }}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveDraft}
                id="new-report-draft"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <BookMarked size={13} strokeWidth={2.5} />
                {draftFeedback === 'saved' ? '✓ Salvata' : 'Bozza'}
              </button>
            </div>
          </div>

        </div>
      </div>

      <Popup
        show={showPopup}
        title="✓ Inviata con successo!"
        message={isPublic ? 'La tua segnalazione è ora visibile nella Bacheca.' : 'La tua segnalazione è stata inviata privatamente ai referenti.'}
        onClose={() => { setShowPopup(false); navigate(`/box/${slug}/${isPublic ? 'forum' : 'history'}`); }}
      />
    </form>
  );
}
