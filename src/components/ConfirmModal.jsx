import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Conferma', cancelText = 'Annulla', isDanger = true }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            style={{
              background: 'var(--b-cream)', border: '4px solid var(--b-black)',
              boxShadow: 'var(--b-shadow)', padding: 24, maxWidth: 440, width: '100%',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 48, height: 48, background: isDanger ? 'var(--b-red)' : 'var(--b-yellow)',
                border: '3px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '4px 4px 0px rgba(0,0,0,1)'
              }}>
                <AlertTriangle size={24} strokeWidth={2.5} color={isDanger ? '#fff' : '#000'} />
              </div>
              <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.1 }}>
                {title}
              </h3>
            </div>
            
            <p style={{ margin: '0 0 28px 0', fontSize: '0.95rem', color: 'var(--b-black)', fontWeight: 600, lineHeight: 1.5 }}>
              {message}
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                className="btn-neo"
                style={{
                  background: 'var(--b-white)', flex: 1,
                  padding: '12px', fontSize: '0.9rem',
                  display: 'flex', justifyContent: 'center'
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="btn-neo"
                style={{
                  background: isDanger ? 'var(--b-red)' : 'var(--b-yellow)',
                  color: isDanger ? '#fff' : '#000', flex: 1,
                  padding: '12px', fontSize: '0.9rem',
                  display: 'flex', justifyContent: 'center'
                }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
