import { useState } from 'react';
import { Search, SlidersHorizontal, MessageSquare, ArrowLeft, Send } from 'lucide-react';

const typeClass = {
  problema: 'badge badge-problema',
  proposta:  'badge badge-proposta',
  dubbio:    'badge badge-dubbio',
};

const statusMap = {
  new:      { label: 'Nuova',   dot: 'var(--color-blue)',    textClass: 'badge-status-new', bg: '#eff6ff' },
  read:     { label: 'Letta',   dot: '#9ca3af',              textClass: 'badge-status-read', bg: '#f3f4f6' },
  resolved: { label: 'Risolta', dot: 'var(--color-primary)', textClass: 'badge-status-resolved', bg: '#d1fae5' },
};

const mockReports = [
  { 
    id: 1, date: '31 Mag 2026', type: 'problema', author: 'Anonimo', title: 'Riscaldamento rotto in 3B', status: 'new',
    content: 'Fa molto freddo in 3B da due giorni, il termosifone perde acqua.',
    chat: [
      { id: 1, author: 'Anonimo', isAdmin: false, text: 'Fa molto freddo in 3B da due giorni, il termosifone perde acqua.', time: 'Ieri' }
    ]
  },
  { 
    id: 2, date: '29 Mag 2026', type: 'proposta', author: 'Mario Rossi', title: 'Nuovi cestini riciclaggio', status: 'read',
    content: 'Propongo di aggiungere cestini per la carta in ogni piano.',
    chat: []
  },
];

export default function ReportsList() {
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState(mockReports);
  const [openChat, setOpenChat] = useState(null);
  const [chatInput, setChatInput] = useState('');

  const filtered = reports.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.author.toLowerCase().includes(search.toLowerCase())
  );

  const openReport = reports.find(r => r.id === openChat);

  const sendChatMsg = (reportId) => {
    if (!chatInput.trim()) return;
    const msg = { id: Date.now(), author: 'Admin', isAdmin: true, text: chatInput.trim(), time: 'Adesso' };
    setReports(reports.map(r =>
      r.id === reportId ? { ...r, chat: [...r.chat, msg], status: 'read' } : r
    ));
    setChatInput('');
  };

  if (openChat && openReport) {
    const st = statusMap[openReport.status] || statusMap.read;
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            onClick={() => setOpenChat(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 600 }}
          >
            <ArrowLeft size={18} /> Indietro
          </button>
          <div style={{ padding: '5px 14px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 700, background: st.bg, color: st.dot }}>
            {st.label}
          </div>
        </div>

        <div className="report-detail-header">
          <span className={typeClass[openReport.type] || 'badge'}>{openReport.type.toUpperCase()}</span>
          <h2 style={{ marginTop: 12, marginBottom: 8, color: 'var(--color-text-main)', fontSize: '1.3rem', lineHeight: 1.3 }}>
            {openReport.title}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: 16 }}>
            {openReport.content}
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            {openReport.date} • {openReport.author}
          </div>
        </div>

        <div className="flat-panel" style={{ padding: '16px', marginBottom: 12, minHeight: 120 }}>
          <div className="chat-section-title">Conversazione</div>
          {openReport.chat.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Nessun messaggio.</p>
          )}
          {openReport.chat.map(msg => (
            <div key={msg.id} style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              {!msg.isAdmin ? (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4b5563' }}>STU</span>
                </div>
              ) : (
                <div className="chat-admin-avatar" style={{ width: 34, height: 34 }}>
                  <MessageSquare size={16} />
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

        <div className="chat-input-bar">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Scrivi una risposta allo studente..."
            onKeyDown={e => e.key === 'Enter' && sendChatMsg(openReport.id)}
          />
          <button className="chat-send-btn" onClick={() => sendChatMsg(openReport.id)}>
            <Send size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ color: 'var(--color-text-main)' }}>Segnalazioni</h1>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600 }}>
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f4f6', borderRadius: 50, padding: '10px 18px', marginBottom: 20 }}>
        <Search size={17} color="var(--color-text-muted)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca segnalazioni"
          style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.9rem', color: 'var(--color-text-main)', margin: 0, padding: 0 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(report => {
          const st = statusMap[report.status] || statusMap.read;
          return (
            <div 
              key={report.id} 
              className="admin-report-card" 
              style={{ cursor: 'pointer', touchAction: 'manipulation' }} 
              role="button"
              tabIndex={0}
              onClick={() => setOpenChat(report.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenChat(report.id); }}
            >
              <div style={{ flex: 1 }}>
                <div className="admin-report-card-date">{report.date}</div>
                <div className="admin-report-card-author">{report.author}</div>
                <div className="admin-report-card-title">{report.title}</div>
                <div className="admin-report-card-status">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot }} />
                  <span className={st.textClass}>{st.label}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, paddingLeft: 12 }}>
                <span className={typeClass[report.type] || 'badge'}>
                  {report.type.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
