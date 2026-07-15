import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminProfile, patchAdminProfile } from '../../services/mockProfiles';
import {
  Bell, Shield, Download, Lock, HelpCircle,
  ChevronRight, BadgeCheck, LogOut, User, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

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
        padding: '14px 18px', borderBottom: '2px solid var(--b-black)',
        background: 'var(--b-white)', cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--b-cream)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--b-white)'}
    >
      <div style={{ width: 36, height: 36, background: 'var(--b-blue)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} strokeWidth={2.5} color="#FFFFFF" />
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

export default function AdminProfile({ email = 'admin@scuola.edu.it' }) {
  const { logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const savedProfile = getAdminProfile();
  const [notifications, setNotifications] = useState(savedProfile.notifications);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nome, setNome] = useState(savedProfile.nome);
  const [cognome, setCognome] = useState(savedProfile.cognome);
  const profileEmail = savedProfile.email || email;

  const initials = profileEmail.split('@')[0].slice(0, 2).toUpperCase();

  if (isEditingProfile) {
    return (
      <motion.div 
        className="admin-page admin-page-narrow" 
        style={{ paddingBottom: 60 }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3 }}
      >
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
          id="admin-profile-back-btn"
        >
          <ArrowLeft size={15} strokeWidth={3} /> Indietro
        </button>
        <h2 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Dati Personali</h2>
        <div className="flat-panel">
          <label>Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} id="admin-nome" />
          <label>Cognome</label>
          <input value={cognome} onChange={e => setCognome(e.target.value)} id="admin-cognome" />
          <button
            className="btn-primary"
            onClick={() => {
              patchAdminProfile({
                nome: nome.trim(),
                cognome: cognome.trim(),
              });
              setIsEditingProfile(false);
            }}
            id="admin-profile-save"
          >
            Salva Modifiche ✓
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="admin-page admin-page-narrow" 
      style={{ paddingBottom: 60 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar Card */}
      <div style={{
        background: 'var(--b-white)', border: '3px solid var(--b-black)',
        boxShadow: 'var(--b-shadow-lg)', padding: '28px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{
          width: 72, height: 72, background: 'var(--b-blue)',
          border: '3px solid var(--b-black)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '1.5rem', color: '#FFFFFF',
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 14, boxShadow: '4px 4px 0 var(--b-black)',
        }}>
          {initials}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <BadgeCheck size={15} color="var(--b-blue)" strokeWidth={2.5} />
          <span style={{ color: 'var(--b-blue)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin Verificato</span>
        </div>
        <div style={{ marginTop: 4, color: 'var(--b-black)', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {nome} {cognome}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--b-gray)', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{profileEmail}</div>
      </div>

      {/* Sezione Profilo */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Preferenze Profilo</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <BrutRow icon={User} label="Dati Personali" onClick={() => setIsEditingProfile(true)} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow
            icon={Bell}
            label="Notifiche Email"
            right={(
              <BrutToggle
                on={notifications}
                onClick={() => {
                  const next = !notifications;
                  setNotifications(next);
                  patchAdminProfile({ notifications: next });
                }}
              />
            )}
          />
        </div>
      </div>

      {/* Gestione Piattaforma */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Gestione Piattaforma</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <BrutRow icon={Shield} label="Impostazioni Scuola" onClick={() => navigate('/admin/settings')} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={Download} label="Esporta Segnalazioni (CSV)" onClick={() => {}} />
        </div>
      </div>

      {/* Sicurezza */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Sicurezza</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 24 }}>
        <BrutRow icon={Lock} label="Cambia Password" onClick={() => {}} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={HelpCircle} label="Assistenza Tecnica" onClick={() => {}} />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logoutAdmin}
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
        id="admin-logout-btn"
      >
        <LogOut size={17} strokeWidth={2.5} /> Esci dall'Account
      </button>
    </motion.div>
  );
}
