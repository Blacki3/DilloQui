import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, MessageSquareWarning, LogOut, Menu, X, User, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const currentOutlet = useOutlet();

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const basePath = location.pathname.startsWith('/demo/admin') ? '/demo/admin' : '/admin';

  const menu = [
    { name: 'Dashboard',    path: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Segnalazioni', path: `${basePath}/reports`,   icon: MessageSquareWarning },
    { name: 'Impostazioni', path: `${basePath}/settings`,  icon: SettingsIcon },
  ];

  const isActive = (path) => location.pathname.includes(path);

  const NavLinks = () => (
    <>
      {menu.map((item) => (
        <a
          key={item.path}
          onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
          className={`admin-nav-link ${isActive(item.path) ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <item.icon size={19} />
          {item.name}
        </a>
      ))}
    </>
  );

  return (
    <div className="admin-container">

      {/* Mobile Top Bar */}
      <div className="admin-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--color-primary)' }}>Dillo</span> Qui
          </span>
        </div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)', padding: 4 }}
        >
          {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Sidebar Desktop / Dropdown Mobile */}
      <aside className={`admin-sidebar ${isMenuOpen ? 'open' : ''}`}>
        {/* Logo desktop */}
        <div className="admin-sidebar-logo admin-sidebar-header">
          <span className="admin-sidebar-logo-text">
            <span style={{ color: 'var(--color-primary)' }}>Dillo</span> Qui
          </span>
        </div>

        <nav className="admin-nav">
          <NavLinks />
        </nav>

        {/* Profilo + Logout in fondo */}
        <div className="admin-sidebar-footer">
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              className="admin-nav-link"
              style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'transparent' }}
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="profile-avatar-btn" style={{ width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0 }}>
                <User size={14} />
              </div>
              Admin
            </button>
            {showProfile && (
              <div className="profile-popup" style={{ bottom: '100%', top: 'auto', marginBottom: 8, left: 0, right: 'auto', width: '100%' }}>
                <button className="profile-popup-item" onClick={() => { setShowProfile(false); navigate(`${basePath}/profile`); }}>
                  <User size={16} /> Il mio Profilo
                </button>
                <button className="profile-popup-item" onClick={() => { setShowProfile(false); navigate(`${basePath}/settings`); }}>
                  <Settings size={16} /> Impostazioni Scuola
                </button>
                <div className="profile-popup-divider" />
                <button className="profile-popup-item danger" onClick={() => logoutAdmin()}>
                  <LogOut size={16} /> Esci
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(2px)' }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%', height: '100%' }}
          >
            {currentOutlet}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
