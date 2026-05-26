import { useState } from 'react';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const initialPosts = [
  { 
    id: 1, 
    author: 'Anonimo', 
    category: 'Proposta', 
    title: 'Distributore acqua potabile', 
    content: 'Sarebbe fantastico installare un distributore d\'acqua potabile per ridurre la plastica delle bottigliette in classe.',
    likes: 45,
    comments: 2,
    time: '2 ore fa',
    userVote: 0
  },
  { 
    id: 2, 
    author: 'Mario Rossi (5B)', 
    category: 'Problema', 
    title: 'Riscaldamento rotto al piano terra', 
    content: 'Nelle aule del piano terra fa freddissimo da due giorni. Qualcuno ha avvisato i tecnici?',
    likes: 89,
    comments: 34,
    time: 'Ieri',
    userVote: 0
  }
];

export default function Forum() {
  const [posts, setPosts] = useState(initialPosts);
  const navigate = useNavigate();
  const { slug } = useParams();

  const handleVote = (e, postId, value) => {
    e.stopPropagation(); // Evita di aprire il post quando si vota
    setPosts(posts.map(post => {
      if (post.id === postId) {
        if (post.userVote === value) {
          return { ...post, likes: post.likes - value, userVote: 0 };
        } else {
          return { ...post, likes: post.likes + value - post.userVote, userVote: value };
        }
      }
      return post;
    }));
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--color-text-main)' }}>Bacheca Studenti</h1>
          <div style={{ color: 'var(--color-text-muted)' }}>Scopri e supporta le idee e le segnalazioni degli altri studenti.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {posts.map(post => (
          <div 
            key={post.id} 
            onClick={() => navigate(`/box/${slug}/post/${post.id}`)}
            className="flat-panel post-layout" 
            style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
          >
            
            {/* Voti laterali */}
            <div className="votes-container">
              <button 
                onClick={(e) => handleVote(e, post.id, 1)}
                style={{ background: post.userVote === 1 ? '#fee2e2' : 'none', border: 'none', color: post.userVote === 1 ? '#ef4444' : 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
              >
                <ThumbsUp size={24} />
              </button>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: post.userVote === 1 ? '#ef4444' : post.userVote === -1 ? '#3b82f6' : 'var(--color-text-main)' }}>
                {post.likes}
              </div>
              <button 
                onClick={(e) => handleVote(e, post.id, -1)}
                style={{ background: post.userVote === -1 ? '#eff6ff' : 'none', border: 'none', color: post.userVote === -1 ? '#3b82f6' : 'var(--color-text-muted)', cursor: 'pointer', transform: 'rotate(180deg)', padding: '4px', borderRadius: '4px' }}
              >
                <ThumbsUp size={24} />
              </button>
            </div>

            {/* Contenuto post */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{post.author}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>• {post.time}</span>
                <span style={{ 
                  background: 'var(--color-primary-lighter)', 
                  color: 'var(--color-primary)', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>
                  {post.category}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-text-main)' }}>{post.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>{post.content}</p>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '8px', color: 'var(--color-text-muted)', fontWeight: '600', cursor: 'pointer' }}>
                  <MessageCircle size={18} /> {post.comments} Commenti
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
