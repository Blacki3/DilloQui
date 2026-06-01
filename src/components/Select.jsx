import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function Select({ value, onChange, options, placeholder = 'Seleziona...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Chiudi se clicchi fuori dal componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '16px', marginTop: '8px' }}>
      
      {/* Tasto principale del selettore */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px 16px',
          background: 'white',
          border: isOpen ? '1px solid var(--color-primary)' : '1px solid #e5e7eb',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '0 0 0 3px var(--color-primary-lighter)' : 'none',
          transition: 'all 0.2s',
          fontWeight: '500',
          color: 'var(--color-text-main)'
        }}
      >
        <span style={{ color: value ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
          {value || placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} color="var(--color-text-muted)" />
        </motion.div>
      </div>

      {/* Tendina animata */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '8px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: value === opt ? 'var(--color-primary-lighter)' : 'white',
                  color: value === opt ? 'var(--color-primary)' : 'var(--color-text-main)',
                  fontWeight: value === opt ? '600' : '500',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => {
                  if (value !== opt) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  if (value !== opt) e.currentTarget.style.background = 'white';
                }}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
