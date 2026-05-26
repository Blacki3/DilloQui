import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, MessageSquareWarning, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function AdminLayout() {
  const location = useLocation();
  const { logoutAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menu = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Segnalazioni', path: '/admin/reports', icon: <MessageSquareWarning size={20} /> },
    { name: 'Impostazioni', path: '/admin/settings', icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div className="admin-container">
      
      {/* Mobile Top Bar (visibile solo da max-width 768px in poi) */}
      <div className="admin-mobile-topbar">
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary)' }}>Admin Panel</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Dillo Qui</div>
        </div>
        <button className="mobile-nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Sidebar Desktop / Menu a tendina Mobile */}
      <aside className={`admin-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header" style={{ marginBottom: '40px', padding: '0 12px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary)' }}>Admin Panel</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Dillo Qui</div>
        </div>

        <nav className="admin-nav">
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
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-primary-lighter)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  transition: '0.2s'
                }}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <button 
          onClick={logoutAdmin}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            color: 'var(--color-danger)',
            background: 'transparent',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left',
            marginTop: 'auto'
          }}
        >
          <LogOut size={20} />
          Esci
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
