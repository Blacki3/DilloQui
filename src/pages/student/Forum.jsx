import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
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
    author: 'Mario Rossi',
    category: 'Problema',
    title: 'Riscaldamento rotto al piano terra',
    content: 'Nelle aule del piano terra fa freddissimo da due giorni. Qualcuno ha avvisato i tecnici?',
    likes: 89,
    comments: 34,
    time: 'ieri',
    userVote: 0
  },
];

const categoryClass = {
  Problema: 'badge badge-problema',
  Proposta:  'badge badge-proposta',
  Dubbio:    'badge badge-dubbio',
};

export default function Forum() {
  const [posts, setPosts] = useState(initialPosts);
  const navigate = useNavigate();
  const { slug } = useParams();

  const handleVote = (e, postId, value) => {
    e.stopPropagation();
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      if (post.userVote === value) return { ...post, likes: post.likes - value, userVote: 0 };
      return { ...post, likes: post.likes + value - post.userVote, userVote: value };
    }));
  };

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>Bacheca Studenti</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Scopri e supporta le idee e le segnalazioni degli studenti.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {posts.map(post => (
          <div
            key={post.id}
            className="forum-post-card"
            onClick={() => navigate(`/box/${slug}/post/${post.id}`)}
          >
            {/* Colonna voti */}
            <div className="forum-vote-col">
              <button
              className={`vote-btn vote-btn-up ${post.userVote === 1 ? 'active' : ''}`}
                onClick={(e) => handleVote(e, post.id, 1)}
              >
                <ThumbsUp size={17} />
              </button>
              <span className="vote-count">{post.likes}</span>
              <button
                className={`vote-btn vote-btn-down ${post.userVote === -1 ? 'active' : ''}`}
                onClick={(e) => handleVote(e, post.id, -1)}
              >
                <ThumbsDown size={17} />
              </button>
            </div>

            {/* Contenuto */}
            <div className="forum-post-content">
              <div className="forum-post-meta">
                <span className={categoryClass[post.category] || 'badge'}>{post.category}</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{post.author}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>{post.time}</span>
              </div>
              <div className="forum-post-title">{post.title}</div>
              <div className="forum-post-body">{post.content}</div>
              <div className="forum-post-footer">
                <MessageSquare size={15} />
                {post.comments} Commenti
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
