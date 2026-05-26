import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { Home, PlusCircle, History, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function StudentLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const { logoutStudent } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const displaySlugName = slug ? slug.toUpperCase() : 'SCUOLA';

  const menu = [
    { name: 'Bacheca', path: `/box/${slug}/forum`, icon: <Home size={20} /> },
    { name: 'Nuova', path: `/box/${slug}/new`, icon: <PlusCircle size={20} /> },
    { name: 'Le Mie Segnalazioni', path: `/box/${slug}/history`, icon: <History size={20} /> },
  ];

  // Componente per link per evitare ripetizioni e gestire onClick per mobile
  const renderLinks = () => (
    <>
      {menu.map((item) => {
        const isActive = location.pathname.includes(item.path);
        return (
          <Link 
            key={item.path}
            to={item.path}
            onClick={() => setIsMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: isActive ? 'var(--color-primary-lighter)' : 'transparent',
              fontWeight: isActive ? '600' : '500',
              transition: '0.2s'
            }}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        )
      })}
      
      <div style={{ width: '100%', height: '1px', background: '#e5e7eb', margin: '4px 0' }} className="mobile-only-divider"></div>
      
      <button 
        onClick={() => {
          setIsMenuOpen(false);
          logoutStudent();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '8px',
          color: 'var(--color-danger)',
          background: 'transparent',
          border: 'none',
          fontWeight: '500',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <LogOut size={20} />
        <span>Esci</span>
      </button>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar Principale */}
      <nav className="student-nav">
        <div className="student-nav-inner">
          <div className="student-nav-brand">
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-main)', lineHeight: 1 }}>Dillo Qui</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: '600', lineHeight: 1 }}>{displaySlugName}</span>
          </div>

          {/* Icona Hamburger visibile solo su Mobile */}
          <button className="mobile-nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Links Desktop (nascosti su mobile) */}
          <div className="student-nav-links desktop-nav">
            {renderLinks()}
          </div>
        </div>

        {/* Menu a discesa per Mobile */}
        {isMenuOpen && (
          <div className="mobile-nav-menu">
            {renderLinks()}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="student-main-content" style={{ flex: 1, padding: '32px 24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
      
      <style>{`
        @media (min-width: 769px) {
          .mobile-only-divider { display: none; }
        }
      `}</style>
    </div>
  );
}
