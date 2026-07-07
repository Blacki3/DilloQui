import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ChevronRight } from 'lucide-react';
import BrandWordmark from './BrandWordmark';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Funzionalità', path: '#funzionalita' },
  { label: 'Come Funziona', path: '#come-funziona' },
  { label: 'Chi Siamo', path: '/chi-siamo' },
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
  const [activeItem, setActiveItem] = useState('/');
  const isClickScrolling = useRef(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) return;

      if (location.pathname !== '/') {
        setActiveItem(location.pathname);
        return;
      }

      let current = '/';
      const sections = NAV_LINKS.filter(l => l.path.startsWith('#')).map(l => l.path.substring(1));

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2) {
            current = `#${section}`;
          }
        }
      }

      if (window.scrollY < 100) {
        current = '/';
      }

      setActiveItem(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (e, path) => {
    e.preventDefault();
    setMenuOpen(false);

    isClickScrolling.current = true;
    setActiveItem(path);
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 2500); // Wait for smooth scroll to finish

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
                className={`public-navbar-link ${activeItem === l.path ? 'active' : ''}`}
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
              className={`public-mobile-link ${activeItem === item.path ? 'active' : ''}`}
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
