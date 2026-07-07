import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, ArrowRight, PlusCircle, Search, Filter, ArrowUpDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReports, voteReport, displayAuthor, getTypeLabel, getTypeBadgeClass } from '../../services/mockStore';

export default function Forum() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, problema, proposta, dubbio
  const [sortOrder, setSortOrder] = useState('recent'); // recent, popular
  
  const allPosts = useReports().filter((item) => item.isPublic);

  const posts = allPosts
    .filter(post => {
      if (filterType !== 'all' && post.type !== filterType) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return post.title.toLowerCase().includes(query) || post.content.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'popular') {
        return b.likes - a.likes || b.createdAt - a.createdAt;
      }
      return b.createdAt - a.createdAt;
    });

  const navigate = useNavigate();
  const { slug } = useParams();

  const handleVote = (e, postId, value) => {
    e.stopPropagation();
    voteReport(postId, value);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 4, textTransform: 'uppercase' }}>Bacheca</h1>
          <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', fontWeight: 600 }}>
            Scopri e supporta le segnalazioni degli studenti.
          </p>
        </div>
        <button
          className="btn-orange"
          onClick={() => navigate(`/box/${slug}/new`)}
          id="forum-new-report-btn"
        >
          <PlusCircle size={16} strokeWidth={2.5} /> Nuova
        </button>
      </div>

      {/* Toolbar (Search & Filters) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--b-gray)' }} />
          <input
            type="text"
            placeholder="Cerca per parola chiave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 38, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '2px solid var(--b-black)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.85rem', fontWeight: 700 }}
            id="forum-search-input"
          />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ appearance: 'none', padding: '10px 32px 10px 14px', border: '2px solid var(--b-black)', background: 'var(--b-white)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--b-black)', cursor: 'pointer' }}
              id="forum-filter-select"
            >
              <option value="all">Tutte le Categorie</option>
              <option value="problema">Problemi</option>
              <option value="proposta">Proposte</option>
              <option value="dubbio">Dubbi</option>
            </select>
            <Filter size={14} strokeWidth={3} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ appearance: 'none', padding: '10px 32px 10px 14px', border: '2px solid var(--b-black)', background: 'var(--b-white)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--b-black)', cursor: 'pointer' }}
              id="forum-sort-select"
            >
              <option value="recent">Più Recenti</option>
              <option value="popular">Più Votate</option>
            </select>
            <ArrowUpDown size={14} strokeWidth={3} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Post list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {posts.map(post => {
          const typeLabel = getTypeLabel(post.type);
          const badgeClass = getTypeBadgeClass(post.type);
          const stripeStyle = post.type ? { background: `var(--b-${post.type === 'problema' ? 'red' : post.type === 'proposta' ? 'blue' : 'orange'})` } : { background: 'var(--b-gray)' };
          return (
            <div
              key={post.id}
              className="forum-post-card"
              onClick={() => navigate(`/box/${slug}/post/${post.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/box/${slug}/post/${post.id}`);
                }
              }}
              aria-label={`Apri segnalazione: ${post.title}`}
              id={`post-card-${post.id}`}
            >
              {/* Stripe categoria */}
              <div className="forum-cat-stripe" style={stripeStyle} />

              {/* Colonna voti */}
              <div className="forum-vote-col">
                <button
                  className={`vote-btn vote-btn-up ${post.userVote === 1 ? 'active' : ''}`}
                  onClick={(e) => handleVote(e, post.id, 1)}
                  aria-label={`Vota positivamente ${post.title}`}
                  id={`vote-up-${post.id}`}
                >
                  <ThumbsUp size={16} strokeWidth={2.5} />
                </button>
                <span className="vote-count">{post.likes}</span>
                <button
                  className={`vote-btn vote-btn-down ${post.userVote === -1 ? 'active' : ''}`}
                  onClick={(e) => handleVote(e, post.id, -1)}
                  aria-label={`Vota negativamente ${post.title}`}
                  id={`vote-down-${post.id}`}
                >
                  <ThumbsDown size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Contenuto */}
              <div className="forum-post-content">
                <div className="forum-post-meta">
                  <span className={badgeClass}>{typeLabel}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--b-gray)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{displayAuthor(post)}</span>
                  <span style={{ color: 'var(--b-gray)', fontSize: '0.78rem', marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace" }}>{post.time}</span>
                </div>
                <div className="forum-post-title">{post.title}</div>
                <div className="forum-post-body">{post.content}</div>
                <div className="forum-post-footer">
                  <MessageSquare size={14} strokeWidth={2.5} />
                  {post.comments.length} Commenti
                  <span className="forum-read-more" style={{ marginLeft: 'auto', color: 'var(--b-black)', fontWeight: 800 }}>
                    Leggi <ArrowRight className="read-more-icon" size={12} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
