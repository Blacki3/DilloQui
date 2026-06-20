import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSettings } from '../../services/mockSettings';
import { getStudentProfile, patchStudentProfile } from '../../services/mockProfiles';
import {
  Bell, Globe, Shield, Download, FileText, Lock, HelpCircle,
  ChevronRight, LogOut, User, ArrowLeft, BadgeCheck
} from 'lucide-react';

function BrutRow({ icon: Icon, label, sublabel, right, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        borderBottom: '2px solid var(--b-black)',
        background: 'var(--b-white)', cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--b-cream)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--b-white)'}
    >
      <div style={{ width: 36, height: 36, background: 'var(--b-yellow)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} strokeWidth={2.5} />
      </div>
      <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem' }}>
        {label}
        {sublabel && <div style={{ fontSize: '0.75rem', color: 'var(--b-gray)', fontWeight: 500 }}>{sublabel}</div>}
      </span>
      {right}
      {onClick && !right && <ChevronRight size={16} strokeWidth={2.5} color="var(--b-gray)" />}
    </div>
  );
}

function BrutToggle({ on, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      aria-label={on ? 'Disattiva opzione' : 'Attiva opzione'}
      aria-pressed={on}
      style={{
        width: 48, height: 26, background: on ? 'var(--b-yellow)' : 'var(--b-gray-l)',
        border: '2px solid var(--b-black)', cursor: 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.1s',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 18, height: 18, background: 'var(--b-black)',
        transition: 'left 0.12s',
      }} />
    </button>
  );
}

export default function StudentProfile({ email = 'student@scuola.edu.it' }) {
  const { logoutStudent } = useAuth();
  const savedProfile = getStudentProfile();
  const { requireClass } = getSettings();
  const [notifications, setNotifications] = useState(savedProfile.notifications);
  const [defaultAnon, setDefaultAnon] = useState(savedProfile.defaultAnon);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nome, setNome] = useState(savedProfile.nome);
  const [cognome, setCognome] = useState(savedProfile.cognome);
  const [classe, setClasse] = useState(savedProfile.classe);
  const profileEmail = savedProfile.email || email;

  const initials = profileEmail.split('@')[0].slice(0, 2).toUpperCase();

  if (isEditingProfile) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button
          onClick={() => setIsEditingProfile(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--b-white)', border: 'var(--b-border)',
            cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '8px 14px', boxShadow: 'var(--b-shadow-sm)',
            marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif",
          }}
          id="profile-back-btn"
        >
          <ArrowLeft size={15} strokeWidth={3} /> Indietro
        </button>
        <h2 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Dati Personali</h2>
        <div className="flat-panel">
          <label>Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} id="profile-nome" />
          <label>Cognome</label>
          <input value={cognome} onChange={e => setCognome(e.target.value)} id="profile-cognome" />
          {requireClass && (
            <>
              <label>Classe</label>
              <input value={classe} onChange={e => setClasse(e.target.value)} placeholder="Es. 3B" id="profile-classe" />
            </>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              patchStudentProfile({
                nome: nome.trim(),
                cognome: cognome.trim(),
                classe: requireClass ? classe.trim() : '',
              });
              setIsEditingProfile(false);
            }}
            id="profile-save-btn"
          >
            Salva Modifiche ✓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Avatar Card */}
      <div style={{
        background: 'var(--b-black)', border: '3px solid var(--b-black)',
        boxShadow: 'var(--b-shadow-lg)', padding: '28px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{
          width: 72, height: 72, background: 'var(--b-yellow)',
          border: '3px solid var(--b-yellow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '1.5rem', color: 'var(--b-black)',
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 14, boxShadow: '4px 4px 0 var(--b-yellow)',
        }}>
          {initials}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <BadgeCheck size={14} color="var(--b-yellow)" strokeWidth={2.5} />
          <span style={{ color: 'var(--b-yellow)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Verificato</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#FFFFFF99', fontSize: '0.88rem', fontWeight: 600 }}>{profileEmail}</div>
        <div style={{ marginTop: 8, color: '#FFFFFF66', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {requireClass ? `${nome} ${cognome} • Classe ${classe || '--'}` : `${nome} ${cognome}`}
        </div>
      </div>

      {/* Sezione Account */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Account</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <BrutRow icon={User} label="Dati Personali" onClick={() => setIsEditingProfile(true)} />
        <BrutRow
          icon={Bell}
          label="Notifiche Push"
          right={(
            <BrutToggle
              on={notifications}
              onClick={() => {
                const next = !notifications;
                setNotifications(next);
                patchStudentProfile({ notifications: next });
              }}
            />
          )}
        />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={Globe} label="Lingua" right={<span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--b-gray)', marginRight: 8 }}>Italiano</span>} onClick={() => {}} />
        </div>
      </div>

      {/* Sezione Privacy */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Privacy</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <BrutRow
          icon={Shield}
          label="Anonimato Predefinito"
          sublabel="per nuove segnalazioni"
          right={(
            <BrutToggle
              on={defaultAnon}
              onClick={() => {
                const next = !defaultAnon;
                setDefaultAnon(next);
                patchStudentProfile({ defaultAnon: next });
              }}
            />
          )}
        />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={Download} label="Esporta i miei dati" onClick={() => {}} />
        </div>
      </div>

      {/* Sezione Info */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Informazioni</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 24 }}>
        <BrutRow icon={FileText}    label="Regole dell'App" onClick={() => {}} />
        <BrutRow icon={Lock}        label="Informativa sulla Privacy" onClick={() => {}} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={HelpCircle} label="Supporto" onClick={() => {}} />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logoutStudent}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '14px 24px',
          background: 'var(--b-white)', color: 'var(--b-red)',
          border: '3px solid var(--b-red)', fontWeight: 800,
          cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase',
          letterSpacing: '0.05em', boxShadow: '4px 4px 0 var(--b-red)',
          transition: 'box-shadow 0.1s, transform 0.1s',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '6px 6px 0 var(--b-red)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '4px 4px 0 var(--b-red)'; e.currentTarget.style.transform = 'none'; }}
        id="profile-logout-btn"
      >
        <LogOut size={17} strokeWidth={2.5} /> Esci dall'Account
      </button>
    </div>
  );
}
