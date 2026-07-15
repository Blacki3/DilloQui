import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Trash2, Edit3, Globe2, Lock, UserX, User, PlusCircle, Clock } from 'lucide-react';
import { getAllDrafts, deleteDraft, formatDraftDate, countDrafts } from '../../services/draftStore';

/* Icona incognito */
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

const TYPE_LABEL = {
  'un problema': 'Problema',
  'una proposta': 'Proposta',
  'un dubbio': 'Dubbio',
};

export default function Drafts() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState(getAllDrafts());
  const [confirmDelete, setConfirmDelete] = useState(null);

  const refresh = () => setDrafts(getAllDrafts());

  const handleDelete = (id) => {
    deleteDraft(id);
    setConfirmDelete(null);
    refresh();
  };

  const handleEdit = (id) => {
    navigate(`/box/${slug}/new?draftId=${id}`);
  };

  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 32, background: 'var(--b-black)', border: '2px solid var(--b-black)' }} />
            <h1 style={{ textTransform: 'uppercase', margin: 0 }}>Bozze</h1>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate(`/box/${slug}/new`)}
            id="new-from-drafts-btn"
          >
            <PlusCircle size={15} strokeWidth={2.5} /> Nuova Segnalazione
          </button>
        </div>

        {drafts.length > 0 && (
          <p style={{ color: 'var(--b-gray)', fontSize: '0.88rem', fontWeight: 600, marginTop: 8 }}>
            {drafts.length} {drafts.length === 1 ? 'bozza salvata' : 'bozze salvate'}
          </p>
        )}
      </div>

      {/* Empty state */}
      {drafts.length === 0 && (
        <div style={{
          border: 'var(--b-border)',
          background: 'var(--b-white)',
          padding: '60px 32px',
          textAlign: 'center',
          boxShadow: 'var(--b-shadow)',
        }}>
          <div style={{
            width: 56, height: 56, background: 'var(--b-cream)',
            border: 'var(--b-border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <FileText size={26} strokeWidth={2} color="var(--b-gray)" />
          </div>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 10, fontSize: '1.1rem' }}>Nessuna bozza</h3>
          <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', marginBottom: 24, fontWeight: 500 }}>
            Salva una segnalazione come bozza per ritrovarla qui.
          </p>
          <button
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            onClick={() => navigate(`/box/${slug}/new`)}
          >
            <PlusCircle size={14} strokeWidth={2.5} /> Crea una segnalazione
          </button>
        </div>
      )}

      {/* Lista bozze */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="flat-panel"
            style={{ 
              padding: '18px 20px', 
              position: 'relative', 
              overflow: 'hidden', 
              background: draft.anonimo ? 'var(--b-cream)' : 'var(--b-white)' 
            }}
          >
            {draft.anonimo && (
              <div style={{
                position: 'absolute', right: -10, bottom: -20,
                opacity: 0.06, pointerEvents: 'none', color: 'var(--b-black)'
              }}>
                <IncognitoIcon size={140} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>

              {/* Icona */}
              <div style={{
                width: 40, height: 40, background: 'var(--b-yellow)',
                border: 'var(--b-border)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--b-shadow-sm)',
              }}>
                <FileText size={18} strokeWidth={2.5} />
              </div>

              {/* Contenuto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  {/* Tipo */}
                  {draft.tipo && (
                    <span style={{
                      background: 'var(--b-black)', color: 'var(--b-yellow)',
                      fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {TYPE_LABEL[draft.tipo?.toLowerCase()] || draft.tipo}
                    </span>
                  )}
                  {/* Badge visibilità */}
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.68rem', fontWeight: 700, color: 'var(--b-gray)',
                    textTransform: 'uppercase',
                  }}>
                    {draft.isPublic
                      ? <><Globe2 size={10} strokeWidth={2.5} /> Pubblica</>
                      : <><Lock size={10} strokeWidth={2.5} /> Privata</>}
                  </span>
                  {/* Badge identità */}
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.68rem', fontWeight: 700, color: 'var(--b-gray)',
                    textTransform: 'uppercase',
                  }}>
                    {draft.anonimo
                      ? <><UserX size={10} strokeWidth={2.5} /> Anonimo</>
                      : <><User size={10} strokeWidth={2.5} /> Con nome</>}
                  </span>
                </div>

                {/* Titolo */}
                <div style={{
                  fontSize: '1rem', fontWeight: 800, color: 'var(--b-black)',
                  marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {draft.titolo || <span style={{ color: 'var(--b-gray)', fontStyle: 'italic', fontWeight: 500 }}>Senza titolo</span>}
                </div>

                {/* Anteprima descrizione */}
                {draft.problema && (
                  <div style={{
                    fontSize: '0.82rem', color: 'var(--b-gray)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 480,
                  }}>
                    {draft.problema}
                  </div>
                )}

                {/* Data */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  marginTop: 8, fontSize: '0.72rem', color: 'var(--b-gray)',
                  fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                }}>
                  <Clock size={11} strokeWidth={2} />
                  {formatDraftDate(draft.savedAt)}
                </div>
              </div>

              {/* Azioni */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {confirmDelete === draft.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      style={{
                        background: 'var(--b-red)', color: '#fff',
                        border: '2px solid var(--b-black)', padding: '7px 12px',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                        textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
                      }}
                      id={`confirm-delete-${draft.id}`}
                    >
                      Elimina
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{
                        background: 'var(--b-white)', color: 'var(--b-black)',
                        border: '2px solid var(--b-black)', padding: '7px 12px',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                        textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(draft.id)}
                      title="Modifica bozza"
                      style={{
                        background: 'var(--b-yellow)', border: '2px solid var(--b-black)',
                        width: 36, height: 36, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer',
                        boxShadow: 'var(--b-shadow-sm)',
                      }}
                      id={`edit-draft-${draft.id}`}
                    >
                      <Edit3 size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(draft.id)}
                      title="Elimina bozza"
                      style={{
                        background: 'var(--b-white)', border: '2px solid var(--b-black)',
                        width: 36, height: 36, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer',
                        boxShadow: 'var(--b-shadow-sm)',
                      }}
                      id={`delete-draft-${draft.id}`}
                    >
                      <Trash2 size={15} strokeWidth={2.5} color="var(--b-red)" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
