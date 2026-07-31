import { useState, useEffect, useRef } from 'react';
import Popup from '../../components/Popup';
import Select from '../../components/Select';
import { Send, Lock, Globe2, UserX, User, ArrowRight, Shield, BookMarked, Archive } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { addReport } from '../../services/mockStore';
import { getSettings } from '../../services/mockSettings';
import { getStudentProfile } from '../../services/mockProfiles';
import { saveDraft, getDraftById, deleteDraft, countDrafts } from '../../services/draftStore';
import { createReport, getBox } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { friendlyError } from '../../utils/friendlyError';
import { slugifyType, TYPE_LABEL } from '../../services/mockStore';

/** Conserva etichette custom; normalizza solo le frasi default tipo "Un problema". */
function resolveStoredType(tipo, fallback = 'problema') {
  const s = slugifyType(tipo || fallback);
  if (!s) return 'problema';
  if (TYPE_LABEL[s]) return s;
  if (/^un[ao]?\s+problema$/.test(s) || s === 'problemi') return 'problema';
  if (/^un[ao]?\s+proposta$/.test(s) || s === 'proposte') return 'proposta';
  if (/^un[ao]?\s+dubbio$/.test(s) || s === 'dubbi') return 'dubbio';
  return s;
}

const TITLE_MIN = 5;
const DESC_MIN = 20;

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
  const isDemo = slug === 'demo';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const { profile } = useAuth();

  const settings = getSettings();
  const studentProfile = getStudentProfile();

  // Categorie: mock per demo, Supabase per reale
  const [categoryOptions, setCategoryOptions] = useState(
    isDemo ? (settings.categories.length ? settings.categories : ['Un problema', 'Una proposta', 'Un dubbio']) : []
  );

  useEffect(() => {
    if (isDemo) return;
    getBox(slug).then(box => {
      if (box?.categories?.length) setCategoryOptions(box.categories);
      else setCategoryOptions(['Un problema', 'Una proposta', 'Un dubbio']);
    }).catch(console.error);
  }, [isDemo, slug]);

  // Carica bozza se c'è un draftId nell'URL
  const existingDraft = draftId ? getDraftById(draftId, slug) : null;

  const defaultAnon = isDemo ? studentProfile.defaultAnon : (profile?.default_anon ?? true);

  const [isPublic, setIsPublic] = useState(existingDraft?.isPublic ?? false);
  const [anonimo, setAnonimo] = useState(existingDraft?.anonimo ?? defaultAnon);
  const [titolo, setTitolo] = useState(existingDraft?.titolo || '');
  const [tipo, setTipo] = useState(existingDraft?.tipo || '');
  const [problema, setProblema] = useState(existingDraft?.problema || '');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState(''); // '' | 'saved'
  const [fieldErrors, setFieldErrors] = useState({});
  const [shakeToken, setShakeToken] = useState(0);
  const [submitError, setSubmitError] = useState('');

  const titleRef = useRef(null);
  const tipoRef = useRef(null);
  const descRef = useRef(null);

  const totalDrafts = countDrafts(slug);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (titolo.trim().length < TITLE_MIN) {
      next.titolo = `Almeno ${TITLE_MIN} caratteri (ora ${titolo.trim().length}).`;
    }
    if (!tipo || !categoryOptions.includes(tipo)) {
      next.tipo = 'Seleziona una categoria.';
    }
    if (problema.trim().length < DESC_MIN) {
      next.problema = `Almeno ${DESC_MIN} caratteri (ora ${problema.trim().length}).`;
    }
    return next;
  };

  const focusFirstError = (errors) => {
    const order = [
      ['titolo', titleRef],
      ['tipo', tipoRef],
      ['problema', descRef],
    ];
    for (const [key, ref] of order) {
      if (errors[key] && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = ref.current.querySelector?.('input, textarea, button') || ref.current;
        if (typeof focusable.focus === 'function') {
          setTimeout(() => focusable.focus({ preventScroll: true }), 280);
        }
        break;
      }
    }
  };

  const handleSaveDraft = () => {
    saveDraft({ id: draftId || undefined, titolo, tipo, problema, isPublic, anonimo, boxSlug: slug });
    setDraftFeedback('saved');
    setTimeout(() => setDraftFeedback(''), 2000);
  };

  const handleInvia = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShakeToken((t) => t + 1);
      setSubmitError('');
      // Aspetta un frame così le classi error/shake sono applicate prima dello scroll
      requestAnimationFrame(() => focusFirstError(errors));
      return;
    }

    setFieldErrors({});
    setSubmitError('');
    setLoading(true);

    try {
      if (isDemo) {
        // DEMO: salva su mockStore
        await new Promise(r => setTimeout(r, 1000));
        addReport({
          type: resolveStoredType(tipo, categoryOptions[0]),
          title: titolo.trim(),
          content: problema.trim(),
          isPublic,
          anonimo,
          authorName: `${studentProfile.nome} ${studentProfile.cognome}`.trim() || 'Tu',
        });
        if (draftId) deleteDraft(draftId, slug);
      } else {
        // REALE: salva su Supabase
        await createReport({
          boxSlug: slug,
          type: resolveStoredType(tipo, categoryOptions[0]),
          title: titolo.trim(),
          content: problema.trim(),
          isPublic,
          isAnonymous: anonimo,
        });
        if (draftId) deleteDraft(draftId, slug);
      }
      setShowPopup(true);
    } catch (err) {
      setSubmitError(friendlyError(err, 'Errore durante l\'invio. Riprova.'));
    } finally {
      setLoading(false);
    }
  };

  const titleInvalid = !!fieldErrors.titolo;
  const tipoInvalid = !!fieldErrors.tipo;
  const descInvalid = !!fieldErrors.problema;

  return (
    <form onSubmit={handleInvia} className="new-report-grid" noValidate>

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
            <span>La tua identità non è collegata a questa segnalazione — gli amministratori non vedono il tuo nome.</span>
          </div>
        )}
      </div>

      {/* Colonna sinistra — Dettagli */}
      <div className="new-report-col-left">
        {submitError && (
          <div style={{ background: 'var(--b-red)', color: 'white', padding: '12px 16px', marginBottom: 16, border: '2px solid var(--b-black)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>
            Attenzione: {submitError}
          </div>
        )}

        <div className="flat-panel">
          <h3 style={{ textTransform: 'uppercase', marginBottom: 20, borderBottom: '2px solid var(--b-black)', paddingBottom: 12 }}>
            Dettagli
          </h3>

          <div
            ref={titleRef}
            key={titleInvalid ? `titolo-shake-${shakeToken}` : 'titolo-ok'}
            className={titleInvalid ? 'field-shake' : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <label className={titleInvalid ? 'field-label-error' : undefined}>Titolo Riassuntivo</label>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: titleInvalid ? 'var(--b-red)' : 'var(--b-gray)',
              }}>
                {titolo.length}/80 · min {TITLE_MIN}
              </span>
            </div>
            <input
              placeholder="Es. Mancano sedie in laboratorio..."
              value={titolo}
              onChange={(e) => {
                setTitolo(e.target.value);
                clearFieldError('titolo');
              }}
              maxLength={80}
              id="new-report-title"
              className={titleInvalid ? 'field-invalid' : undefined}
              aria-invalid={titleInvalid}
            />
            {titleInvalid && <div className="field-hint-error">{fieldErrors.titolo}</div>}
          </div>

          <div
            ref={tipoRef}
            key={tipoInvalid ? `tipo-shake-${shakeToken}` : 'tipo-ok'}
            className={tipoInvalid ? 'field-shake' : undefined}
          >
            <label className={tipoInvalid ? 'field-label-error' : undefined}>Categoria</label>
            <Select
              value={tipo}
              onChange={(v) => {
                setTipo(v);
                clearFieldError('tipo');
              }}
              options={categoryOptions}
              placeholder="Seleziona una categoria"
              error={tipoInvalid}
            />
            {tipoInvalid && <div className="field-hint-error" style={{ marginTop: -8 }}>{fieldErrors.tipo}</div>}
          </div>

          <div
            ref={descRef}
            key={descInvalid ? `desc-shake-${shakeToken}` : 'desc-ok'}
            className={descInvalid ? 'field-shake' : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <label className={descInvalid ? 'field-label-error' : undefined}>Descrizione</label>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: descInvalid ? 'var(--b-red)' : 'var(--b-gray)',
              }}>
                {problema.length}/1000 · min {DESC_MIN}
              </span>
            </div>
            <div
              className={descInvalid ? 'field-invalid' : undefined}
              style={{
                position: 'relative', overflow: 'hidden',
                background: anonimo ? 'var(--b-cream)' : 'var(--b-white)',
                transition: 'background 0.3s ease',
                border: descInvalid ? undefined : '2px solid var(--b-black)',
              }}
            >
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
                onChange={(e) => {
                  setProblema(e.target.value);
                  clearFieldError('problema');
                }}
                maxLength={1000}
                style={{ minHeight: 200, width: '100%', border: 'none', boxShadow: 'none', margin: 0, background: 'transparent', position: 'relative', zIndex: 1, resize: 'vertical' }}
                id="new-report-desc"
                aria-invalid={descInvalid}
              />
            </div>
            {descInvalid && <div className="field-hint-error">{fieldErrors.problema}</div>}
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
