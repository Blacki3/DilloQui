import { Link, useLocation, useParams, useNavigate, useOutlet } from 'react-router-dom';
import { Home, PlusCircle, History, LogOut, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function StudentLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutStudent } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const currentOutlet = useOutlet();

  const isActive = (path) => location.pathname.includes(path);

  // Chiudi popup se clicchi fuori
  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tabs = [
    { name: 'Home',    path: `/box/${slug}/forum`,   icon: Home,       id: 'forum' },
    { name: 'Nuova',   path: `/box/${slug}/new`,     icon: PlusCircle, id: 'new', isNew: true },
    { name: 'Storico', path: `/box/${slug}/history`, icon: History,    id: 'history' },
    { name: 'Profilo', path: `/box/${slug}/profile`, icon: User,       id: 'profile' },
  ];

  return (
    <div className="student-wrapper">
      {/* Top Navbar */}
      <nav className="student-nav">
        <div className="student-nav-inner">
          {/* Brand */}
          <Link to={`/box/${slug}/forum`} className="student-nav-brand" style={{ textDecoration: 'none' }}>
            <div className="student-nav-brand-text">
              <span className="brand-dillo">Dillo</span>
              <span className="brand-qui"> Qui</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Desktop links */}
            <div className="student-nav-links desktop-nav" style={{ gap: 4 }}>
              {tabs.filter(t => t.id !== 'profile').map(tab => (
                <Link
                  key={tab.id}
                  to={tab.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10, textDecoration: 'none',
                    fontSize: '0.875rem', fontWeight: 600,
                    color: isActive(tab.id) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    background: isActive(tab.id) ? 'var(--color-primary-lighter)' : 'transparent',
                    transition: '0.15s',
                  }}
                >
                  <tab.icon size={15} /> {tab.name}
                </Link>
              ))}
            </div>

            {/* Profile avatar + popup (all screens) */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <button
                className="profile-avatar-btn"
                onClick={() => setShowProfile(!showProfile)}
              >
                <User size={18} />
              </button>

              {showProfile && (
                <div className="profile-popup">
                  <button className="profile-popup-item" onClick={() => { setShowProfile(false); navigate(`/box/${slug}/profile`); }}>
                    <Settings size={16} /> Impostazioni
                  </button>
                  <div className="profile-popup-divider" />
                  <button className="profile-popup-item danger" onClick={() => { setShowProfile(false); logoutStudent(); }}>
                    <LogOut size={16} /> Esci
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="student-main-content">
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

      {/* Bottom Tab Bar (mobile) */}
      <div className="student-tab-bar">
        <div className="student-tab-bar-inner">
          {tabs.filter(t => t.id !== 'profile').map(tab => {
            const active = isActive(tab.id);
            return (
              <button
                key={tab.id}
                className={`tab-item ${active ? 'active' : ''} ${tab.isNew ? 'tab-new' : ''}`}
                onClick={() => navigate(tab.path)}
              >
                <div className="tab-icon-wrap">
                  <tab.icon size={tab.isNew ? 22 : 20} />
                </div>
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
