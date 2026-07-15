import { Link, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, MessageSquareWarning, LogOut, Menu, X, User, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import BrandWordmark from '../components/BrandWordmark';
import { useUnreadReportCount } from '../services/mockStore';

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
  const { logoutAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const currentOutlet = useOutlet();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const basePath = location.pathname.startsWith('/demo/admin') ? '/demo/admin' : '/admin';
  const unreadReportCount = useUnreadReportCount();

  const menu = [
    { name: 'Dashboard',    path: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Segnalazioni', path: `${basePath}/reports`,   icon: MessageSquareWarning, badge: unreadReportCount },
    { name: 'Utenti',       path: `${basePath}/users`,     icon: Users },
    { name: 'Impostazioni', path: `${basePath}/settings`,  icon: SettingsIcon },
  ];

  const isActive = (path) => location.pathname.includes(path);

  const toggleSidebarCollapsed = () => setSidebarCollapsed((v) => !v);

  const NavLinks = () => (
    <>
      {menu.map((item) => (
        <Link
          key={item.path}
          onClick={() => setIsMenuOpen(false)}
          to={item.path}
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
        </Link>
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
                  <button className="profile-popup-item" onClick={() => { setShowProfile(false); navigate(`${basePath}/profile`); }}>
                    <User size={15} /> Il mio Profilo
                  </button>
                  <div className="profile-popup-divider" />
                  <button className="profile-popup-item danger" onClick={() => { logoutAdmin(); }}>
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
