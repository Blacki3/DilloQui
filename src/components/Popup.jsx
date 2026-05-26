import { motion, AnimatePresence } from 'framer-motion';

export default function Popup({ show, title, message, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="flat-panel"
            style={{
              padding: "40px 24px",
              textAlign: "center",
              width: "90%",
              maxWidth: "380px"
            }}
          >
            <h3 style={{ color: "var(--color-primary)", fontSize: "24px", marginBottom: "16px" }}>{title}</h3>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "24px", fontSize: "1.1rem" }}>{message}</p>
            {onClose && (
              <button 
                style={{ 
                  width: "100%", 
                  padding: "12px 20px", 
                  borderRadius: "12px", 
                  background: "var(--color-primary-lighter)",
                  color: "var(--color-primary-hover)",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "1rem"
                }} 
                onClick={onClose}
              >
                Chiudi
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
