import { useState } from 'react';

const mockReports = [
  { id: 1, date: '23 Mag 2026', type: 'problema', author: 'Anonimo', title: 'Riscaldamento rotto in 3B', status: 'new' },
  { id: 2, date: '22 Mag 2026', type: 'proposta', author: 'Mario Rossi', title: 'Nuovi cestini riciclaggio', status: 'read' },
  { id: 3, date: '20 Mag 2026', type: 'dubbio', author: 'Anonimo', title: 'Date esami recupero', status: 'resolved' },
];

export default function ReportsList() {
  const [filter, setFilter] = useState('all');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Segnalazioni</h1>
          <div style={{ color: 'var(--color-text-muted)' }}>Gestisci le richieste degli studenti.</div>
        </div>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 'auto', padding: '10px 16px', margin: 0, borderRadius: '8px' }}
        >
          <option value="all">Tutte le segnalazioni</option>
          <option value="new">Da leggere</option>
          <option value="resolved">Risolte</option>
        </select>
      </div>

      <div className="flat-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Data</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Autore</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Tipo</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Oggetto (Anteprima)</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {mockReports.map((report) => (
              <tr key={report.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '16px 24px' }}>{report.date}</td>
                <td style={{ padding: '16px 24px', fontWeight: '500' }}>{report.author}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    background: report.type === 'problema' ? '#fee2e2' : report.type === 'proposta' ? '#d1fae5' : '#fef3c7',
                    color: report.type === 'problema' ? '#ef4444' : report.type === 'proposta' ? '#10b981' : '#f59e0b'
                  }}>
                    {report.type.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)' }}>{report.title}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: report.status === 'new' ? '#3b82f6' : report.status === 'resolved' ? '#10b981' : '#9ca3af',
                    marginRight: '8px'
                  }}></span>
                  {report.status === 'new' ? 'Nuova' : report.status === 'resolved' ? 'Risolta' : 'Letta'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
