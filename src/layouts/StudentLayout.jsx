import { Link, useLocation, useParams, useNavigate, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, PlusCircle, History, Bell, User, FileText, TrendingUp, ScrollText, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import BrandWordmark from '../components/BrandWordmark';
import { countDrafts } from '../services/draftStore';
import { useNotifications, markAllNotificationsRead as mockMarkAllRead, markNotificationRead as mockMarkRead } from '../services/mockStore';
import { useAuth } from '../context/AuthContext';
import {
  getBox,
  getNotifications,
  markNotificationRead as dbMarkRead,
  markAllNotificationsRead as dbMarkAllRead,
} from '../services/db';
import { Forum, PostDetail, NewReport, MyReports, StudentProfile, Drafts, Tendenze, Regolamento } from '../App';
import { supabase } from '../lib/supabaseClient';
import { usePolling } from '../hooks/usePolling';

export default function StudentLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const profileRef = useRef(null);
  const newMenuRef = useRef(null);
  const currentOutlet = useOutlet();
  const { profile } = useAuth();
  const draftCount = countDrafts(slug);
  const isDemo = slug === 'demo';
  const mockNotifications = useNotifications();
  // Notifiche reali da Supabase (aggiornate via polling + Realtime)
  const [realNotifications, setRealNotifications] = useState([]);
  const notifications = isDemo ? mockNotifications : realNotifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = () => {
    if (isDemo) return Promise.resolve();
    return getNotifications()
      .then(setRealNotifications)
      .catch(() => {});
  };

  useEffect(() => { fetchNotifications(); }, [isDemo]);
  usePolling(fetchNotifications, 30000);

  // Sportello non ancora verificato: lo studente deve saperlo mentre lo usa,
  // non solo al momento dell'iscrizione.
  const [boxVerified, setBoxVerified] = useState(true);
  const [boxSuspended, setBoxSuspended] = useState(false);
  useEffect(() => {
    if (isDemo) return;
    getBox(slug)
      .then(box => {
        setBoxVerified(box?.verified !== false);
        setBoxSuspended(box?.suspended === true);
      })
      .catch(() => {});
  }, [slug, isDemo]);

  // Realtime: nuova notifica arriva istantaneamente
  useEffect(() => {
    if (isDemo || !profile?.id) return;
    const channel = supabase.channel('student_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => fetchNotifications()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isDemo, profile?.id]);

  // Preload in background delle altre rotte Studente
  useEffect(() => {
    const timer = setTimeout(() => {
      Forum.preload?.();
      PostDetail.preload?.();
      NewReport.preload?.();
      MyReports.preload?.();
      StudentProfile.preload?.();
      Drafts.preload?.();
      Tendenze.preload?.();
      Regolamento.preload?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const isActive = (path) => {
    if (path === 'new' && location.pathname.includes('drafts')) return true;
    return location.pathname.includes(path);
  };

  // Chiudi il profilo al click fuori
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) setShowNewMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Chiudi lo speed dial al cambio rotta
  useEffect(() => {
    setShowNewMenu(false);
  }, [location.pathname]);

  const openNotification = async (n) => {
    // Marca come letta
    if (!n.read) {
      if (isDemo) mockMarkRead(n.id);
      else {
        dbMarkRead(n.id).catch(() => {});
        setRealNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      }
    }
    setShowProfile(false);
    if (n.url && !isDemo) {
      navigate(n.url);
    } else if (n.reportId) {
      navigate(`/box/${slug}/post/${n.reportId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (isDemo) {
      mockMarkAllRead();
    } else {
      dbMarkAllRead().catch(() => {});
      setRealNotifications(prev => prev.map(x => ({ ...x, read: true })));
    }
  };

  const tabs = [
    { name: 'Forum',    path: `/box/${slug}/forum`,      icon: Home,       id: 'forum' },
    { name: 'Tendenze', path: `/box/${slug}/tendenze`,   icon: TrendingUp, id: 'tendenze' },
    { name: 'Nuova',    path: `/box/${slug}/new`,        icon: PlusCircle, id: 'new', isNew: true },
    { name: 'Storico',  path: `/box/${slug}/history`,    icon: History,    id: 'history' },
  ];

  const desktopExtra = [
    { name: 'Regole', path: `/box/${slug}/regolamento`, icon: ScrollText, id: 'regolamento' },
  ];

  return (
    <div className="student-wrapper">
      {/* Backdrop invisibile per chiudere il menù al tap fuori */}
      {showNewMenu && (
        <div
          className="speed-dial-backdrop"
          onClick={() => setShowNewMenu(false)}
          style={{
            position: 'fixed',
            inset: 0,
            /* z-index 98: sotto il tab-bar (100) così le orecchie, che emergono
               dal tab-bar, non vengono mai coperte dal backdrop */
            zIndex: 98,
            background: 'transparent',
          }}
        />
      )}

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
              {[...tabs, ...desktopExtra].map(tab => (
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

            {/* Notifications and Profile buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }} ref={profileRef}>
                <button
                  className="profile-avatar-btn"
                  onClick={() => setShowProfile(!showProfile)}
                  id="student-profile-btn"
                  aria-label="Apri centro notifiche"
                  aria-expanded={showProfile}
                  aria-controls="student-profile-menu"
                  style={{ position: 'relative' }}
                >
                  <Bell size={17} strokeWidth={2.5} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -3, right: -3,
                      background: 'var(--b-red)', color: 'white',
                      fontSize: '0.65rem', fontWeight: 800,
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--b-black)', borderRadius: '50%'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showProfile && (
                  <div className="profile-popup" id="student-profile-menu" style={{ width: 300, right: 0 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '2px solid var(--b-black)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Notifiche
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} style={{ background: 'transparent', border: 'none', color: 'var(--b-blue)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline' }}>Segna lette</button>
                      )}
                    </div>
                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 16, textAlign: 'center', color: 'var(--b-gray)', fontSize: '0.85rem' }}>Nessuna notifica</div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => openNotification(n)}
                            style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.1)', background: n.read ? 'transparent' : 'rgba(255, 238, 0, 0.15)', cursor: 'pointer', transition: 'background 0.2s' }}
                          >
                            <span style={{ fontSize: '0.85rem', color: 'var(--b-black)', display: 'block', marginBottom: 4, fontWeight: n.read ? 500 : 700 }}>{n.text}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--b-gray)' }}>{n.time}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tasto Profilo (Visibile solo su Desktop) */}
              <button
                className="profile-avatar-btn desktop-nav"
                onClick={() => navigate(`/box/${slug}/profile`)}
                aria-label="Apri profilo studente"
                title="Profilo"
              >
                <User size={17} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {boxSuspended ? (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--b-red)', color: 'var(--b-white)',
            borderBottom: '3px solid var(--b-black)',
            padding: '8px 16px', fontSize: '0.76rem', fontWeight: 700,
            lineHeight: 1.35, textAlign: 'center',
          }}
        >
          <AlertTriangle size={15} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span>Sportello sospeso: puoi rileggere quello che hai scritto, ma non inviare nulla di nuovo</span>
        </div>
      ) : !boxVerified && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--b-orange)', color: 'var(--b-white)',
            borderBottom: '3px solid var(--b-black)',
            padding: '8px 16px', fontSize: '0.76rem', fontWeight: 700,
            lineHeight: 1.35, textAlign: 'center',
          }}
        >
          <AlertTriangle size={15} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span>Sportello non ancora verificato da DilloQui</span>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`student-main-content${location.pathname.endsWith('/new') ? ' student-main-content--wide' : ''}`}
            style={{ width: '100%', height: '100%', flex: 1 }}
          >
            {currentOutlet}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar (mobile) */}
      <div className="student-tab-bar">

        <div className="student-tab-bar-inner">
          {tabs.map(tab => {
            const active = isActive(tab.id);

            // Tab "Nuova" — speed dial Mickey ears
            if (tab.isNew) {
              return (
                <div key={tab.id} className="speed-dial-wrapper" ref={newMenuRef}>

                  {/* Le due orecchie */}
                  <div className="speed-dial-ears">

                    {/* Orecchio sinistro — Bozze */}
                    <div className="speed-dial-ear">
                      <button
                        className={`speed-dial-orb ${showNewMenu ? 'open' : 'closed'}`}
                        style={{
                          background: 'var(--b-cream)',
                          transitionDelay: showNewMenu ? '0.05s' : '0s',
                          position: 'relative',
                        }}
                        onClick={() => { setShowNewMenu(false); navigate(`/box/${slug}/drafts`); }}
                        id="speed-dial-drafts"
                      >
                        <FileText size={19} strokeWidth={2.5} />
                        {draftCount > 0 && (
                          <span style={{
                            position: 'absolute', top: -3, right: -3,
                            background: 'var(--b-red)', color: 'var(--b-white)',
                            fontSize: '0.65rem', fontWeight: 900, fontFamily: "'IBM Plex Mono', monospace",
                            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%', border: '2px solid var(--b-black)'
                          }}>
                            {draftCount}
                          </span>
                        )}
                      </button>
                      <span className={`speed-dial-orb-label ${showNewMenu ? 'open' : 'closed'}`}>
                        Bozze
                      </span>
                    </div>

                    {/* Orecchio destro — Nuova */}
                    <div className="speed-dial-ear">
                      <button
                        className={`speed-dial-orb ${showNewMenu ? 'open' : 'closed'}`}
                        style={{
                          background: 'var(--b-yellow)',
                          transitionDelay: showNewMenu ? '0s' : '0.05s',
                        }}
                        onClick={() => { setShowNewMenu(false); navigate(`/box/${slug}/new`); }}
                        id="speed-dial-new"
                      >
                        <PlusCircle size={22} strokeWidth={2.5} />
                      </button>
                      <span className={`speed-dial-orb-label ${showNewMenu ? 'open' : 'closed'}`}>
                        Nuova
                      </span>
                    </div>
                  </div>

                  {/* Bottone principale — tab bar */}
                  <button
                    className={`tab-item ${active || isActive('drafts') ? 'active' : ''} tab-new`}
                    onClick={() => setShowNewMenu(prev => !prev)}
                    id={`tab-${tab.id}`}
                    style={{ flex: 1, width: '100%', zIndex: 101, position: 'relative' }}
                  >
                    <div className={`tab-new-icon ${showNewMenu ? 'open' : ''}`}>
                      <PlusCircle size={22} strokeWidth={2.5} />
                    </div>
                    <span>{tab.name}</span>
                  </button>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                className={`tab-item ${active ? 'active' : ''}`}
                onClick={() => navigate(tab.path)}
                id={`tab-${tab.id}`}
              >
                <div className="tab-icon-wrap">
                  <tab.icon size={19} strokeWidth={2.5} />
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
