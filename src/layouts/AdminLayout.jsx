import { Link, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, MessageSquareWarning, LogOut, Menu, X, User, PanelLeftClose, PanelLeftOpen, Users, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import BrandWordmark from '../components/BrandWordmark';
import { useUnreadReportCount } from '../services/mockStore';
import { useAdminReadVersionReal } from '../services/adminReadStore';
import { countNewReports } from '../services/db';
import { usePolling } from '../hooks/usePolling';
import { Dashboard, ReportsList, Settings, UsersList, AdminProfile } from '../App';

const SIDEBAR_COLLAPSED_KEY = 'dq_admin_sidebar_collapsed';

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutAdmin, logoutReal, profile, isPlatformAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [showProfile, setShowProfile] = useState(false);
  const [realNewCount, setRealNewCount] = useState(0);
  const profileRef = useRef(null);
  const currentOutlet = useOutlet();

  const basePath = location.pathname.startsWith('/demo/admin') ? '/demo/admin' : '/admin';
  const isDemo = basePath === '/demo/admin';
  const boxSlug = isDemo ? null : profile?.box_slug;
  const realReadVersion = useAdminReadVersionReal();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handler = (e) => { 
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false); 
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  // Chiudi il menu mobile al cambio rotta
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Preload in background delle altre rotte Admin
  useEffect(() => {
    const timer = setTimeout(() => {
      Dashboard.preload?.();
      ReportsList.preload?.();
      Settings.preload?.();
      UsersList.preload?.();
      AdminProfile.preload?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Badge reale: conteggio leggero status===new (si aggiorna al cambio rotta / mark-read)
  const fetchBadgeCount = () => {
    if (isDemo || !boxSlug) {
      setRealNewCount(0);
      return Promise.resolve();
    }
    return countNewReports(boxSlug)
      .then(setRealNewCount)
      .catch(() => {
        setRealNewCount(0);
      });
  };

  useEffect(() => {
    fetchBadgeCount();
  }, [isDemo, boxSlug, location.pathname, realReadVersion]);

  // Polling in background ogni 15 secondi per i contatori
  usePolling(fetchBadgeCount, 15000);

  const mockUnreadReportCount = useUnreadReportCount();
  const unreadReportCount = isDemo ? mockUnreadReportCount : realNewCount;

  const handleLogout = () => {
    if (isDemo) logoutAdmin();
    else logoutReal();
  };

  const menu = [
    { name: 'Dashboard',    path: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Segnalazioni', path: `${basePath}/reports`,   icon: MessageSquareWarning, badge: unreadReportCount },
    { name: 'Utenti',       path: `${basePath}/users`,     icon: Users },
    { name: 'Impostazioni', path: `${basePath}/settings`,  icon: SettingsIcon },
    // Gestione della piattaforma, non della scuola: fuori dalla demo e
    // solo per chi verifica gli sportelli
    ...(!isDemo && isPlatformAdmin
      ? [{ name: 'Sportelli', path: `${basePath}/piattaforma`, icon: BadgeCheck }]
      : []),
  ];

  const isActive = (path) => location.pathname.includes(path);

  const toggleSidebarCollapsed = () => setSidebarCollapsed((v) => !v);

  const NavLinks = () => (
    <>
      {menu.map((item) => (
        <a
          key={item.path}
          href={item.path}
          onClick={(e) => {
            e.preventDefault();
            if (location.pathname === item.path) {
              setIsMenuOpen(false);
              return;
            }
            if (isMenuOpen) {
              setIsMenuOpen(false);
              setTimeout(() => navigate(item.path), 350);
            } else {
              navigate(item.path);
            }
          }}
          className={`admin-nav-link ${isActive(item.path) ? 'active' : ''}`}
          style={{ cursor: 'pointer', borderRight: 'none' }}
          id={`admin-nav-${item.name.toLowerCase()}`}
          title={sidebarCollapsed ? item.name : undefined}
          aria-label={sidebarCollapsed ? item.name : undefined}
        >
          <span className="admin-nav-icon" aria-hidden="true">
            <item.icon size={18} strokeWidth={2.5} />
          </span>
          <span className="admin-nav-label">{item.name}</span>
          {item.badge > 0 && (
            <span
              className="notification-badge admin-nav-badge"
              aria-label={`${item.badge} segnalazioni non lette`}
            >
              {item.badge}
            </span>
          )}
        </a>
      ))}
    </>
  );

  return (
    <div className={`admin-container${sidebarCollapsed ? ' admin-sidebar-collapsed' : ''}`}>

      {/* Mobile Top Bar */}
      <div className="admin-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrandWordmark compact />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--b-yellow)', border: '2px solid var(--b-black)', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</span>
        </div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ background: isMenuOpen ? 'var(--b-yellow)' : 'var(--b-white)', border: '2px solid var(--b-black)', cursor: 'pointer', color: 'var(--b-black)', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--b-black)' }}
          id="admin-menu-toggle"
          aria-label={isMenuOpen ? 'Chiudi menu admin' : 'Apri menu admin'}
          aria-expanded={isMenuOpen}
          aria-controls="admin-sidebar-menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isMenuOpen ? 'close' : 'open'}
              initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isMenuOpen ? <X size={22} strokeWidth={3} /> : <Menu size={22} strokeWidth={2.5} />}
            </motion.div>
          </AnimatePresence>
        </button>
      </div>

      {/* Sidebar Desktop / Dropdown Mobile */}
      <aside className={`admin-sidebar ${isMenuOpen ? 'open' : ''}`} id="admin-sidebar-menu">
        {/* Logo desktop + collapse toggle */}
        <div className="admin-sidebar-logo admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <BrandWordmark compact />
            <span className="admin-sidebar-admin-tag">Admin</span>
          </div>
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Espandi barra laterale' : 'Comprimi barra laterale'}
            aria-expanded={!sidebarCollapsed}
            id="admin-sidebar-collapse-toggle"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} strokeWidth={2.5} /> : <PanelLeftClose size={18} strokeWidth={2.5} />}
          </button>
        </div>

        <nav className="admin-nav">
          <NavLinks />
        </nav>

        {/* Profilo + Logout in fondo */}
        <div className="admin-sidebar-footer">
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              className="admin-nav-link admin-profile-btn"
              style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'transparent', borderBottom: 'none' }}
              onClick={() => setShowProfile(!showProfile)}
              id="admin-profile-btn"
              aria-label="Apri menu profilo admin"
              aria-expanded={showProfile}
              aria-controls="admin-profile-menu"
              title={sidebarCollapsed ? 'Profilo admin' : undefined}
            >
              <div className="admin-profile-avatar" aria-hidden="true">
                <User size={14} strokeWidth={2.5} />
              </div>
              <span className="admin-nav-label">Admin</span>
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`profile-popup admin-profile-popup${sidebarCollapsed ? ' admin-profile-popup--collapsed' : ''}`} 
                  id="admin-profile-menu"
                >
                  <button className="profile-popup-item" onClick={() => { 
                    setShowProfile(false); 
                    if (isMenuOpen) {
                      setIsMenuOpen(false);
                      setTimeout(() => navigate(`${basePath}/profile`), 350);
                    } else {
                      navigate(`${basePath}/profile`); 
                    }
                  }}>
                    <User size={15} /> Il mio Profilo
                  </button>
                  <div className="profile-popup-divider" />
                  <button className="profile-popup-item danger" onClick={handleLogout}>
                    <LogOut size={15} /> Esci
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {currentOutlet}
      </main>
    </div>
  );
}
