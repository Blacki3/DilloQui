import { useNavigate } from 'react-router-dom';
import BrandWordmark from './BrandWordmark';

/**
 * Splash solo per il branch Netlify `mostra` (VITE_MOSTRA=true).
 * A schermo intero con "PROVAMI" che respira — per tablet in fiera.
 */
export default function ProvamiSplash({ onEnter }) {
  const navigate = useNavigate();

  const handleEnter = () => {
    try {
      sessionStorage.setItem('dq_mostra_entered', '1');
    } catch {
      /* ignore */
    }
    onEnter?.();
    navigate('/box/demo');
  };

  return (
    <button
      type="button"
      className="provami-splash"
      onClick={handleEnter}
      aria-label="PROVAMI — tocca per entrare nella demo"
      id="provami-splash-enter"
    >
      <div className="provami-splash-brand" aria-hidden="true">
        <BrandWordmark variant="inverted" />
      </div>

      <span className="provami-splash-title">PROVAMI</span>

      <span className="provami-splash-hint">
        Tocca lo schermo per entrare nella demo
      </span>
    </button>
  );
}
