import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ChevronRight } from 'lucide-react';
import BrandWordmark from './BrandWordmark';

const NAV_LINKS = [
  { label: 'Home',          path: '/' },
  { label: 'Funzionalità',  path: '#funzionalita' },
  { label: 'Come Funziona', path: '#come-funziona' },
  { label: 'Chi Siamo',     path: '/chi-siamo' },
];

const getScrollBehavior = () => (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
);

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: y, behavior: getScrollBehavior() });
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleNavClick = (e, path) => {
    e.preventDefault();
    setMenuOpen(false);
    if (path.startsWith('#')) {
      const id = decodeURIComponent(path.slice(1));
      if (location.pathname === '/') {
        scrollToId(id);
      } else {
        navigate('/', { state: { scrollTo: id } });
      }
    } else {
      if (path === '/' && location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: getScrollBehavior() });
        return;
      }
      navigate(path);
    }
  };

  return (
    <>
      <nav className="public-navbar">
        <div className="public-navbar-inner">
          <button onClick={() => navigate('/')} className="public-navbar-brand" id="nav-brand">
            <BrandWordmark />
          </button>

          <div className="public-navbar-links lnav-desktop">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.path}
                onClick={(e) => handleNavClick(e, l.path)}
                className="public-navbar-link"
                id={`nav-${l.label.toLowerCase().replace(' ', '-')}`}
              >
                {l.label}
              </a>
            ))}

            <button onClick={() => navigate('/admin/login')} className="public-navbar-btn public-navbar-btn-secondary" id="nav-accedi">
              Accedi
            </button>

            <button onClick={() => navigate('/admin/login')} className="public-navbar-btn public-navbar-btn-primary" id="nav-crea-box">
              Crea la tua Box <ArrowRight size={14} strokeWidth={3} />
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`lnav-mobile-btn ${menuOpen ? 'open' : ''}`}
            id="nav-hamburger"
            aria-label={menuOpen ? 'Chiudi menu di navigazione' : 'Apri menu di navigazione'}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
          >
            {menuOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={2.5} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="public-mobile-menu" id="public-mobile-menu">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              className="public-mobile-link"
            >
              {item.label} <ChevronRight size={18} strokeWidth={3} />
            </a>
          ))}

          <div className="public-mobile-cta-row">
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/admin/login');
              }}
              className="public-navbar-btn public-navbar-btn-secondary public-mobile-cta"
            >
              Accedi
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/admin/login');
              }}
              className="public-navbar-btn public-navbar-btn-primary public-mobile-cta"
            >
              Crea Box →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .lnav-desktop { display: none !important; }
          .lnav-mobile-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
