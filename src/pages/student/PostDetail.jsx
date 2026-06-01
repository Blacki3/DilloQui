import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, ArrowLeft, Send, MessageSquare, BadgeCheck } from 'lucide-react';

const categoryClass = {
  Problema: 'badge badge-problema',
  Proposta:  'badge badge-proposta',
  Dubbio:    'badge badge-dubbio',
};

const statusStyle = {
  Aperta:      { background: '#d1fae5', color: '#065f46', dot: '#2d7a47' },
  'In Revisione': { background: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Risolta:     { background: '#d1fae5', color: '#065f46', dot: '#2d7a47', label: 'Risolto' },
  Chiusa:      { background: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
};

const mockPostDetail = {
  id: 1,
  author: 'Anonimo',
  category: 'Problema',
  title: 'Segnalazione di bullismo nel corridoio B',
  content: 'Oggi durante la pausa, ho notato due ragazzi che spintonavano e insultavano un altro studente vicino agli armadietti. Non sono intervenuto per paura, ma la situazione sembrava seria. È successo intorno alle 10:45.',
  likes: 45,
  date: '15 Maggio 2024, 11:00',
  status: 'Risolta',
  comments: [
    { id: 1, author: 'Anonimo', text: 'Grazie per averlo segnalato, è importante.', time: '2 min fa' },
    { id: 11, author: 'Anonimo', text: 'Sì, speriamo si risolva presto.', time: '1 min fa' },
    { id: 2, author: 'Anonimo', text: 'Anch\'io ho visto qualcosa di simile ieri, bisogna fare attenzione.', time: '1 ora fa' },
  ]
};

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(mockPostDetail);
  const [vote, setVote] = useState(0);
  const [newComment, setNewComment] = useState('');

  const handleVote = (value) => {
    if (vote === value) { setVote(0); setPost({ ...post, likes: post.likes - value }); }
    else { setPost({ ...post, likes: post.likes + value - vote }); setVote(value); }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const c = { id: Date.now(), author: 'Tu', text: newComment.trim(), time: 'Adesso' };
    setPost({ ...post, comments: [c, ...post.comments] });
    setNewComment('');
  };

  const st = statusStyle[post.status] || statusStyle['Aperta'];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80 }}>
      {/* Back + Status header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={() => navigate(`/box/${slug}/forum`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={18} /> Indietro
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 50,
          background: st.background, color: st.color,
          fontWeight: 700, fontSize: '0.85rem'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot }} />
          {st.label || post.status}
        </div>
      </div>

      {/* Post principale */}
      <div className="report-detail-header">
        <span className={categoryClass[post.category] || 'badge'}>{post.category}</span>
        <h2 style={{ marginTop: 12, marginBottom: 8, color: 'var(--color-text-main)', fontSize: '1.3rem', lineHeight: 1.3 }}>
          {post.title}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: 16 }}>
          {post.content}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{post.date}</span>
          {/* Voto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => handleVote(1)} className={`vote-btn vote-btn-up ${vote === 1 ? 'active' : ''}`}>
              <ThumbsUp size={16} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{post.likes}</span>
            <button onClick={() => handleVote(-1)} className={`vote-btn vote-btn-down ${vote === -1 ? 'active' : ''}`}>
              <ThumbsDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Area Commenti */}
      <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={20} /> Commenti ({post.comments.length})
      </h3>
      
      {/* Input commento spostato sopra i commenti */}
      <div className="flat-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <textarea 
          placeholder="Aggiungi il tuo pensiero alla discussione..." 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ minHeight: '80px', margin: 0 }}
        />
        <button 
          onClick={handleAddComment} 
          className="btn-primary"
          style={{ width: 'auto', margin: 0, padding: '0 24px', height: '80px', borderRadius: 12 }}
        >
          <Send size={20} />
        </button>
      </div>

      {/* Lista Commenti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {post.comments.map(comment => (
          <div key={comment.id} className="flat-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{comment.author}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>• {comment.time}</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.5' }}>{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
