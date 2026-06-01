import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Users, ArrowLeftRight, Check, Sparkles, X, ChevronDown, ChevronUp, Home } from 'lucide-react';

export default function DemoSwitcher() {
  const { loginStudent, loginAdmin, studentToken, adminToken, logoutStudent, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  // Show only on /box/demo... or /admin... routes, or Verify page with demo slug
  const isDemoRoute =
    location.pathname.startsWith('/box/demo') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/demo/admin') ||
    (location.pathname.startsWith('/box/') && location.pathname.includes('demo'));

  if (!isDemoRoute) return null;

  const isStudentViewActive = location.pathname.startsWith('/box/demo');
  const isAdminViewActive = location.pathname.startsWith('/demo/admin');

  const switchToStudent = () => {
    // Proactively authenticate student if token is missing
    if (!studentToken) {
      loginStudent("mock-session-demo");
    }
    navigate('/box/demo/forum');
  };

  const switchToAdmin = () => {
    // Proactively authenticate admin if token is missing
    if (!adminToken) {
      loginAdmin("mock-admin-token");
    }
    navigate('/demo/admin/dashboard');
  };

  const handleResetDemo = () => {
    logoutStudent();
    logoutAdmin();
    navigate('/');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: '#1a1a2e',
          color: 'white',
          border: '1.5px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          width: '52px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Apri Controllo Demo"
      >
        <Sparkles size={20} color="#10b981" />
      </button>
    );
  }

  return (
    <div className="demo-switcher-panel">
      {/* Mini-badge */}
      <div className="demo-switcher-badge">
        <Sparkles size={16} color="#10b981" />
        <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>Demo</span>
      </div>

      {/* Buttons to switch */}
      <div className="demo-switcher-buttons">
        <button
          onClick={switchToStudent}
          className="demo-btn"
          style={{
            background: isStudentViewActive ? 'var(--color-primary, #2d7a47)' : 'rgba(255,255,255,0.05)',
            border: isStudentViewActive ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
          }}
          onMouseEnter={e => { if (!isStudentViewActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { if (!isStudentViewActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <Users size={15} />
          Vista Studente
          {isStudentViewActive && <Check size={14} color="#a7f3d0" />}
        </button>

        <div className="demo-swap-icon">
          <ArrowLeftRight size={14} />
        </div>

        <button
          onClick={switchToAdmin}
          className="demo-btn"
          style={{
            background: isAdminViewActive ? '#4f46e5' : 'rgba(255,255,255,0.05)',
            border: isAdminViewActive ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
          }}
          onMouseEnter={e => { if (!isAdminViewActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { if (!isAdminViewActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <ShieldAlert size={15} />
          Vista Admin
          {isAdminViewActive && <Check size={14} color="#c7d2fe" />}
        </button>
      </div>

      {/* Control panel action buttons */}
      <div className="demo-switcher-actions">
        <button
          onClick={handleResetDemo}
          className="demo-action-btn"
          style={{ color: '#ef4444', gap: '6px' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Home size={14} />
          Torna all'home
        </button>

        <button
          onClick={() => setIsOpen(false)}
          className="demo-action-btn"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'none'; }}
          title="Minimizza"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        
        .demo-switcher-panel {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          background: rgba(26, 26, 46, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 12px 20px;
          width: max-content;
          max-width: 92vw;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          gap: 16px;
          color: white;
          font-family: 'Inter', sans-serif;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .demo-switcher-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          border-right: 1px solid rgba(255,255,255,0.15);
          padding-right: 16px;
        }

        .demo-switcher-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .demo-btn {
          color: white;
          border-radius: 14px;
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .demo-swap-icon {
          color: rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
        }

        .demo-switcher-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 1px solid rgba(255,255,255,0.15);
          padding-left: 16px;
        }

        .demo-action-btn {
          background: none;
          border: none;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 600px) {
          .demo-switcher-panel {
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            border-radius: 20px;
            bottom: 16px;
            width: 90vw;
          }
          .demo-switcher-badge {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.15);
            padding-bottom: 8px;
            width: 100%;
            justify-content: center;
          }
          .demo-switcher-buttons {
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .demo-btn {
            width: 100%;
            justify-content: center;
            padding: 10px 16px;
          }
          .demo-swap-icon {
            display: none !important;
          }
          .demo-switcher-actions {
            border-left: none;
            padding-left: 0;
            border-top: 1px solid rgba(255,255,255,0.15);
            padding-top: 8px;
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
