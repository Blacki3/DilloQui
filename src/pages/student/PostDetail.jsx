import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, ArrowLeft, Send } from 'lucide-react';
import Button from '../../components/Button';

// Dati mock espansi per il singolo post
const mockPostDetail = {
  id: 1, 
  author: 'Anonimo', 
  category: 'Proposta', 
  title: 'Distributore acqua potabile', 
  content: 'Sarebbe fantastico installare un distributore d\'acqua potabile per ridurre la plastica delle bottigliette in classe. Possiamo magari fare una piccola colletta o chiedere l\'uso dei fondi studenteschi. Chi è d\'accordo?',
  likes: 45,
  time: '2 ore fa',
  comments: [
    { id: 1, author: 'Giulia (4A)', text: 'Assolutamente d\'accordo, risparmieremmo un sacco!', time: '1 ora fa' },
    { id: 2, author: 'Anonimo', text: 'Sì ma chi lo pulisce poi? Serve una manutenzione continua.', time: '45 min fa' }
  ]
};

export default function PostDetail() {
  const { slug, postId } = useParams();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(mockPostDetail);
  const [newComment, setNewComment] = useState('');
  const [vote, setVote] = useState(0); // 1 for upvote, -1 for downvote, 0 for none

  const handleVote = (value) => {
    if (vote === value) {
      setVote(0);
      setPost({ ...post, likes: post.likes - value });
    } else {
      setPost({ ...post, likes: post.likes + value - vote });
      setVote(value);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        author: 'Tu',
        text: newComment.trim(),
        time: 'Adesso'
      };
      setPost({ ...post, comments: [...post.comments, comment] });
      setNewComment('');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      <button 
        onClick={() => navigate(`/box/${slug}/forum`)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontWeight: '600', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={20} /> Torna alla bacheca
      </button>

      {/* Post Principale */}
      <div className="flat-panel post-layout" style={{ marginBottom: '24px' }}>
        {/* Voti laterali */}
        <div className="votes-container">
          <button 
            onClick={() => handleVote(1)}
            style={{ background: vote === 1 ? '#fee2e2' : 'none', border: 'none', color: vote === 1 ? '#ef4444' : 'var(--color-text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: '0.2s' }}
          >
            <ThumbsUp size={24} />
          </button>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: vote === 1 ? '#ef4444' : vote === -1 ? '#3b82f6' : 'var(--color-text-main)' }}>
            {post.likes}
          </div>
          <button 
            onClick={() => handleVote(-1)}
            style={{ background: vote === -1 ? '#eff6ff' : 'none', border: 'none', color: vote === -1 ? '#3b82f6' : 'var(--color-text-muted)', cursor: 'pointer', transform: 'rotate(180deg)', padding: '8px', borderRadius: '8px', transition: '0.2s' }}
          >
            <ThumbsUp size={24} />
          </button>
        </div>

        {/* Contenuto post */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{post.author}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>• {post.time}</span>
            <span style={{ 
              background: 'var(--color-primary-lighter)', 
              color: 'var(--color-primary)', 
              padding: '4px 10px', 
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.8rem'
            }}>
              {post.category}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '16px', color: 'var(--color-text-main)', lineHeight: '1.3' }}>{post.title}</h1>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', fontSize: '1.05rem' }}>{post.content}</p>
        </div>
      </div>

      {/* Sezione Commenti */}
      <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageCircle size={20} /> Commenti ({post.comments.length})
      </h3>
      
      {/* Aggiungi Commento */}
      <div className="flat-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <textarea 
          placeholder="Aggiungi il tuo pensiero alla discussione..." 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ minHeight: '80px', margin: 0 }}
        />
        <Button onClick={handleAddComment} style={{ width: 'auto', margin: 0, padding: '0 24px', height: '80px' }}>
          <Send size={20} />
        </Button>
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
