import { useState } from 'react';
import { Lock, Eye, CheckCircle2, X, Send, MessageSquare } from 'lucide-react';

const statusStyle = {
  'In Revisione': { background: '#fef3c7', color: '#92400e' },
  'Chiusa':       { background: '#d1fae5', color: '#065f46' },
  'Risolta':      { background: '#d1fae5', color: '#065f46' },
};

const initialHistory = [
  {
    id: 101,
    title: 'Problema con il tutor di Matematica',
    date: '15 Ottobre, 2023',
    status: 'In Revisione',
    isPublic: false,
    adminReply: 'Stiamo parlando con il docente interessato, ti aggiorneremo presto. - Admin Rossi',
    chat: [
      { id: 1, author: 'Admin Rossi', isAdmin: true, text: 'Stiamo parlando con il docente interessato, ti aggiorneremo presto.', time: 'Ieri' }
    ]
  },
  {
    id: 102,
    title: 'Proposta per un club di scacchi',
    date: '2 Settembre, 2023',
    status: 'Chiusa',
    isPublic: true,
    adminReply: 'Ottima idea! La proposta è stata approvata. Controlla la bacheca. - Admin Bianchi',
    chat: [
      { id: 1, author: 'Admin Bianchi', isAdmin: true, text: 'Ottima idea! La proposta è stata approvata. Controlla la bacheca.', time: '2 Set' }
    ]
  },
  {
    id: 103,
    title: 'Bullismo in palestra',
    date: '25 Settembre, 2023',
    status: 'In Revisione',
    isPublic: false,
    adminReply: null,
    chat: []
  },
];

const filterTabs = ['Tutti', 'In Lavorazione', 'Chiusi'];

export default function MyReports() {
  const [reports, setReports] = useState(initialHistory);
  const [activeFilter, setActiveFilter] = useState('Tutti');
  const [openChat, setOpenChat] = useState(null); // id del report aperto in chat
  const [chatInput, setChatInput] = useState('');
  const [confirmClose, setConfirmClose] = useState(null); // id in attesa conferma

  const filtered = reports.filter(r => {
    if (activeFilter === 'Tutti') return true;
    if (activeFilter === 'In Lavorazione') return r.status === 'In Revisione';
    if (activeFilter === 'Chiusi') return r.status === 'Chiusa' || r.status === 'Risolta';
    return true;
  });

  const markStatus = (id, newStatus) => {
    setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setConfirmClose(null);
  };

  const sendChatMsg = (reportId) => {
    if (!chatInput.trim()) return;
    const msg = { id: Date.now(), author: 'Tu', isAdmin: false, text: chatInput.trim(), time: 'Adesso' };
    setReports(reports.map(r =>
      r.id === reportId ? { ...r, chat: [...r.chat, msg] } : r
    ));
    setChatInput('');
  };

  const openReport = reports.find(r => r.id === openChat);

  // Vista Chat
  if (openChat && openReport) {
    const st = statusStyle[openReport.status] || {};
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            onClick={() => setOpenChat(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 600 }}
          >
            <X size={18} /> Chiudi
          </button>
          <div style={{ padding: '5px 14px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 700, ...st }}>
            {openReport.status}
          </div>
        </div>

        {/* Post header */}
        <div className="report-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {openReport.isPublic ? <Eye size={15} color="var(--color-text-muted)" /> : <Lock size={15} color="var(--color-text-muted)" />}
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{openReport.date}</span>
          </div>
          <h3 style={{ color: 'var(--color-text-main)', margin: 0 }}>{openReport.title}</h3>
        </div>

        {/* Messaggi chat */}
        <div className="flat-panel" style={{ padding: '16px', marginBottom: 12, minHeight: 120 }}>
          <div className="chat-section-title">Conversazione</div>
          {openReport.chat.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Nessun messaggio ancora. L'admin risponderà presto.</p>
          )}
          {openReport.chat.map(msg => (
            <div key={msg.id} style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              {msg.isAdmin ? (
                <div className="chat-admin-avatar" style={{ width: 34, height: 34 }}>
                  <MessageSquare size={16} />
                </div>
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary-lighter)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>TU</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div className="chat-comment-meta">
                  <span style={{ color: msg.isAdmin ? '#1b4332' : 'var(--color-text-main)', fontWeight: 700 }}>{msg.author}</span>
                  <span>•</span><span>{msg.time}</span>
                </div>
                <div className="chat-comment-text">{msg.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Azioni stato */}
        {openReport.status === 'In Revisione' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {confirmClose === openReport.id || confirmClose === openReport.id + '_chiusa' ? (
              <>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', flex: 1 }}>Confermi?</span>
                <button onClick={() => markStatus(openReport.id, confirmClose === openReport.id ? 'Risolta' : 'Chiusa')}
                  style={{ padding: '8px 16px', borderRadius: 50, border: 'none', background: confirmClose === openReport.id ? 'var(--color-primary)' : '#e5e7eb', color: confirmClose === openReport.id ? 'white' : '#374151', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  {confirmClose === openReport.id ? 'Sì, risolto ✓' : 'Sì, chiudi ✕'}
                </button>
                <button onClick={() => setConfirmClose(null)}
                  style={{ padding: '8px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Annulla
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setConfirmClose(openReport.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 50, border: 'none', background: 'var(--color-primary-lighter)', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <CheckCircle2 size={16} /> Segna come Risolta
                </button>
                <button onClick={() => setConfirmClose(openReport.id + '_chiusa')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 50, border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <X size={16} /> Chiudi
                </button>
              </>
            )}
          </div>
        )}

        {/* Input chat */}
        <div className="chat-input-bar">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Scrivi un messaggio..."
            onKeyDown={e => e.key === 'Enter' && sendChatMsg(openReport.id)}
          />
          <button className="chat-send-btn" onClick={() => sendChatMsg(openReport.id)}>
            <Send size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Vista Lista
  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Le Mie Segnalazioni</h1>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', background: '#e9eeea', borderRadius: 50, padding: 4, marginBottom: 20, gap: 2 }}>
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: 50, fontWeight: 600,
              fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              background: activeFilter === tab ? 'white' : 'transparent',
              color: activeFilter === tab ? 'var(--color-text-main)' : 'var(--color-text-muted)',
              boxShadow: activeFilter === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(report => (
          <div key={report.id} className="flat-panel" style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setOpenChat(report.id)}>
            <div style={{ position: 'absolute', top: 16, right: 18, padding: '4px 12px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 700, ...(statusStyle[report.status] || { background: '#f3f4f6', color: '#6b7280' }) }}>
              {report.status}
            </div>
            <div style={{ paddingRight: 100, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{report.title}</span>
                {report.isPublic ? <Eye size={14} color="var(--color-text-muted)" /> : <Lock size={14} color="var(--color-text-muted)" />}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{report.date}</div>
            </div>
            {report.adminReply && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>Risposta: </span>
                {report.adminReply}
              </div>
            )}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              <MessageSquare size={14} /> Apri conversazione ({report.chat.length})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
