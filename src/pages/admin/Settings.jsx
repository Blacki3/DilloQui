import { useState } from 'react';
import Button from '../../components/Button';
import { Link, Check, Plus, Trash2 } from 'lucide-react';

export default function Settings() {
  const [emails, setEmails] = useState("studente1@scuola.edu.it\nstudente2@scuola.edu.it");
  
  // Link Management State
  const [savedSlug, setSavedSlug] = useState("liceo-ponti");
  const [slug, setSlug] = useState("liceo-ponti");
  const [savingSlug, setSavingSlug] = useState(false);

  // Categories Management State
  const [categories, setCategories] = useState([
    { id: 1, name: 'Un problema' },
    { id: 2, name: 'Una proposta' },
    { id: 3, name: 'Un dubbio' }
  ]);
  const [newCategory, setNewCategory] = useState('');

  const handleSaveSlug = () => {
    setSavingSlug(true);
    setTimeout(() => {
      setSavingSlug(false);
      setSavedSlug(slug);
    }, 800);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setCategories([...categories, { id: Date.now(), name: newCategory.trim() }]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (idToRemove) => {
    setCategories(categories.filter(cat => cat.id !== idToRemove));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '8px', color: 'var(--color-text-main)' }}>Impostazioni</h1>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Configura gli accessi e le regole per la tua scuola.</div>
      </div>

      {/* Box Link Management */}
      <div className="flat-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link size={20} color="var(--color-primary)" /> Gestione Link Dillo Qui
        </h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px', fontSize: '0.95rem' }}>
          Personalizza l'indirizzo web per la tua scuola. Assicurati di usare un nome riconoscibile dai tuoi studenti.
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '4px', gap: '8px' }}>
          <div style={{ padding: '12px', color: 'var(--color-text-muted)', fontWeight: '500', userSelect: 'none' }}>
            dilloqui.app/box/
          </div>
          <input 
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="nome-scuola"
            style={{ 
              margin: 0, 
              border: 'none', 
              background: 'transparent', 
              boxShadow: 'none', 
              padding: '12px 0', 
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'var(--color-primary)'
            }} 
          />
          
          {slug !== savedSlug && (
            <div style={{ paddingRight: '4px' }}>
              <Button onClick={handleSaveSlug} loading={savingSlug} style={{ width: 'auto', padding: '8px 16px', margin: 0, borderRadius: '8px' }}>
                Salva
              </Button>
            </div>
          )}
          {slug === savedSlug && (
            <div style={{ paddingRight: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: '600', fontSize: '0.875rem' }}>
              <Check size={16} /> Attivo
            </div>
          )}
        </div>
      </div>

      {/* Categories Management */}
      <div className="flat-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px', color: 'var(--color-text-main)' }}>Categorie Segnalazioni</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '0.95rem' }}>
          Personalizza le opzioni tra cui gli studenti possono scegliere quando effettuano una segnalazione (es. "Bullismo", "Proposta Gita", "Problema Tecnico").
        </p>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input 
            placeholder="Nuova categoria..." 
            style={{ margin: 0 }} 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button onClick={handleAddCategory} style={{ width: 'auto', margin: 0, padding: '0 20px' }}>
            <Plus size={20} />
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nessuna categoria impostata.</div>
          )}
          {categories.map((cat) => (
            <div key={cat.id} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: '500' }}>{cat.name}</span>
              <button onClick={() => handleRemoveCategory(cat.id)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-danger)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flat-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px', color: 'var(--color-text-main)' }}>Whitelist Studenti</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '0.95rem' }}>
          Inserisci le email scolastiche autorizzate ad accedere a Dillo Qui (una per riga). Solo queste email potranno ricevere il codice OTP.
        </p>
        
        <textarea 
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          style={{ height: '200px', fontFamily: 'monospace', marginBottom: '16px' }}
        />
        
        <Button style={{ width: 'auto' }}>Salva Whitelist</Button>
      </div>

      <div className="flat-panel" style={{ padding: '32px' }}>
        <h3 style={{ marginBottom: '8px', color: 'var(--color-text-main)' }}>Notifiche Email</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '0.95rem' }}>
          Aggiungi gli indirizzi email dei docenti referenti che riceveranno un avviso ad ogni nuova segnalazione.
        </p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <input placeholder="email.docente@scuola.edu.it" style={{ margin: 0 }} />
          <Button style={{ width: 'auto', margin: 0 }}>Aggiungi</Button>
        </div>

        <div style={{ marginTop: '24px' }}>
          {/* Mock list */}
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' }}>
            <span style={{ fontWeight: '500' }}>preside@scuola.edu.it</span>
            <button style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-danger)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
