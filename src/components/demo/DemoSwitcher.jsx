import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Users, ArrowLeftRight, Check, ChevronDown, Home } from 'lucide-react';

/* ── Icona DEMO (Target + cursore) ── */
const DemoIconSvg = ({ size = 24, className = "", style = {} }) => (
  <svg
    width={size}
    height={size * 1.15}
    viewBox="0 0 72 82"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    className={className}
    style={{ display: 'block', ...style }}
  >
    <text
      x="36" y="20"
      textAnchor="middle"
      fontSize="22"
      fontWeight="900"
      fontFamily="'Space Grotesk', sans-serif"
      letterSpacing="2"
    >DEMO</text>
    {/* Cerchi del target */}
    <circle cx="36" cy="54" r="22" fill="none" stroke="currentColor" strokeWidth="6" />
    <circle cx="36" cy="54" r="8" fill="none" stroke="currentColor" strokeWidth="6" />
    {/* Cursore del mouse centrato */}
    <path d="M36 54 L36 78 L42 72 L48 83 L53 80 L47 69 L56 69 Z" />
  </svg>
);

export default function DemoSwitcher() {
  const { loginStudent, loginAdmin, studentToken, adminToken, logoutStudent, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(true);

  /* mostra solo nelle rotte demo */
  const isDemoRoute =
    location.pathname.startsWith('/demo/') ||
    location.pathname.startsWith('/box/demo');
  if (!isDemoRoute) return null;

  const isStudentViewActive = location.pathname.startsWith('/box/demo');
  const isAdminViewActive = location.pathname.startsWith('/demo/admin');

  const switchToStudent = () => {
    if (!studentToken) loginStudent('mock-session-demo');
    navigate('/box/demo/forum');
  };
  const switchToAdmin = () => {
    if (!adminToken) loginAdmin('mock-admin-token');
    navigate('/demo/admin/dashboard');
  };
  const handleResetDemo = () => {
    logoutStudent();
    logoutAdmin();
    navigate('/');
  };

  return (
    <>
      <style>{`
        /* =========================================
           BOTTONE COMPATTO (In basso a destra)
        ========================================= */
        .demo-mini-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99998;
          width: 56px;
          height: 56px;
          background: var(--b-yellow);
          color: var(--b-black);
          border: 3px solid var(--b-black);
          box-shadow: 4px 4px 0 var(--b-black);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), 
                      box-shadow 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
                      opacity 0.25s ease-out;
        }
        .demo-mini-btn:hover {
          transform: translate(-2px, -2px) scale(1.05);
          box-shadow: 6px 6px 0 var(--b-black);
        }
        /* Quando il pannello è aperto, nascondiamo il bottone e lo riduciamo */
        .demo-mini-btn.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.5);
        }

        /* =========================================
           PANNELLO ESTESO (Trascinamento fluido GPU)
        ========================================= */
        .demo-panel-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          /* Punto di origine per lo scaling: esatto centro del bottone 56x56 */
          /* (24px right + 28px center = 52px dal bordo destro viewport) */
          transform-origin: calc(100% - 28px) calc(100% - 28px);
          transition: transform 0.55s cubic-bezier(0.2, 0.9, 0.2, 1),
                      opacity 0.35s cubic-bezier(0.2, 0.9, 0.2, 1);
        }
        
        .demo-panel-wrapper.open {
          /* Calcolo matematico per centrare perfettamente un elemento ancorato a right:24px */
          /* -50vw lo porta a centro, +50% lo sposta della sua mezza larghezza, +24px cancella il right */
          transform: translateX(calc(-50vw + 50% + 24px)) scale(1);
          opacity: 1;
          pointer-events: auto;
        }
        
        .demo-panel-wrapper.closed {
          /* Si ritira fluidamente verso il suo transform-origin (il centro del bottone) */
          transform: translateX(0) scale(0);
          opacity: 0;
          pointer-events: none;
        }

        .demo-panel-inner {
          background: var(--b-cream);
          border: 3px solid var(--b-black);
          box-shadow: 8px 8px 0 var(--b-black);
          font-family: 'Space Grotesk', sans-serif;
          width: max-content;
          max-width: 92vw;
        }

        /* Layout responsive interno */
        @media (max-width: 600px) {
          /* Alza il bottone compatto di 20px extra per non coprire la tab "Profilo" */
          .demo-mini-btn  { bottom: 114px !important; }
          .demo-panel-wrapper { bottom: 24px !important; }
          .dsp-content { flex-direction: column !important; gap: 12px !important; padding: 14px !important; }
          .dsp-btns    { flex-direction: column !important; width: 100% !important; }
          .dsp-btns > button { width: 100% !important; justify-content: center !important; }
          .dsp-swap    { display: none !important; }
          .dsp-divider { display: none !important; }
          #demo-btn-reset { width: 100% !important; justify-content: center !important; margin-top: 4px; }
        }
      `}</style>

      {/* ── BOTTONE COMPATTO ── */}
      <button
        className={`demo-mini-btn ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        title="Apri Controllo Demo"
      >
        <DemoIconSvg size={28} />
      </button>

      {/* ── PANNELLO ESTESO ── */}
      <div className={`demo-panel-wrapper ${isOpen ? 'open' : 'closed'}`}>
        <div className="demo-panel-inner">
          {/* Top Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--b-black)', color: 'var(--b-yellow)',
            padding: '8px 16px', borderBottom: '3px solid var(--b-black)',
            userSelect: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Modalità Demo
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              title="Comprimi"
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                padding: '4px', display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              <ChevronDown size={18} strokeWidth={3} />
            </button>
          </div>

          {/* Content */}
          <div className="dsp-content" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="dsp-btns" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={switchToStudent}
                style={{
                  background: isStudentViewActive ? 'var(--b-green)' : 'var(--b-white)',
                  color: isStudentViewActive ? '#ffffff' : 'var(--b-black)',
                  border: '2px solid var(--b-black)',
                  padding: '10px 16px', fontSize: '0.85rem', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: isStudentViewActive ? 'inset 2px 2px 0 rgba(0,0,0,0.25)' : '2px 2px 0 var(--b-black)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Users size={16} strokeWidth={2.5} />
                Studente
                {isStudentViewActive && <Check size={16} strokeWidth={3} />}
              </button>

              <ArrowLeftRight size={16} strokeWidth={3} color="var(--b-black)" className="dsp-swap" style={{ margin: '0 4px', opacity: 0.4 }} />

              <button
                onClick={switchToAdmin}
                style={{
                  background: isAdminViewActive ? 'var(--b-blue)' : 'var(--b-white)',
                  color: isAdminViewActive ? '#ffffff' : 'var(--b-black)',
                  border: '2px solid var(--b-black)',
                  padding: '10px 16px', fontSize: '0.85rem', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: isAdminViewActive ? 'inset 2px 2px 0 rgba(0,0,0,0.25)' : '2px 2px 0 var(--b-black)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <ShieldAlert size={16} strokeWidth={2.5} />
                Admin
                {isAdminViewActive && <Check size={16} strokeWidth={3} />}
              </button>
            </div>

            <div className="dsp-divider" style={{ width: 2, height: 28, background: 'var(--b-black)', opacity: 0.15 }} />

            <button
              onClick={handleResetDemo}
              id="demo-btn-reset"
              style={{
                background: 'var(--b-white)', color: 'var(--b-red)',
                border: '2px solid var(--b-black)',
                padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '2px 2px 0 var(--b-black)',
                fontFamily: "'Space Grotesk', sans-serif",
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--b-red)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--b-white)'; e.currentTarget.style.color = 'var(--b-red)'; }}
            >
              <Home size={14} strokeWidth={3} /> Esci
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
