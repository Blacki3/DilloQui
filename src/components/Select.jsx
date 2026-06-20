import { ChevronDown } from 'lucide-react';

export default function Select({ value, onChange, options, placeholder = 'Seleziona...' }) {
  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: 16, marginTop: 8 }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ marginBottom: 0, marginTop: 0, paddingRight: 44 }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={3}
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--b-black)',
        }}
      />
    </div>
  );
}
