import { Link, useLocation, useParams, useNavigate, useOutlet } from 'react-router-dom';
import { Home, PlusCircle, History, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import BrandWordmark from '../components/BrandWordmark';

export default function StudentLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutStudent } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const currentOutlet = useOutlet();

  const isActive = (path) => location.pathname.includes(path);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tabs = [
    { name: 'Forum',   path: `/box/${slug}/forum`,   icon: Home,       id: 'forum' },
    { name: 'Nuova',   path: `/box/${slug}/new`,     icon: PlusCircle, id: 'new', isNew: true },
    { name: 'Storico', path: `/box/${slug}/history`, icon: History,    id: 'history' },
  ];

  return (
    <div className="student-wrapper">
      {/* Top Navbar */}
      <nav className="student-nav">
        <div className="student-nav-inner">
          {/* Brand */}
          <Link to={`/box/${slug}/forum`} className="student-nav-brand" style={{ textDecoration: 'none' }}>
            <BrandWordmark />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Desktop links */}
            <div className="student-nav-links desktop-nav" style={{ gap: 4 }}>
              {tabs.map(tab => (
                <Link
                  key={tab.id}
                  to={tab.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', textDecoration: 'none',
                    fontSize: '0.78rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: isActive(tab.id) ? 'var(--b-black)' : 'var(--b-gray)',
                    background: isActive(tab.id) ? 'var(--b-yellow)' : 'transparent',
                    border: isActive(tab.id) ? '2px solid var(--b-black)' : '2px solid transparent',
                    transition: '0.1s',
                  }}
                >
                  <tab.icon size={14} /> {tab.name}
                </Link>
              ))}
            </div>

            {/* Profile button */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <button
                className="profile-avatar-btn"
                onClick={() => setShowProfile(!showProfile)}
                id="student-profile-btn"
                aria-label="Apri menu profilo studente"
                aria-expanded={showProfile}
                aria-controls="student-profile-menu"
              >
                <User size={17} strokeWidth={2.5} />
              </button>

              {showProfile && (
                <div className="profile-popup" id="student-profile-menu">
                  <button className="profile-popup-item" onClick={() => { setShowProfile(false); navigate(`/box/${slug}/profile`); }}>
                    <Settings size={15} /> Impostazioni
                  </button>
                  <div className="profile-popup-divider" />
                  <button className="profile-popup-item danger" onClick={() => { setShowProfile(false); logoutStudent(); }}>
                    <LogOut size={15} /> Esci
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="student-main-content">
        {currentOutlet}
      </main>

      {/* Bottom Tab Bar (mobile) */}
      <div className="student-tab-bar">
        <div className="student-tab-bar-inner">
          {tabs.map(tab => {
            const active = isActive(tab.id);
            return (
              <button
                key={tab.id}
                className={`tab-item ${active ? 'active' : ''} ${tab.isNew ? 'tab-new' : ''}`}
                onClick={() => navigate(tab.path)}
                id={`tab-${tab.id}`}
              >
                <div className="tab-icon-wrap">
                  <tab.icon size={tab.isNew ? 22 : 19} strokeWidth={2.5} />
                </div>
                <span>{tab.name}</span>
              </button>
            );
          })}
          {/* Profile tab mobile */}
          <button
            className={`tab-item ${isActive('profile') ? 'active' : ''}`}
            onClick={() => navigate(`/box/${slug}/profile`)}
            id="tab-profile"
          >
            <div className="tab-icon-wrap">
              <User size={19} strokeWidth={2.5} />
            </div>
            <span>Profilo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
