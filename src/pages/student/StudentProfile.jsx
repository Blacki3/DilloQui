import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, Globe, Shield, Download, FileText, Lock, HelpCircle, 
  ChevronRight, BadgeCheck, LogOut, Check, Camera, User, ArrowLeft
} from 'lucide-react';

export default function StudentProfile({ email = 'student@scuola.edu.it' }) {
  const { logoutStudent } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(false);
  const [defaultAnon, setDefaultAnon] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Campi anagrafici
  const [nome, setNome] = useState('Mario');
  const [cognome, setCognome] = useState('Rossi');
  const [classe, setClasse] = useState('3B');

  const fileInputRef = useRef(null);

  // Initials from email
  const initials = email.split('@')[0].slice(0, 2).toUpperCase();

  const handleImageClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) console.log('Selected file:', file.name);
  };

  if (isEditingProfile) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => setIsEditingProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <ArrowLeft size={20} /> Indietro
          </button>
        </div>
        <h2 style={{ color: 'var(--color-text-main)', marginBottom: 20 }}>Dati Personali</h2>
        <div className="flat-panel" style={{ padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, fontSize: '1rem', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>Cognome</label>
            <input value={cognome} onChange={e => setCognome(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, fontSize: '1rem', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>Classe</label>
            <input value={classe} onChange={e => setClasse(e.target.value)} placeholder="Opzionale" style={{ width: '100%', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: 8, fontSize: '1rem', outline: 'none' }} />
          </div>
          <button className="btn-primary" onClick={() => setIsEditingProfile(false)} style={{ width: '100%' }}>
            Salva Modifiche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Avatar + info */}
      <div className="settings-avatar-wrap">
        <div className="settings-avatar" onClick={handleImageClick}>
          {initials}
          <div className="settings-avatar-badge" style={{ background: '#4b5563', border: '2px solid white' }}>
            <Camera size={14} color="white" />
          </div>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.875rem' }}>
          <BadgeCheck size={14} color="var(--color-primary)" /> Verificato
        </div>
        <div className="settings-email">{email}</div>
      </div>

      {/* Impostazioni */}
      <div className="settings-section-label">Account</div>
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
        <div className="settings-row" onClick={() => setIsEditingProfile(true)}>
          <User size={20} className="settings-row-icon" />
          <span className="settings-row-label">Dati Personali</span>
          <ChevronRight size={16} className="settings-row-arrow" />
        </div>
        <div className="settings-row">
          <Bell size={20} className="settings-row-icon" />
          <span className="settings-row-label">Notifiche Push</span>
          <button
            className={`toggle-switch ${notifications ? 'on' : ''}`}
            onClick={(e) => { e.stopPropagation(); setNotifications(!notifications); }}
          />
        </div>
        <div className="settings-row">
          <Globe size={20} className="settings-row-icon" />
          <span className="settings-row-label">Lingua</span>
          <span className="settings-row-value">Italiano</span>
          <ChevronRight size={16} className="settings-row-arrow" />
        </div>
      </div>

      {/* Privacy */}
      <div className="settings-section-label">Privacy</div>
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
        <div className="settings-row">
          <Shield size={20} className="settings-row-icon" />
          <span className="settings-row-label" style={{ lineHeight: 1.3 }}>
            Anonimato predefinito<br />
            <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>per nuove segnalazioni</span>
          </span>
          <button
            className={`toggle-switch ${defaultAnon ? 'on' : ''}`}
            onClick={() => setDefaultAnon(!defaultAnon)}
          />
        </div>
        <div className="settings-row">
          <Download size={20} className="settings-row-icon" />
          <span className="settings-row-label">Esporta i miei dati</span>
          <ChevronRight size={16} className="settings-row-arrow" />
        </div>
      </div>

      {/* Informazioni */}
      <div className="settings-section-label">Informazioni</div>
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 28, boxShadow: 'var(--shadow-card)' }}>
        <div className="settings-row">
          <FileText size={20} className="settings-row-icon" />
          <span className="settings-row-label">Regole dell'App</span>
          <ChevronRight size={16} className="settings-row-arrow" />
        </div>
        <div className="settings-row">
          <Lock size={20} className="settings-row-icon" />
          <span className="settings-row-label">Informativa sulla Privacy</span>
          <ChevronRight size={16} className="settings-row-arrow" />
        </div>
        <div className="settings-row">
          <HelpCircle size={20} className="settings-row-icon" />
          <span className="settings-row-label">Supporto</span>
          <ChevronRight size={16} className="settings-row-arrow" />
        </div>
      </div>

      {/* Esci */}
      <button
        onClick={logoutStudent}
        className="btn-primary"
        style={{
          background: 'white',
          color: 'var(--color-danger)',
          border: '2px solid var(--color-danger)',
          fontWeight: 700,
        }}
      >
        <LogOut size={18} /> Esci
      </button>
    </div>
  );
}
