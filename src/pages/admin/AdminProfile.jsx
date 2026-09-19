import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminProfile, patchAdminProfile } from '../../services/mockProfiles';
import { updateMyProfile, getAllReports } from '../../services/db';
import { getReports } from '../../services/mockStore';
import { supabase } from '../../lib/supabaseClient';
import NotificationPrefs from '../../components/NotificationPrefs';
import { downloadTextFile, reportsToCsv, supportMailto } from '../../utils/download';
import {
  Shield, Download, Lock, HelpCircle,
  ChevronRight, BadgeCheck, LogOut, User, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import ConfirmModal from '../../components/ConfirmModal';

function BrutRow({ icon: Icon, label, sublabel, right, onClick, disabled, title }) {
  const interactive = !!onClick && !disabled;
  return (
    <div
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title || (disabled ? 'Presto disponibile' : undefined)}
      aria-disabled={disabled || undefined}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', borderBottom: '2px solid var(--b-black)',
        background: 'var(--b-white)',
        cursor: disabled ? 'not-allowed' : (interactive ? 'pointer' : 'default'),
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (interactive) e.currentTarget.style.background = 'var(--b-cream)'; }}
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
      {interactive && !right && <ChevronRight size={16} strokeWidth={2.5} color="var(--b-gray)" />}
    </div>
  );
}

export default function AdminProfile({ email = 'admin@scuola.edu.it' }) {
  const { logoutAdmin, logoutReal, profile: supabaseProfile, refreshProfile, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const savedProfile = getAdminProfile();
  const displayProfile = isDemo ? savedProfile : (supabaseProfile || savedProfile);

  const [notifPrefs, setNotifPrefs] = useState(displayProfile.notif_prefs || { push_enabled: false });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nome, setNome] = useState(displayProfile.nome || '');
  const [cognome, setCognome] = useState(displayProfile.cognome || '');
  const [actionMsg, setActionMsg] = useState('');
  const [actionOk, setActionOk] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!isDemo && supabaseProfile) {
      setNome(supabaseProfile.nome || '');
      setCognome(supabaseProfile.cognome || '');
      setNotifPrefs(supabaseProfile.notif_prefs || { push_enabled: false });
    }
  }, [isDemo, supabaseProfile]);

  const profileEmail = displayProfile.email || supabaseProfile?.email || email;
  const initials = profileEmail.split('@')[0].slice(0, 2).toUpperCase();
  const boxSlug = isDemo ? 'demo' : (supabaseProfile?.box_slug || '');
  const showVerifiedBadge = !isDemo && !!session;

  const showAction = (msg, type = 'success') => {
    setActionMsg(msg);
    setActionOk(type !== 'error');
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleLogout = () => {
    if (isDemo) {
      logoutAdmin();
    } else {
      logoutReal();
    }
  };

  const handleSaveProfile = async () => {
    if (isDemo) {
      patchAdminProfile({
        nome: nome.trim(),
        cognome: cognome.trim(),
      });
    } else {
      try {
        await updateMyProfile({
          nome: nome.trim(),
          cognome: cognome.trim(),
        });
        await refreshProfile();
      } catch (err) {
        console.error('Errore aggiornamento profilo admin:', err);
        return;
      }
    }
    setIsEditingProfile(false);
  };

  const handleExportCsv = async () => {
    setBusyAction(true);
    try {
      let reports = [];
      if (isDemo) {
        reports = getReports();
      } else {
        if (!boxSlug) throw new Error('Nessuno sportello collegato.');
        // L'export deve contenere tutto, non solo la prima pagina
        reports = await getAllReports(boxSlug, { limit: null });
      }
      const csv = reportsToCsv(reports);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(
        `dilloqui-segnalazioni-${boxSlug || 'export'}-${stamp}.csv`,
        csv,
        'text/csv;charset=utf-8',
      );
      showAction(`Esportate ${reports.length} segnalazioni.`);
    } catch (err) {
      console.error(err);
      showAction(err?.message || 'Esportazione non riuscita.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      if (!isDemo) {
        const { deleteBox, deleteMyProfile } = await import('../../services/db');
        if (boxSlug) await deleteBox(boxSlug);
        await deleteMyProfile();
      } else {
        localStorage.removeItem(`dq_mock_admin_${boxSlug}`);
      }
      showAction("Profilo e sportello eliminati.", "success");
      setTimeout(() => {
        handleLogout();
      }, 1500);
    } catch (err) {
      console.error(err);
      showAction("Errore durante l'eliminazione del profilo.", "error");
    }
  };

  const handleChangePassword = async () => {
    if (isDemo) return;
    if (!profileEmail) {
      showAction('Email non disponibile.', 'error');
      return;
    }
    setBusyAction(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profileEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      showAction(`Email di recupero inviata a ${profileEmail}.`);
    } catch (err) {
      console.error(err);
      showAction(err?.message || 'Invio email non riuscito.', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSupport = () => {
    window.location.href = supportMailto({ slug: boxSlug || 'admin', role: 'admin' });
  };

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
            onClick={handleSaveProfile}
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
      {actionMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: actionOk ? 'var(--b-yellow)' : 'var(--b-red)',
            color: actionOk ? 'var(--b-black)' : '#FFFFFF',
            border: '2px solid var(--b-black)',
            boxShadow: 'var(--b-shadow-sm)',
            fontSize: '0.82rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {actionOk ? '✓' : '✕'} {actionMsg}
        </div>
      )}

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
          <span style={{ color: 'var(--b-blue)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {showVerifiedBadge ? 'Admin verificato' : 'Account attivo'}
          </span>
        </div>
        <div style={{ marginTop: 4, color: 'var(--b-black)', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {nome} {cognome}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--b-gray)', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{profileEmail}</div>
      </div>

      {/* Sezione Profilo */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Preferenze Profilo</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={User} label="Dati Personali" onClick={() => setIsEditingProfile(true)} />
        </div>
      </div>

      <NotificationPrefs
        role="admin"
        isDemo={isDemo}
        prefs={isDemo ? notifPrefs : (supabaseProfile?.notif_prefs || notifPrefs)}
        onPrefsChange={(next) => {
          setNotifPrefs(next);
          if (isDemo) patchAdminProfile({ notifications: next.push_enabled, notif_prefs: next });
          else refreshProfile();
        }}
      />

      {/* Gestione Piattaforma */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Gestione Piattaforma</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <BrutRow icon={Shield} label="Impostazioni Scuola" onClick={() => navigate(isDemo ? '/demo/admin/settings' : '/admin/settings')} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow
            icon={Download}
            label="Esporta Segnalazioni (CSV)"
            sublabel={busyAction ? 'Preparazione...' : undefined}
            onClick={busyAction ? undefined : handleExportCsv}
          />
        </div>
      </div>

      {/* Sicurezza */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Sicurezza</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 24 }}>
        <BrutRow
          icon={Lock}
          label="Cambia Password"
          sublabel={isDemo ? 'Presto disponibile' : 'Invia email di recupero'}
          disabled={isDemo || busyAction}
          title={isDemo ? 'Presto disponibile' : undefined}
          onClick={isDemo ? undefined : handleChangePassword}
        />
      </div>

      {/* Informazioni */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Informazioni</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 24 }}>
        <BrutRow icon={Shield} label="Termini di Servizio" onClick={() => window.open('/termini', '_blank')} />
        <BrutRow icon={HelpCircle} label="Informativa sulla Privacy" onClick={() => window.open('/privacy', '_blank')} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={HelpCircle} label="Assistenza Tecnica" onClick={handleSupport} />
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-red)', marginBottom: 6, marginLeft: 2, marginTop: 32 }}>Zona Pericolosa</div>
      <button
        onClick={() => setShowDeleteModal(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '14px 24px',
          background: 'var(--b-red)', color: '#FFFFFF',
          border: '3px solid var(--b-black)', fontWeight: 800,
          cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase',
          letterSpacing: '0.05em', boxShadow: '4px 4px 0 var(--b-black)',
          transition: 'box-shadow 0.1s, transform 0.1s',
          fontFamily: "'Space Grotesk', sans-serif",
          marginBottom: 20
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '6px 6px 0 var(--b-black)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '4px 4px 0 var(--b-black)'; e.currentTarget.style.transform = 'none'; }}
      >
        <User size={17} strokeWidth={2.5} /> Elimina il mio Profilo
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
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

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAdmin}
        title="Elimina Profilo Admin"
        message="ATTENZIONE ESTREMA: Stai per eliminare irreversibilmente il tuo profilo amministratore. Questo comporterà la distruzione immediata e definitiva dell'intero sportello scolastico e di TUTTE le segnalazioni al suo interno. L'operazione non può essere annullata. Vuoi procedere?"
        confirmText="Elimina Definitivamente"
        isDanger={true}
      />
    </motion.div>
  );
}
