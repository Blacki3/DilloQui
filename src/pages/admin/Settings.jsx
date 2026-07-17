import { useState } from 'react';
import { Check, Link, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import CopyLinkButton from '../../components/CopyLinkButton';
import { getSettings, saveSettings, isValidEmail } from '../../services/mockSettings';

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
  const initial = getSettings();
  const [emails, setEmails] = useState(initial.whitelist.join('\n'));
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [slug, setSlug] = useState(initial.slug);
  const [savingSlug, setSavingSlug] = useState(false);
  const [requireClass, setRequireClass] = useState(initial.requireClass);
  const [emailFilterMode, setEmailFilterMode] = useState(initial.emailFilterMode || 'exact');
  const [categories, setCategories] = useState(
    initial.categories.map((name, idx) => ({ id: idx + 1, name })),
  );
  const [newCategory, setNewCategory] = useState('');
  const [notifEmails, setNotifEmails] = useState(['preside@scuola.edu.it']);
  const [newNotif, setNewNotif] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const getEmailLines = () =>
    emails
      .split(/[\n,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

  const buildPayload = (overrides = {}) => {
    const categoryNames = categories.map((cat) => cat.name.trim()).filter(Boolean);
    const validEmails = getEmailLines();
    return {
      ...getSettings(),
      slug,
      emailFilterMode,
      whitelist: validEmails,
      requireClass,
      categories: categoryNames,
      ...overrides,
    };
  };

  const persistSettings = (overrides = {}) => {
    const saved = saveSettings(buildPayload(overrides));
    setSlug(saved.slug);
    setSavedSlug(saved.slug);
    setEmails(saved.whitelist.join('\n'));
    setEmailFilterMode(saved.emailFilterMode || 'exact');
    setCategories(saved.categories.map((name, idx) => ({ id: idx + 1, name })));
    return saved;
  };

  const handleSaveSlug = () => {
    setSavingSlug(true);
    setTimeout(() => {
      const saved = persistSettings();
      setSavingSlug(false);
      setSavedSlug(saved.slug);
      setSaveMsg('Impostazioni salvate.');
    }, 500);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const nextCategories = [...categories, { id: Date.now(), name: newCategory.trim() }];
      setCategories(nextCategories);
      persistSettings({
        categories: nextCategories.map((cat) => cat.name.trim()).filter(Boolean),
      });
      setNewCategory('');
      setSaveMsg('Categorie aggiornate.');
    }
  };

  const handleRemoveCategory = (id) => {
    const nextCategories = categories.filter((c) => c.id !== id);
    setCategories(nextCategories);
    persistSettings({
      categories: nextCategories.map((cat) => cat.name.trim()).filter(Boolean),
    });
    setSaveMsg('Categoria rimossa.');
  };

  const handleAddNotif = () => {
    if (newNotif.trim() && !notifEmails.includes(newNotif.trim())) {
      setNotifEmails([...notifEmails, newNotif.trim()]);
      setNewNotif('');
      setSaveMsg('Email di notifica aggiunta.');
    }
  };

  const handleRemoveNotif = (email) => {
    setNotifEmails(notifEmails.filter(e => e !== email));
    setSaveMsg('Email di notifica rimossa.');
  };

  const handleSaveWhitelist = () => {
    const validEntries = getEmailLines();
    persistSettings({ whitelist: validEntries });
    setSaveMsg('Whitelist salvata.');
  };

  const handleToggleRequireClass = () => {
    const next = !requireClass;
    setRequireClass(next);
    persistSettings({ requireClass: next });
    setSaveMsg('Regola profilo aggiornata.');
  };

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 8, marginLeft: 2, marginTop: 24 }}>
      {children}
    </div>
  );

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

      {/* Box Link Management */}
      <SectionTitle>Link Dillo Qui</SectionTitle>
      <div className="flat-panel" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: 'var(--b-blue)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Link size={17} strokeWidth={2.5} color="#FFFFFF" />
          </div>
          <div>
            <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.9rem' }}>Gestione Link</h3>
            <p style={{ color: 'var(--b-gray)', fontSize: '0.82rem', margin: 0 }}>Personalizza l'indirizzo web per la tua scuola.</p>
          </div>
        </div>

        <label>Indirizzo Web</label>
        <div className="settings-url-bar">
          <div className="settings-url-prefix">
            dilloqui.app/box/
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="nome-scuola"
            style={{
              flex: 1, margin: 0, border: 'none', background: 'transparent',
              boxShadow: 'none', padding: '12px 14px', fontSize: '1rem',
              fontWeight: 800, color: 'var(--b-black)', outline: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            id="settings-slug-input"
          />
          {slug === savedSlug ? (
            <CopyLinkButton
              url={`dilloqui.app/box/${slug}`}
              label="Copia"
              icon="copy"
              id="settings-slug-btn"
              style={{
                padding: '0 18px',
                border: 'none',
                borderLeft: '2px solid var(--b-black)',
                boxShadow: 'none',
                fontSize: '0.78rem',
                letterSpacing: '0.04em',
                alignSelf: 'stretch',
                flexShrink: 0,
                minWidth: 100,
              }}
            />
          ) : (
            <button
              onClick={handleSaveSlug}
              disabled={savingSlug}
              className="settings-url-btn"
              style={{
                padding: '0 18px',
                background: 'var(--b-yellow)',
                color: 'var(--b-black)', fontWeight: 800, cursor: 'pointer',
                fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 6, border: 'none',
                borderLeft: '2px solid var(--b-black)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
              id="settings-slug-save-btn"
            >
              {savingSlug ? 'Salvataggio...' : <><Check size={14} strokeWidth={3} /> Salva</>}
            </button>
          )}
        </div>
        {slug === savedSlug && (
          <div style={{ fontSize: '0.78rem', color: 'var(--b-green)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, marginLeft: 2 }}>
            <Check size={13} strokeWidth={3} /> Link attivo
          </div>
        )}
      </div>

      {/* Categories */}
      <SectionTitle>Categorie Segnalazioni</SectionTitle>
      <div className="flat-panel">
        <p style={{ color: 'var(--b-gray)', marginBottom: 16, fontSize: '0.9rem' }}>
          Personalizza le opzioni tra cui gli studenti scelgono (es. "Bullismo", "Proposta Gita", "Problema Tecnico").
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Nuova categoria..."
            style={{ margin: 0, flex: 1 }}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            id="settings-new-cat-input"
          />
          <button
            onClick={handleAddCategory}
            aria-label="Aggiungi categoria"
            style={{
              width: 48, background: 'var(--b-yellow)', border: 'var(--b-border)',
              boxShadow: 'var(--b-shadow-sm)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'box-shadow 0.1s, transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
            id="settings-add-cat-btn"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {categories.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--b-gray)', border: '2px dashed var(--b-gray-l)', fontSize: '0.875rem' }}>Nessuna categoria impostata.</div>
          )}
          {categories.map((cat, idx) => (
            <div key={cat.id} style={{
              padding: '12px 16px', background: idx % 2 === 0 ? 'var(--b-white)' : 'var(--b-cream)',
              border: '2px solid var(--b-black)', borderBottom: idx < categories.length - 1 ? '1px solid var(--b-black)' : '2px solid var(--b-black)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cat.name}</span>
              <button
                onClick={() => handleRemoveCategory(cat.id)}
                aria-label={`Elimina categoria ${cat.name}`}
                style={{ color: 'var(--b-gray)', background: 'none', border: '2px solid var(--b-gray-l)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, transition: 'background 0.1s, border-color 0.1s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#FFDADA'; e.currentTarget.style.borderColor = 'var(--b-red)'; e.currentTarget.style.color = 'var(--b-red)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--b-gray-l)'; e.currentTarget.style.color = 'var(--b-gray)'; }}
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
        <p style={{ color: 'var(--b-gray)', marginBottom: 14, fontSize: '0.9rem' }}>
          Configura le regole di accesso per gli studenti della tua scuola.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px solid var(--b-black)', background: 'var(--b-cream)', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: 4 }}>Controllo tramite Dominio</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--b-gray)' }}>Se attivo, basterà inserire es. <strong>@scuola.edu.it</strong> per ammettere tutti gli alunni. Altrimenti è richiesta l'email esatta.</div>
          </div>
          <BrutToggle
            on={emailFilterMode === 'domain'}
            onClick={() => {
              const nextMode = emailFilterMode === 'domain' ? 'exact' : 'domain';
              setEmailFilterMode(nextMode);
              persistSettings({ emailFilterMode: nextMode });
              setSaveMsg(`Modalità filtro aggiornata a ${nextMode === 'domain' ? 'Dominio' : 'Email Esatta'}.`);
            }}
          />
        </div>

        <label>Lista Autorizzati ({emailFilterMode === 'domain' ? 'Dominio Autorizzato' : 'Email Esatte'})</label>

        {emailFilterMode === 'domain' ? (
          <div style={{ display: 'flex', border: '2px solid var(--b-black)', background: 'var(--b-white)', marginBottom: 16 }}>
            <div style={{ padding: '12px 14px', background: 'var(--b-cream)', borderRight: '2px solid var(--b-black)', color: 'var(--b-gray)', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>
              *@
            </div>
            <input
              type="text"
              placeholder="istituto.edu.it"
              value={emails.replace(/[@]/g, '')}
              onChange={(e) => setEmails('@' + e.target.value.replace(/[@]/g, ''))}
              style={{ border: 'none', background: 'transparent', padding: '12px 14px', flex: 1, outline: 'none', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}
              id="settings-whitelist-domain"
            />
          </div>
        ) : (
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            style={{ minHeight: 160, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.875rem', marginBottom: 16 }}
            id="settings-whitelist-textarea"
            placeholder="mario.rossi@scuola.it&#10;giulia.bianchi@scuola.it"
          />
        )}
        <button className="btn-primary" style={{ marginTop: 4 }} id="settings-whitelist-save" onClick={handleSaveWhitelist}>
          <Check size={16} strokeWidth={3} /> Salva Whitelist
        </button>
        <p style={{ color: 'var(--b-gray)', margin: '10px 0 0', fontSize: '0.8rem', fontWeight: 600 }}>
          Se la whitelist è vuota, nessuno studente (tranne in `/box/demo`) può ricevere OTP.
        </p>
      </div>

      {/* Notifiche Email */}
      <SectionTitle>Notifiche Email Referenti</SectionTitle>
      <div className="flat-panel">
        <p style={{ color: 'var(--b-gray)', marginBottom: 14, fontSize: '0.9rem' }}>
          Email di coloro che riceveranno un avviso ad ogni nuova segnalazione.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder="email.docente@scuola.edu.it"
            style={{ margin: 0, flex: 1 }}
            id="settings-notif-email"
            value={newNotif}
            onChange={e => setNewNotif(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNotif()}
          />
          <button
            onClick={handleAddNotif}
            style={{
              padding: '0 20px', background: 'var(--b-blue)', color: '#FFFFFF',
              border: 'var(--b-border)', boxShadow: 'var(--b-shadow-sm)', cursor: 'pointer',
              fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase',
              fontFamily: "'Space Grotesk', sans-serif",
              transition: 'box-shadow 0.1s, transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
            id="settings-add-notif"
          >
            Aggiungi +
          </button>
        </div>

        {notifEmails.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--b-gray)', fontStyle: 'italic', padding: '8px 0' }}>Nessuna email impostata.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifEmails.map((email, idx) => (
              <div key={idx} style={{ border: '2px solid var(--b-black)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--b-cream)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.875rem', fontWeight: 600 }}>{email}</span>
                <button
                  onClick={() => handleRemoveNotif(email)}
                  style={{ color: 'var(--b-gray)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  aria-label={`Rimuovi ${email}`}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--b-red)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--b-gray)'}
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dati Studenti */}
      <SectionTitle>Dati Studenti al Primo Accesso</SectionTitle>
      <div className="flat-panel">
        <p style={{ color: 'var(--b-gray)', marginBottom: 16, fontSize: '0.9rem' }}>
          Nome e Cognome sono sempre richiesti. Configura eventuali dati aggiuntivi.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px solid var(--b-black)', background: 'var(--b-cream)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: 4 }}>Richiedi Classe / Sezione</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--b-gray)' }}>Gli studenti inseriscono la loro classe (es. 3B)</div>
          </div>
          <BrutToggle on={requireClass} onClick={handleToggleRequireClass} />
        </div>
      </div>

      {saveMsg && (
        <div style={{ marginTop: 14, fontSize: '0.82rem', fontWeight: 800, color: 'var(--b-green)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ✓ {saveMsg}
        </div>
      )}
    </motion.div>
  );
}
