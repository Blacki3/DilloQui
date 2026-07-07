import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, CheckCircle2, X, Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { useReports, addMessage, setStatus, STATUS, STATUS_LABEL, STATUS_BADGE_CLASS } from '../../services/mockStore';

const filterTabs = ['Tutti', 'In Lavorazione', 'Chiusi'];

export default function MyReports() {
  const reports = useReports()
    .filter((item) => item.mine)
    .sort((a, b) => b.createdAt - a.createdAt);
  const [activeFilter, setActiveFilter] = useState('Tutti');
  const [openChat, setOpenChat] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [confirmClose, setConfirmClose] = useState(null);
  const chatEndRef = useRef(null);

  const filtered = reports.filter(r => {
    if (activeFilter === 'Tutti') return true;
    if (activeFilter === 'In Lavorazione') return r.status === STATUS.in_review || r.status === STATUS.new;
    if (activeFilter === 'Chiusi') return r.status === STATUS.closed || r.status === STATUS.resolved;
    return true;
  });

  const markStatus = (id, newStatus) => {
    setStatus(id, newStatus);
    setConfirmClose(null);
  };

  const sendChatMsg = (reportId) => {
    if (!chatInput.trim()) return;
    addMessage(reportId, { text: chatInput.trim(), isAdmin: false, author: 'Tu' });
    setChatInput('');
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const openReport = reports.find(r => r.id === openChat);

  // Vista Chat
  if (openChat && openReport) {
    const statusClass = STATUS_BADGE_CLASS[openReport.status] || 'badge badge-status-new';
    const statusLabel = STATUS_LABEL[openReport.status] || openReport.status;
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <button
            onClick={() => setOpenChat(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--b-white)', border: 'var(--b-border)',
              cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              padding: '8px 14px', boxShadow: 'var(--b-shadow-sm)',
              fontFamily: "'Space Grotesk', sans-serif",
              transition: 'box-shadow 0.1s, transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
            id="chat-back-btn"
          >
            <ArrowLeft size={15} strokeWidth={3} /> Indietro
          </button>
          <div className={statusClass}>
            {statusLabel}
          </div>
        </div>

        {/* Post header */}
        <div className="report-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {openReport.isPublic
              ? <Eye size={14} color="var(--b-gray)" strokeWidth={2.5} />
              : <Lock size={14} color="var(--b-gray)" strokeWidth={2.5} />}
            <span style={{ fontSize: '0.78rem', color: 'var(--b-gray)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{openReport.date}</span>
          </div>
          <h3 style={{ textTransform: 'uppercase', fontSize: '1rem' }}>{openReport.title}</h3>
        </div>

        {/* Messaggi chat */}
        <div className="flat-panel" style={{ padding: '16px', marginBottom: 12, minHeight: 120 }}>
          <div className="chat-section-title">Conversazione</div>
          {openReport.chat.length === 0 && (
            <p style={{ color: 'var(--b-gray)', fontSize: '0.875rem' }}>Nessun messaggio ancora. L'admin risponderà presto.</p>
          )}
          {openReport.chat.map(msg => (
            <div key={msg.id} style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              {msg.isAdmin ? (
                <div className="chat-admin-avatar" style={{ width: 34, height: 34, border: '2px solid var(--b-black)', flexShrink: 0 }}>
                  <MessageSquare size={15} strokeWidth={2.5} />
                </div>
              ) : (
                <div style={{ width: 34, height: 34, background: 'var(--b-yellow)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>TU</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div className="chat-comment-meta">
                  <span style={{ color: 'var(--b-black)', fontWeight: 800 }}>{msg.author}</span>
                  <span>•</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{msg.time}</span>
                </div>
                <div className="chat-comment-text">{msg.text}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Azioni stato */}
        {(openReport.status === STATUS.in_review || openReport.status === STATUS.new) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {confirmClose === openReport.id || confirmClose === openReport.id + '_chiusa' ? (
              <>
                <span style={{ fontSize: '0.85rem', color: 'var(--b-gray)', display: 'flex', alignItems: 'center', flex: 1, fontWeight: 700, textTransform: 'uppercase' }}>Confermi?</span>
                <button
                  onClick={() => markStatus(openReport.id, confirmClose === openReport.id ? STATUS.resolved : STATUS.closed)}
                  style={{ padding: '8px 16px', border: '2px solid var(--b-black)', background: confirmClose === openReport.id ? 'var(--b-green)' : 'var(--b-gray-l)', color: confirmClose === openReport.id ? '#FFFFFF' : 'var(--b-black)', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}
                  id="confirm-status-btn"
                >
                  {confirmClose === openReport.id ? 'Sì, risolto ✓' : 'Sì, chiudi ✕'}
                </button>
                <button
                  onClick={() => setConfirmClose(null)}
                  style={{ padding: '8px 16px', border: '2px solid var(--b-black)', background: 'var(--b-white)', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}
                  id="cancel-status-btn"
                >
                  Annulla
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmClose(openReport.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: '2px solid var(--b-black)', background: 'var(--b-yellow)', color: 'var(--b-black)', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", boxShadow: 'var(--b-shadow-sm)' }}
                  id="mark-resolved-btn"
                >
                  <CheckCircle2 size={15} strokeWidth={3} /> Segna come Risolta
                </button>
                <button
                  onClick={() => setConfirmClose(openReport.id + '_chiusa')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: '2px solid var(--b-black)', background: 'var(--b-white)', color: 'var(--b-black)', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", boxShadow: 'var(--b-shadow-sm)' }}
                  id="mark-closed-btn"
                >
                  <X size={15} strokeWidth={3} /> Chiudi
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
            id="chat-input"
          />
          <button className="chat-send-btn" onClick={() => sendChatMsg(openReport.id)} aria-label="Invia messaggio" id="chat-send-btn">
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // Vista Lista
  return (
    <div>
      <h1 style={{ marginBottom: 20, textTransform: 'uppercase' }}>Le Mie Segnalazioni</h1>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '3px solid var(--b-black)', width: 'fit-content', boxShadow: 'var(--b-shadow-sm)' }}>
        {filterTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            style={{
              padding: '9px 18px', border: 'none',
              borderRight: i < filterTabs.length - 1 ? '2px solid var(--b-black)' : 'none',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
              transition: 'background 0.1s',
              background: activeFilter === tab ? 'var(--b-yellow)' : 'var(--b-white)',
              color: 'var(--b-black)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
            id={`filter-tab-${tab.toLowerCase().replace(' ', '-')}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(report => {
          const statusClass = STATUS_BADGE_CLASS[report.status] || 'badge badge-status-new';
          const statusLabel = STATUS_LABEL[report.status] || report.status;
          const latestAdminReply = [...report.chat].reverse().find((msg) => msg.isAdmin);
          return (
            <div
              key={report.id}
              className="flat-panel"
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setOpenChat(report.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpenChat(report.id);
                }
              }}
              aria-label={`Apri conversazione ${report.title}`}
              id={`report-card-${report.id}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {report.isPublic
                      ? <Eye size={13} color="var(--b-gray)" strokeWidth={2.5} />
                      : <Lock size={13} color="var(--b-gray)" strokeWidth={2.5} />}
                    <span style={{ fontSize: '0.72rem', color: 'var(--b-gray)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{report.date}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--b-black)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{report.title}</div>
                </div>
                <div className={statusClass}>
                  {statusLabel}
                </div>
              </div>
              {latestAdminReply && (
                <div style={{ background: 'var(--b-cream)', border: '2px solid var(--b-black)', padding: '10px 14px', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risposta Admin: </span>
                  <span style={{ color: 'var(--b-gray)' }}>{latestAdminReply.text}</span>
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <MessageSquare size={13} strokeWidth={2.5} /> Apri conversazione ({report.chat.length})
                <span style={{ marginLeft: 'auto', color: 'var(--b-black)' }}>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
