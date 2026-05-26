import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Button({ children, onClick, loading, disabled, variant = 'primary', type = 'button', className = '' }) {
  const baseStyle = {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "0",
    fontWeight: "600",
    fontSize: "1rem",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
  };

  const variants = {
    primary: {
      background: "var(--color-primary)",
      color: "white",
    },
    outline: {
      background: "transparent",
      color: "var(--color-primary)",
      border: "2px solid var(--color-primary)",
    }
  };

  const currentStyle = { ...baseStyle, ...variants[variant] };

  return (
    <motion.button 
      type={type}
      onClick={onClick} 
      disabled={disabled || loading}
      style={currentStyle}
      whileHover={disabled || loading ? {} : { scale: 1.02, backgroundColor: variant === 'primary' ? "var(--color-primary-hover)" : "rgba(46, 139, 87, 0.05)" }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      className={className}
    >
      {loading && <Loader2 className="animate-spin" size={20} />}
      {children}
    </motion.button>
  );
}
