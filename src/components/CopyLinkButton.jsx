import { useEffect, useRef, useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

/**
 * CopyLinkButton
 * 
 * Props:
 *  - url: string — testo da copiare negli appunti
 *  - label: string — label del bottone (default "Condividi")
 *  - icon: 'share' | 'copy' — icona di default (default 'share')
 *  - style: object — stili aggiuntivi sul bottone
 *  - className: string — classi aggiuntive
 */
export default function CopyLinkButton({
  url,
  label = 'Condividi',
  icon = 'share',
  style = {},
  className = '',
  id,
}) {
  const [copied, setCopied] = useState(false);
  const [ripple, setRipple] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const btnRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const handleCopy = (e) => {
    if (copied) return;

    // 1. Calcola la posizione del clic relativa al bottone
    const btn = btnRef.current;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 2. Calcola il raggio necessario a coprire l'angolo più lontano
    const maxDist = Math.ceil(
      Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y)
      )
    );

    // 3. Attiva il ripple e copia
    if (!prefersReducedMotion) {
      setRipple({ x, y, size: maxDist * 2 + 8 });
    }
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);

    // 4. Reset dopo 2.4s
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
      setRipple(null);
    }, 2400);
  };

  const DefaultIcon = icon === 'copy' ? Copy : Share2;

  return (
    <button
      ref={btnRef}
      onClick={handleCopy}
      id={id}
      className={className}
      aria-label={label || 'Copia link'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 24px',
        border: '3px solid var(--b-black)',
        background: copied ? 'var(--b-green)' : 'var(--b-yellow)',
        color: 'var(--b-black)',
        fontWeight: 800,
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        cursor: copied ? 'default' : 'pointer',
        boxShadow: 'var(--b-shadow)',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: prefersReducedMotion ? 'none' : 'box-shadow 0.1s, transform 0.1s',
        userSelect: 'none',
        ...style,
      }}
      onMouseEnter={e => {
        if (!copied && !prefersReducedMotion) {
          e.currentTarget.style.boxShadow = 'var(--b-shadow-lg)';
          e.currentTarget.style.transform = 'translate(-1px, -1px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--b-shadow)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Ripple layer */}
      {ripple && (
        <span
          key={ripple.x + '-' + ripple.y}          // forza remount ad ogni click
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            background: 'var(--b-green)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%) scale(0)',
            animation: 'rippleExpand 0.45s cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Content — sopra il ripple */}
      <span
        key={copied ? 'done' : 'idle'}             // forza re-render per l'animazione icona
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: copied ? '#FFFFFF' : 'var(--b-black)',
          animation: prefersReducedMotion ? 'none' : 'iconPop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1)',
        }}
      >
        {copied
          ? <Check size={18} strokeWidth={3} />
          : <DefaultIcon size={18} strokeWidth={2.5} />
        }
        {copied ? 'Copiato!' : label}
      </span>
    </button>
  );
}
