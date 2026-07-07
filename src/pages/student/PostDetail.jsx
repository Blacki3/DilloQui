import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { useState, useRef } from 'react';
import {
  useReport,
  addComment,
  voteReport,
  displayAuthor,
  getTypeLabel,
  getTypeBadgeClass,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
} from '../../services/mockStore';

export default function PostDetail() {
  const { slug, postId } = useParams();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const post = useReport(postId);
  const commentsEndRef = useRef(null);

  const handleVote = (value) => {
    if (!post) return;
    voteReport(post.id, value);
  };

  const handleAddComment = () => {
    if (!post) return;
    if (!newComment.trim()) return;
    addComment(post.id, { text: newComment.trim(), author: 'Tu' });
    setNewComment('');
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!post) {
    return (
      <div className="flat-panel">
        <h3>Segnalazione non trovata</h3>
        <button className="btn-secondary" onClick={() => navigate(`/box/${slug}/forum`)}>
          Torna alla Bacheca
        </button>
      </div>
    );
  }

  const typeLabel = getTypeLabel(post.type);
  const typeBadgeClass = getTypeBadgeClass(post.type);
  const statusLabel = STATUS_LABEL[post.status] || 'Aperta';
  const statusBadgeClass = STATUS_BADGE_CLASS[post.status] || 'badge badge-status-new';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80 }}>
      {/* Back + Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={() => navigate(`/box/${slug}/forum`)}
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
          id="post-back-btn"
        >
          <ArrowLeft size={15} strokeWidth={3} /> Bacheca
        </button>
        <div className={statusBadgeClass}>
          {statusLabel}
        </div>
      </div>

      {/* Post principale */}
      <div className="report-detail-header">
        <div style={{ marginBottom: 12 }}>
          <span className={typeBadgeClass}>
            {typeLabel}
          </span>
        </div>
        <h2 style={{ marginBottom: 12, fontSize: '1.2rem', textTransform: 'uppercase', lineHeight: 1.3, letterSpacing: '0.02em' }}>
          {post.title}
        </h2>
        <p style={{ color: 'var(--b-gray)', lineHeight: 1.65, fontSize: '0.95rem', marginBottom: 16 }}>
          {post.content}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '2px solid var(--b-black)', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--b-gray)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
            {post.date} • {displayAuthor(post)}
          </span>
          {/* Voto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => handleVote(1)} className={`vote-btn vote-btn-up ${post.userVote === 1 ? 'active' : ''}`} aria-label="Vota positivamente il post" id="post-vote-up">
              <ThumbsUp size={15} strokeWidth={2.5} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace" }}>{post.likes}</span>
            <button onClick={() => handleVote(-1)} className={`vote-btn vote-btn-down ${post.userVote === -1 ? 'active' : ''}`} aria-label="Vota negativamente il post" id="post-vote-down">
              <ThumbsDown size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Header commenti */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 6, height: 24, background: 'var(--b-blue)', border: '1px solid var(--b-black)' }} />
        <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
          Commenti ({post.comments.length})
        </h3>
      </div>

      {/* Input commento */}
      <div className="flat-panel" style={{ padding: '16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <textarea
          placeholder="Aggiungi il tuo pensiero alla discussione..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ minHeight: '80px', margin: 0, flex: 1 }}
          id="post-comment-input"
        />
        <button
          onClick={handleAddComment}
          aria-label="Invia commento"
          style={{
            background: 'var(--b-yellow)', border: 'var(--b-border)', cursor: 'pointer',
            padding: '0 18px', height: '80px', margin: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--b-shadow-sm)',
            transition: 'box-shadow 0.1s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--b-shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
          id="post-comment-submit"
        >
          <Send size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Lista Commenti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {post.comments.map((comment, idx) => (
          <div
            key={comment.id}
            style={{
              background: idx % 2 === 0 ? 'var(--b-white)' : 'var(--b-cream)',
              border: '3px solid var(--b-black)',
              borderBottom: idx < post.comments.length - 1 ? '2px solid var(--b-black)' : '3px solid var(--b-black)',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, background: 'var(--b-yellow)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={13} strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{comment.author}</span>
              <span style={{ color: 'var(--b-gray)', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, marginLeft: 'auto' }}>{comment.time}</span>
            </div>
            <p style={{ color: 'var(--b-black)', margin: 0, lineHeight: 1.55, fontSize: '0.9rem' }}>{comment.text}</p>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>
    </div>
  );
}
