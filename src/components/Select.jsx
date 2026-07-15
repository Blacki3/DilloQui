import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Select({ value, onChange, options, placeholder = 'Seleziona...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Chiude il menu se si clicca fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options.find(opt => {
    const optValue = typeof opt === 'object' ? opt.value : opt;
    return optValue === value;
  });
  
  const displayLabel = selectedOpt 
    ? (typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt) 
    : placeholder;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: 16, marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          width: '100%', padding: '12px 16px', background: isOpen ? 'var(--b-yellow)' : 'var(--b-white)',
          border: 'var(--b-border)', borderRadius: 'var(--b-radius)',
          boxShadow: '3px 3px 0 var(--b-black)', cursor: 'pointer', outline: 'none',
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem',
          color: value ? 'var(--b-black)' : 'var(--b-gray)', transition: 'background 0.2s'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayLabel}
        </span>
        <ChevronDown size={18} strokeWidth={3} color="var(--b-black)" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--b-white)', border: '2px solid var(--b-black)',
              boxShadow: 'var(--b-shadow-sm)', zIndex: 50,
              display: 'flex', flexDirection: 'column', marginTop: 4,
              maxHeight: 250, overflowY: 'auto', transformOrigin: 'top center'
            }}
          >
            {options.map((opt, idx) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              const isSelected = value === optValue;

              return (
                <button
                  key={optValue}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    background: isSelected ? 'var(--b-yellow)' : 'transparent',
                    border: 'none',
                    borderBottom: idx < options.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    textAlign: 'left',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: 'var(--b-black)',
                    cursor: 'pointer'
                  }}
                >
                  {optLabel}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
