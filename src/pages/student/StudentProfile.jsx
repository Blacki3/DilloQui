import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { getSettings } from '../../services/mockSettings';
import { getStudentProfile, patchStudentProfile } from '../../services/mockProfiles';
import { updateMyProfile, getBox, getMyReports, getMyAnonReports } from '../../services/db';
import { getReports } from '../../services/mockStore';
import NotificationPrefs from '../../components/NotificationPrefs';
import ConfirmModal from '../../components/ConfirmModal';
import { downloadTextFile, supportMailto } from '../../utils/download';
import {
  Shield, Download, FileText, Lock, HelpCircle,
  ChevronRight, LogOut, User, ArrowLeft, BadgeCheck, ScrollText
} from 'lucide-react';

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
        padding: '14px 18px',
        borderBottom: '2px solid var(--b-black)',
        background: 'var(--b-white)',
        cursor: disabled ? 'not-allowed' : (interactive ? 'pointer' : 'default'),
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (interactive) e.currentTarget.style.background = 'var(--b-cream)'; }}
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
      {interactive && !right && <ChevronRight size={16} strokeWidth={2.5} color="var(--b-gray)" />}
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

function sanitizeReportForExport(r) {
  return {
    id: r.id,
    created_at: r.created_at || (r.createdAt ? new Date(r.createdAt).toISOString() : null),
    type: r.type,
    title: r.title,
    content: r.content,
    status: r.status,
    is_public: r.is_public ?? r.isPublic ?? false,
    is_anonymous: r.is_anonymous ?? r.isAnonymous ?? r.anonimo ?? false,
    box_slug: r.box_slug || null,
  };
}

export default function StudentProfile({ email = 'student@scuola.edu.it' }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isDemo = slug === 'demo';
  const { logoutStudent, logoutReal, profile: supabaseProfile, refreshProfile, session } = useAuth();

  const savedProfile = getStudentProfile();

  // requireClass: demo = mockSettings, reale = impostazione della box su Supabase
  const [requireClass, setRequireClass] = useState(isDemo ? getSettings().requireClass : false);
  useEffect(() => {
    if (isDemo) return;
    getBox(slug)
      .then(box => { if (box) setRequireClass(!!box.require_class); })
      .catch(console.error);
  }, [isDemo, slug]);

  // Valori iniziali: demo = mockProfiles, reale = AuthContext.profile
  const displayProfile = isDemo ? savedProfile : (supabaseProfile || savedProfile);

  const [defaultAnon, setDefaultAnon] = useState(displayProfile.defaultAnon ?? displayProfile.default_anon ?? true);
  const [notifPrefs, setNotifPrefs] = useState(displayProfile.notif_prefs || { push_enabled: false });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nome, setNome] = useState(displayProfile.nome || '');
  const [cognome, setCognome] = useState(displayProfile.cognome || '');
  const [classe, setClasse] = useState(displayProfile.classe || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionOk, setActionOk] = useState(true);
  const [busyExport, setBusyExport] = useState(false);

  // Il profilo Supabase arriva in modo asincrono: sincronizza i campi
  useEffect(() => {
    if (isDemo || !supabaseProfile) return;
    setNome(supabaseProfile.nome || '');
    setCognome(supabaseProfile.cognome || '');
    setClasse(supabaseProfile.classe || '');
    setDefaultAnon(supabaseProfile.default_anon ?? true);
    setNotifPrefs(supabaseProfile.notif_prefs || { push_enabled: false });
  }, [isDemo, supabaseProfile]);

  const profileEmail = displayProfile.email || supabaseProfile?.email || email;
  const initials = profileEmail.split('@')[0].slice(0, 2).toUpperCase();
  const showVerifiedBadge = !isDemo && !!session;

  const showAction = (msg, type = 'success') => {
    setActionMsg(msg);
    setActionOk(type !== 'error');
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleExportMyData = async () => {
    setBusyExport(true);
    try {
      let identified = [];
      let anonymous = [];
      if (isDemo) {
        identified = getReports().filter((r) => r.mine);
      } else {
        [identified, anonymous] = await Promise.all([getMyReports(), getMyAnonReports()]);
      }
      const payload = {
        exported_at: new Date().toISOString(),
        box_slug: slug,
        profile: {
          email: profileEmail,
          nome: nome.trim() || null,
          cognome: cognome.trim() || null,
          classe: requireClass ? (classe.trim() || null) : null,
        },
        reports: {
          identified: identified.map(sanitizeReportForExport),
          anonymous: anonymous.map(sanitizeReportForExport),
        },
      };
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(
        `dilloqui-miei-dati-${slug || 'export'}-${stamp}.json`,
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8',
      );
      const total = payload.reports.identified.length + payload.reports.anonymous.length;
      showAction(`Esportate ${total} segnalazioni.`);
    } catch (err) {
      console.error(err);
      showAction(err?.message || 'Esportazione non riuscita.', 'error');
    } finally {
      setBusyExport(false);
    }
  };

  const handleSupport = () => {
    window.location.href = supportMailto({ slug, role: 'student' });
  };

  const handleDeleteProfile = async () => {
    try {
      if (!isDemo) {
        const { deleteMyProfile } = await import('../../services/db');
        await deleteMyProfile();
      } else {
        // Demo: Pulisci local storage
        localStorage.removeItem(`dq_mock_student_${slug}`);
      }
      showAction("Account eliminato correttamente.", "success");
      setTimeout(() => {
        if (isDemo) logoutStudent();
        else logoutReal();
      }, 1500);
    } catch (err) {
      console.error(err);
      showAction("Impossibile eliminare l'account.", "error");
    }
  };

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
            onClick={async () => {
              if (isDemo) {
                patchStudentProfile({
                  nome: nome.trim(),
                  cognome: cognome.trim(),
                  classe: requireClass ? classe.trim() : '',
                });
              } else {
                try {
                  await updateMyProfile({
                    nome: nome.trim(),
                    cognome: cognome.trim(),
                    classe: requireClass ? classe.trim() : '',
                  });
                  await refreshProfile(); // sincronizza il context con i nuovi dati
                } catch (err) {
                  console.error(err);
                  return;
                }
              }
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
          width: 72, height: 72, background: 'var(--b-yellow)',
          border: '3px solid var(--b-black)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '1.5rem', color: 'var(--b-black)',
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 14, boxShadow: '4px 4px 0 var(--b-black)',
        }}>
          {initials}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <BadgeCheck size={15} color="var(--b-blue)" strokeWidth={2.5} />
          <span style={{ color: 'var(--b-blue)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {showVerifiedBadge ? 'Verificato' : 'Account attivo'}
          </span>
        </div>
        <div style={{ marginTop: 4, color: 'var(--b-black)', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {requireClass ? `${nome} ${cognome} • ${classe || '--'}` : `${nome} ${cognome}`}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--b-gray)', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{profileEmail}</div>
      </div>

      {/* Sezione Account */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Account</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 20 }}>
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={User} label="Dati Personali" onClick={() => setIsEditingProfile(true)} />
        </div>
      </div>

      <NotificationPrefs
        role="student"
        isDemo={isDemo}
        prefs={isDemo ? notifPrefs : (supabaseProfile?.notif_prefs || notifPrefs)}
        onPrefsChange={(next) => {
          setNotifPrefs(next);
          if (isDemo) patchStudentProfile({ notifications: next.push_enabled, notif_prefs: next });
          else refreshProfile();
        }}
      />

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
              onClick={async () => {
                const next = !defaultAnon;
                setDefaultAnon(next);
                if (isDemo) {
                  patchStudentProfile({ defaultAnon: next });
                } else {
                  try {
                    await updateMyProfile({ default_anon: next });
                    await refreshProfile();
                  } catch (err) {
                    console.error(err);
                  }
                }
              }}
            />
          )}
        />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow
            icon={Download}
            label="Esporta i miei dati"
            sublabel={busyExport ? 'Preparazione...' : 'JSON delle tue segnalazioni'}
            onClick={busyExport ? undefined : handleExportMyData}
          />
        </div>
      </div>

      {/* Sezione Info */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--b-gray)', marginBottom: 6, marginLeft: 2 }}>Informazioni</div>
      <div style={{ border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)', marginBottom: 24 }}>
        <BrutRow
          icon={ScrollText}
          label="Regolamento dello sportello"
          onClick={() => navigate(`/box/${slug}/regolamento`)}
        />
        <BrutRow icon={FileText} label="Termini di Servizio" onClick={() => window.open('/termini', '_blank')} />
        <BrutRow icon={Lock} label="Informativa sulla Privacy" onClick={() => window.open('/privacy', '_blank')} />
        <div style={{ borderBottom: 'none' }}>
          <BrutRow icon={HelpCircle} label="Supporto" onClick={handleSupport} />
        </div>
      </div>

      {/* Danger Zone (GDPR) */}
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
          fontFamily: "'Space Grotesk', sans-serif'",
          marginBottom: 20
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '6px 6px 0 var(--b-black)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '4px 4px 0 var(--b-black)'; e.currentTarget.style.transform = 'none'; }}
      >
        <User size={17} strokeWidth={2.5} /> Elimina il mio Profilo
      </button>

      {/* Logout */}
      <button
        onClick={() => (isDemo ? logoutStudent() : logoutReal())}
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

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProfile}
        title="Elimina Profilo"
        message="ATTENZIONE: Stai per eliminare irreversibilmente il tuo account. Tutte le tue segnalazioni pubbliche rimarranno sul forum ma in forma anonima e perderai per sempre l'accesso allo sportello. Questa azione non può essere annullata. Vuoi procedere?"
        confirmText="Elimina Account"
        isDanger={true}
      />
    </div>
  );
}
