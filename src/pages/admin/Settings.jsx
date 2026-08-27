import { useState, useEffect } from 'react';
import { Check, Link, Plus, Trash2, ScrollText, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import CopyLinkButton from '../../components/CopyLinkButton';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
// Mock (solo per la demo)
import { getSettings as getSettingsMock, saveSettings as saveSettingsMock } from '../../services/mockSettings';
// Reale
import { getBoxAdmin, updateBox, getBox } from '../../services/db';

function BrutToggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? 'Disattiva opzione' : 'Attiva opzione'}
      aria-pressed={on}
      style={{
        width: 52, height: 28, background: on ? 'var(--b-yellow)' : 'var(--b-gray-l)',
        border: '2px solid var(--b-black)', cursor: 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.1s',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 24 : 3,
        width: 18, height: 18, background: 'var(--b-black)',
        transition: 'left 0.12s',
      }} />
    </button>
  );
}

export default function Settings() {
  const location = useLocation();
  const { profile, refreshProfile } = useAuth();
  const isDemo = location.pathname.startsWith('/demo/admin');
  const boxSlug = isDemo ? 'demo' : profile?.box_slug;

  // Stato form (popolato al caricamento)
  const [emails, setEmails] = useState('');
  const [slug, setSlug] = useState('');
  const [savedSlug, setSavedSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requireClass, setRequireClass] = useState(false);
  const [emailFilterMode, setEmailFilterMode] = useState('exact');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [regolamento, setRegolamento] = useState('');
  const [savingRegolamento, setSavingRegolamento] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveOk, setSaveOk] = useState(true);
  const [loading, setLoading] = useState(true);

  // Carica le impostazioni all'avvio
  useEffect(() => {
    if (isDemo) {
      // DEMO: legge da mockSettings
      const s = getSettingsMock();
      setSlug(s.slug || '');
      setSavedSlug(s.slug || '');
      setEmails((s.whitelist || []).join('\n'));
      setRequireClass(s.requireClass || false);
      setEmailFilterMode(s.emailFilterMode || 'exact');
      setCategories((s.categories || []).map((name, idx) => ({ id: idx + 1, name })));
      setRegolamento(s.regolamento || '');
      setLoading(false);
    } else if (boxSlug) {
      // REALE: legge da Supabase
      getBoxAdmin(boxSlug)
        .then(box => {
          if (!box) return;
          setSlug(box.slug || '');
          setSavedSlug(box.slug || '');
          setEmails((box.whitelist || []).join('\n'));
          setRequireClass(box.require_class || false);
          setEmailFilterMode(box.email_filter_mode || 'exact');
          setCategories((box.categories || []).map((name, idx) => ({ id: idx + 1, name })));
          setRegolamento(box.regolamento || '');
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (profile) {
      // Profilo caricato ma senza box collegata: inutile aspettare oltre
      setLoading(false);
    }
  }, [isDemo, boxSlug, profile]);

  const getEmailLines = () =>
    emails.split(/[\n,;]+/).map(item => item.trim().toLowerCase()).filter(Boolean);

  // Salva su Supabase o su mockSettings
  const persistSettings = async (overrides = {}) => {
    const catNames = (overrides.categories ?? categories.map(c => c.name.trim()).filter(Boolean))
      .map((name) => String(name || '').trim())
      .filter(Boolean);
    if (catNames.length === 0) {
      throw new Error('Serve almeno una categoria.');
    }
    const validEmails = getEmailLines();
    const payload = {
      whitelist: validEmails,
      require_class: requireClass,
      email_filter_mode: emailFilterMode,
      ...overrides,
      categories: catNames,
    };

    if (isDemo) {
      // DEMO: salva su localStorage
      const current = getSettingsMock();
      const saved = saveSettingsMock({
        ...current,
        slug: payload.slug ?? slug,
        emailFilterMode: payload.email_filter_mode,
        whitelist: payload.whitelist,
        requireClass: payload.require_class,
        categories: payload.categories,
        regolamento: Object.prototype.hasOwnProperty.call(overrides, 'regolamento')
          ? overrides.regolamento
          : current.regolamento,
      });
      return saved;
    } else {
      // REALE: aggiorna su Supabase
      await updateBox(boxSlug, payload);
      return payload;
    }
  };

  const showSave = (msg, type = 'success') => {
    setSaveMsg(msg);
    setSaveOk(type !== 'error');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSaveSlug = async () => {
    if (slug === savedSlug) return;
    if (slug.length < 3) {
      showSave('Il link deve avere almeno 3 caratteri.', 'error');
      return;
    }
    setSavingSlug(true);
    try {
      if (!isDemo) {
        // Controllo disponibilità
        const existing = await getBox(slug).catch(() => null);
        if (existing && existing.slug !== savedSlug) {
          showSave('Questo link è già in uso.', 'error');
          setSavingSlug(false);
          return;
        }
      }
      
      await persistSettings({ slug });
      setSavedSlug(slug);
      if (!isDemo) {
        await refreshProfile();
      }
      showSave('Link aggiornato con successo.');
    } catch (e) {
      showSave('Errore nell\'aggiornamento.', 'error');
    } finally {
      setSavingSlug(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const nextCategories = [...categories, { id: Date.now(), name: newCategory.trim() }];
    setCategories(nextCategories);
    setNewCategory('');
    try {
      await persistSettings({ categories: nextCategories.map(c => c.name.trim()).filter(Boolean) });
      showSave('Categorie aggiornate.');
    } catch { showSave('Errore nel salvataggio.', 'error'); }
  };

  const handleRemoveCategory = async (id) => {
    if (categories.length <= 1) {
      showSave('Serve almeno una categoria.', 'error');
      return;
    }
    const nextCategories = categories.filter(c => c.id !== id);
    if (nextCategories.length === 0) {
      const fallback = [{ id: Date.now(), name: 'Altro' }];
      setCategories(fallback);
      try {
        await persistSettings({ categories: ['Altro'] });
        showSave('Categoria ripristinata a “Altro”.');
      } catch { showSave('Errore nel salvataggio.', 'error'); }
      return;
    }
    setCategories(nextCategories);
    try {
      await persistSettings({ categories: nextCategories.map(c => c.name.trim()).filter(Boolean) });
      showSave('Categoria rimossa.');
    } catch { showSave('Errore nel salvataggio.', 'error'); }
  };

  const handleSaveWhitelist = async () => {
    try {
      await persistSettings({ whitelist: getEmailLines() });
      showSave('Whitelist salvata.');
    } catch { showSave('Errore nel salvataggio.', 'error'); }
  };

  const handleToggleRequireClass = async () => {
    const next = !requireClass;
    setRequireClass(next);
    try {
      await persistSettings({ require_class: next });
      showSave('Regola profilo aggiornata.');
    } catch { showSave('Errore nel salvataggio.', 'error'); }
  };

  const handleSaveRegolamento = async () => {
    setSavingRegolamento(true);
    try {
      await persistSettings({ regolamento });
      showSave('Regolamento salvato.');
    } catch (e) {
      console.error(e);
      showSave('Errore nel salvataggio.', 'error');
    } finally {
      setSavingRegolamento(false);
    }
  };

  const handleResetBox = async () => {
    try {
      if (!isDemo) {
        const { resetBox } = await import('../../services/db');
        await resetBox(boxSlug);
      }
      showSave("Tutte le segnalazioni sono state eliminate.", "success");
      setShowResetModal(false);
    } catch (err) {
      console.error(err);
      showSave("Errore durante il reset dello sportello.", "error");
    }
  };

  const handleDeleteBox = async () => {
    try {
      if (!isDemo) {
        const { deleteBox } = await import('../../services/db');
        await deleteBox(boxSlug);
      }
      showSave("Sportello eliminato.", "success");
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);
    } catch (err) {
      console.error(err);
      showSave("Errore durante l'eliminazione dello sportello.", "error");
    }
  };

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 8, marginLeft: 2, marginTop: 24 }}>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ color: 'var(--b-gray)', fontWeight: 700 }}>Caricamento impostazioni...</div>
      </div>
    );
  }

  // Profilo admin senza sportello collegato (es. registrazione fallita a metà)
  if (!isDemo && !boxSlug) {
    return (
      <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="flat-panel" style={{ maxWidth: 480, textAlign: 'center', padding: 24 }}>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 8 }}>Nessuno sportello collegato</h3>
          <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', margin: 0 }}>
            Il tuo profilo admin non è collegato a nessuna Box.
            Probabilmente la registrazione non è andata a buon fine:
            contatta il supporto o ripeti la registrazione dello sportello.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="admin-page admin-page-wide"
      style={{ paddingBottom: 60 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 8, height: 36, background: 'var(--b-blue)', border: '2px solid var(--b-black)' }} />
          <h1 style={{ textTransform: 'uppercase', margin: 0 }}>Impostazioni</h1>
        </div>
        <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', paddingLeft: 18, fontWeight: 600 }}>
          Configura gli accessi e le regole per la tua scuola.
        </p>
      </div>

      {saveMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            marginBottom: 16,
            padding: '12px 16px',
            background: saveOk ? 'var(--b-yellow)' : 'var(--b-red)',
            color: saveOk ? 'var(--b-black)' : '#FFFFFF',
            border: '2px solid var(--b-black)',
            boxShadow: 'var(--b-shadow-sm)',
            fontSize: '0.82rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {saveOk ? '✓' : '✕'} {saveMsg}
        </div>
      )}

      {/* Box Link Management */}
      <SectionTitle>Link Dillo Qui</SectionTitle>
      <div className="flat-panel" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: 'var(--b-blue)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Link size={17} strokeWidth={2.5} color="#FFFFFF" />
          </div>
          <div>
            <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.9rem' }}>Gestione Link</h3>
            <p style={{ color: 'var(--b-gray)', fontSize: '0.82rem', margin: 0 }}>
              Puoi modificare l'indirizzo web del tuo sportello. Assicurati che sia disponibile.
            </p>
          </div>
        </div>
        <label>Indirizzo Web</label>
        <div className="settings-url-bar">
          <div className="settings-url-prefix">dilloqui.netlify.app/box/</div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            style={{ flex: 1, margin: 0, border: 'none', background: 'transparent', boxShadow: 'none', padding: '12px 14px', fontSize: '1rem', fontWeight: 800, color: 'var(--b-black)', outline: 'none', fontFamily: "'IBM Plex Mono', monospace" }}
            id="settings-slug-input"
          />
          <button
            type="button"
            className="btn-primary settings-url-btn"
            onClick={handleSaveSlug}
            disabled={savingSlug || !slug.trim() || slug === savedSlug}
            id="settings-slug-save"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 18px', border: 'none', borderLeft: '2px solid var(--b-black)',
              boxShadow: 'none', fontSize: '0.78rem', letterSpacing: '0.04em',
              alignSelf: 'stretch', flexShrink: 0, minWidth: 100, borderRadius: 0,
              width: 'auto'
            }}
          >
            {savingSlug ? '...' : (
              <>
                <Save size={16} strokeWidth={2.5} /> Salva
              </>
            )}
          </button>
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: slug !== savedSlug ? 'var(--b-orange)' : 'var(--b-green)',
          display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, marginLeft: 2,
        }}>
          <Check size={13} strokeWidth={3} /> {slug !== savedSlug ? 'Modifiche non salvate' : 'Link attivo'}
        </div>
      </div>

      {/* Categories */}
      <SectionTitle>Categorie Segnalazioni</SectionTitle>
      <div className="flat-panel">
        <p style={{ color: 'var(--b-gray)', marginBottom: 16, fontSize: '0.9rem' }}>
          Personalizza le opzioni tra cui gli studenti scelgono (es. &ldquo;Bullismo&rdquo;, &ldquo;Proposta Gita&rdquo;, &ldquo;Problema Tecnico&rdquo;).
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="Nuova categoria..." style={{ margin: 0, flex: 1 }} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} id="settings-new-cat-input" />
          <button onClick={handleAddCategory} aria-label="Aggiungi categoria" style={{ width: 48, background: 'var(--b-yellow)', border: 'var(--b-border)', boxShadow: 'var(--b-shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'box-shadow 0.1s, transform 0.1s' }} onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow-sm)'; e.currentTarget.style.transform = 'none'; }} id="settings-add-cat-btn">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {categories.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--b-gray)', border: '2px dashed var(--b-gray-l)', fontSize: '0.875rem' }}>Nessuna categoria impostata.</div>}
          {categories.map((cat, idx) => (
            <div key={cat.id} style={{ padding: '12px 16px', background: idx % 2 === 0 ? 'var(--b-white)' : 'var(--b-cream)', border: '2px solid var(--b-black)', borderBottom: idx < categories.length - 1 ? '1px solid var(--b-black)' : '2px solid var(--b-black)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cat.name}</span>
              <button
                onClick={() => handleRemoveCategory(cat.id)}
                disabled={categories.length <= 1}
                title={categories.length <= 1 ? 'Serve almeno una categoria' : `Elimina categoria ${cat.name}`}
                aria-label={`Elimina categoria ${cat.name}`}
                style={{
                  color: 'var(--b-gray)', background: 'none', border: '2px solid var(--b-gray-l)',
                  cursor: categories.length <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, opacity: categories.length <= 1 ? 0.4 : 1,
                  transition: 'background 0.1s, border-color 0.1s',
                }}
                onMouseOver={e => {
                  if (categories.length <= 1) return;
                  e.currentTarget.style.background = '#FFDADA';
                  e.currentTarget.style.borderColor = 'var(--b-red)';
                  e.currentTarget.style.color = 'var(--b-red)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.borderColor = 'var(--b-gray-l)';
                  e.currentTarget.style.color = 'var(--b-gray)';
                }}
                id={`delete-cat-${cat.id}`}
              >
                <Trash2 size={15} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Whitelist */}
      <SectionTitle>Filtro Accessi (Email / Dominio)</SectionTitle>
      <div className="flat-panel">
        <p style={{ color: 'var(--b-gray)', marginBottom: 14, fontSize: '0.9rem' }}>Configura le regole di accesso per gli studenti della tua scuola.</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px solid var(--b-black)', background: 'var(--b-cream)', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: 4 }}>Controllo tramite Dominio</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--b-gray)' }}>Se attivo, basterà inserire es. <strong>@scuola.edu.it</strong> per ammettere tutti gli alunni.</div>
          </div>
          <BrutToggle on={emailFilterMode === 'domain'} onClick={async () => {
            const nextMode = emailFilterMode === 'domain' ? 'exact' : 'domain';
            setEmailFilterMode(nextMode);
            try {
              await persistSettings({ email_filter_mode: nextMode });
              showSave(`Modalità filtro: ${nextMode === 'domain' ? 'Dominio' : 'Email Esatta'}.`);
            } catch { showSave('Errore nel salvataggio.', 'error'); }
          }} />
        </div>
        <label>Lista Autorizzati ({emailFilterMode === 'domain' ? 'Dominio Autorizzato' : 'Email Esatte'})</label>
        {emailFilterMode === 'domain' ? (
          <div style={{ display: 'flex', border: '2px solid var(--b-black)', background: 'var(--b-white)', marginBottom: 16 }}>
            <div style={{ padding: '12px 14px', background: 'var(--b-cream)', borderRight: '2px solid var(--b-black)', color: 'var(--b-gray)', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>*@</div>
            <input type="text" placeholder="istituto.edu.it" value={emails.replace(/[@]/g, '')} onChange={(e) => setEmails('@' + e.target.value.replace(/[@]/g, ''))} style={{ border: 'none', background: 'transparent', padding: '12px 14px', flex: 1, outline: 'none', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }} id="settings-whitelist-domain" />
          </div>
        ) : (
          <textarea value={emails} onChange={(e) => setEmails(e.target.value)} style={{ minHeight: 160, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.875rem', marginBottom: 16 }} id="settings-whitelist-textarea" placeholder={'mario.rossi@scuola.it\ngiulia.bianchi@scuola.it'} />
        )}
        <button className="btn-primary" style={{ marginTop: 4 }} id="settings-whitelist-save" onClick={handleSaveWhitelist}>
          <Check size={16} strokeWidth={3} /> Salva Whitelist
        </button>
        <p style={{ color: 'var(--b-gray)', margin: '10px 0 0', fontSize: '0.8rem', fontWeight: 600 }}>
          Se la whitelist è vuota, nessuno studente (tranne in /box/demo) può ricevere OTP.
        </p>
      </div>

      {/* Dati Studenti */}
      <SectionTitle>Dati Studenti al Primo Accesso</SectionTitle>
      <div className="flat-panel">
        <p style={{ color: 'var(--b-gray)', marginBottom: 16, fontSize: '0.9rem' }}>Nome e Cognome sono sempre richiesti. Configura eventuali dati aggiuntivi.</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px solid var(--b-black)', background: 'var(--b-cream)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: 4 }}>Richiedi Classe / Sezione</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--b-gray)' }}>Gli studenti inseriscono la loro classe (es. 3B)</div>
          </div>
          <BrutToggle on={requireClass} onClick={handleToggleRequireClass} />
        </div>
      </div>

      {/* Regolamento */}
      <SectionTitle>Regolamento dello Sportello</SectionTitle>
      <div className="flat-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--b-yellow)', border: '2px solid var(--b-black)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ScrollText size={17} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.9rem' }}>Testo per gli studenti</h3>
            <p style={{ color: 'var(--b-gray)', fontSize: '0.82rem', margin: 0 }}>
              Visibile nella sezione Regolamento dello sportello.
            </p>
          </div>
        </div>
        <textarea
          value={regolamento}
          onChange={(e) => setRegolamento(e.target.value)}
          placeholder={'Es.\n1. Rispetta le persone...\n2. Usa lo sportello in buona fede...'}
          style={{ minHeight: 200, fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 14 }}
          id="settings-regolamento"
        />
        <button
          className="btn-primary"
          id="settings-regolamento-save"
          onClick={handleSaveRegolamento}
          disabled={savingRegolamento}
        >
          <Check size={16} strokeWidth={3} />
          {savingRegolamento ? 'Salvataggio...' : 'Salva Regolamento'}
        </button>
      </div>

      {/* Danger Zone (GDPR) */}
      <SectionTitle><span style={{ color: 'var(--b-red)' }}>Zona Pericolosa</span></SectionTitle>
      <div className="flat-panel" style={{ border: '3px solid var(--b-red)' }}>
        <p style={{ color: 'var(--b-gray)', marginBottom: 20, fontSize: '0.9rem' }}>
          Azioni distruttive e irreversibili. Da usare con cautela o a fine anno scolastico.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '2px dashed var(--b-gray-l)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--b-black)' }}>Svuota Sportello (Reset)</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--b-gray)' }}>Elimina tutte le segnalazioni e i messaggi ricevuti finora.</p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="btn-secondary"
              style={{ color: 'var(--b-red)', borderColor: 'var(--b-red)' }}
            >
              Svuota
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--b-red)' }}>Elimina Sportello</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--b-gray)' }}>Distrugge definitivamente la Box e <b>tutti</b> i dati al suo interno.</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                background: 'var(--b-red)', color: '#fff', border: '2px solid var(--b-black)',
                padding: '8px 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem',
                cursor: 'pointer', boxShadow: '3px 3px 0 var(--b-black)'
              }}
            >
              <Trash2 size={16} style={{ marginBottom: -3, marginRight: 4 }} />
              Elimina
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetBox}
        title="Svuota Sportello"
        message="ATTENZIONE: Stai per eliminare TUTTE le segnalazioni, i messaggi e i voti di questo sportello. L'operazione è irreversibile e cancellerà i dati per sempre. Vuoi continuare?"
        confirmText="Svuota tutto"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBox}
        title="Elimina Sportello"
        message="ATTENZIONE ESTREMA: Stai per distruggere completamente questo sportello, inclusi tutti i dati, le segnalazioni e la whitelist. L'operazione è irreversibile. Procedere?"
        confirmText="Elimina Definitivamente"
        isDanger={true}
      />
    </motion.div>
  );
}
