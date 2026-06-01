import { Loader2 } from 'lucide-react';

export default function Button({ children, onClick, loading, disabled, type = 'button', style = {} }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="btn-primary"
      style={{ opacity: (disabled || loading) ? 0.65 : 1, cursor: (disabled || loading) ? 'not-allowed' : 'pointer', ...style }}
    >
      {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}
