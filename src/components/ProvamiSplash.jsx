import { useNavigate } from 'react-router-dom';

/**
 * Popup SVG "PROVAMI" che respira — solo con VITE_MOSTRA=true.
 * Non copre la homepage: flotta sopra, tap → demo.
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
      className="provami-popup"
      onClick={handleEnter}
      aria-label="PROVAMI — tocca per entrare nella demo"
      id="provami-splash-enter"
    >
      <svg
        className="provami-popup-svg"
        viewBox="0 0 280 120"
        width="280"
        height="120"
        role="img"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="272"
          height="112"
          fill="#FFD600"
          stroke="#0A0A0A"
          strokeWidth="6"
        />
        <text
          x="140"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#0A0A0A"
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight="900"
          fontSize="42"
          letterSpacing="0.06em"
        >
          PROVAMI
        </text>
        <text
          x="140"
          y="92"
          textAnchor="middle"
          fill="#0A0A0A"
          fontFamily="'Space Grotesk', sans-serif"
          fontWeight="700"
          fontSize="11"
          letterSpacing="0.08em"
          opacity="0.7"
        >
          TOCCA PER LA DEMO
        </text>
      </svg>
    </button>
  );
}
