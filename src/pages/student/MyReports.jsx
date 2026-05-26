import { useState } from 'react';
import { ShieldCheck, MessageSquareWarning, Trash2, CheckCircle2 } from 'lucide-react';

const initialHistory = [
  { id: 101, title: 'Termosifoni spenti', date: '12 Mag 2026', status: 'Risolto', isPublic: true },
  { id: 102, title: 'Problema con un compagno', date: '02 Mag 2026', status: 'In Lavorazione (Privato)', isPublic: false },
];

export default function MyReports() {
  const [reports, setReports] = useState(initialHistory);

  const handleDelete = (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questa segnalazione?')) {
      setReports(reports.filter(r => r.id !== id));
    }
  };

  const handleMarkResolved = (id) => {
    setReports(reports.map(r => 
      r.id === id ? { ...r, status: 'Risolto' } : r
    ));
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--color-text-main)' }}>Il tuo storico</h1>
        <div style={{ color: 'var(--color-text-muted)' }}>Qui puoi controllare e gestire lo stato delle segnalazioni che hai inviato.</div>
      </div>

      {reports.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '48px', fontSize: '1.1rem' }}>
          Non hai ancora effettuato nessuna segnalazione.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {reports.map(report => (
          <div key={report.id} className="flat-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Ticket #{report.id} • {report.date}</span>
                  {!report.isPublic && (
                    <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>PRIVATO</span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-text-main)' }}>{report.title}</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: report.status === 'Risolto' ? '#d1fae5' : '#fef3c7', color: report.status === 'Risolto' ? '#10b981' : '#f59e0b', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }}>
                {report.status === 'Risolto' ? <ShieldCheck size={20} /> : <MessageSquareWarning size={20} />}
                {report.status}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {report.status !== 'Risolto' && (
                <button 
                  onClick={() => handleMarkResolved(report.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #10b981', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#10b981'; }}
                >
                  <CheckCircle2 size={16} /> Segna come risolto
                </button>
              )}
              <button 
                onClick={() => handleDelete(report.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#ef4444'; }}
              >
                <Trash2 size={16} /> Elimina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
