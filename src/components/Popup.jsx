import { X } from 'lucide-react';

export default function Popup({ show, title, message, onClose, children }) {
  if (!show) return null;

  return (
    <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="popup-box">
        {onClose && (
          <button className="popup-close-btn" onClick={onClose} aria-label="Chiudi popup">
            <X size={18} strokeWidth={3} />
          </button>
        )}
        {title && <div className="popup-title">{title}</div>}
        {message && (
          <p style={{ color: 'var(--b-gray)', marginBottom: 24, fontSize: '0.95rem', lineHeight: 1.6 }}>
            {message}
          </p>
        )}
        {children}
        {onClose && !children && (
          <button className="btn-primary" onClick={onClose} style={{ marginTop: 8 }}>
            Chiudi ✕
          </button>
        )}
      </div>
    </div>
  );
}
