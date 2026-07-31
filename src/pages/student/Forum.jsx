import { useState, useRef, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, ArrowRight, PlusCircle, Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReports as useReportsMock, voteReport as voteReportMock, displayAuthor, getTypeLabel, getTypeBadgeClass, typesMatch, canonicalTypeKey, slugifyType, TYPE_LABEL } from '../../services/mockStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicReports, toggleVote } from '../../services/db';

function CustomDropdown({ value, options, onChange, icon: Icon, activeCondition }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Chiude il menu se si clicca fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];
  const isActive = activeCondition ? activeCondition(value) : false;

  return (
    <div className="forum-toolbar-action" ref={containerRef} style={{ background: isActive ? 'var(--b-yellow)' : 'transparent', transition: 'background 0.2s' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: '100%', background: 'transparent', border: 'none',
          padding: '0 14px', cursor: 'pointer', outline: 'none',
          color: 'var(--b-black)', fontFamily: "'Space Grotesk', sans-serif",
        }}
        className="custom-dropdown-btn"
      >
        <span className="hide-on-mobile custom-dropdown-label">
          {selectedOption.label}
        </span>
        <Icon size={16} strokeWidth={2.5} />
      </button>

      {/* Pulsante per rimuovere il filtro specifico */}
      {isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(options[0].value); setIsOpen(false); }}
          style={{
            position: 'absolute', top: 4, right: 4, width: 16, height: 16,
            background: 'rgba(0, 0, 0, 0.12)', color: 'var(--b-black)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', zIndex: 10, padding: 0, lineHeight: 0
          }}
          title="Rimuovi filtro"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'absolute', top: '100%', right: -2,
              minWidth: 160, background: 'var(--b-white)',
              border: '2px solid var(--b-black)',
              boxShadow: 'var(--b-shadow-sm)',
              zIndex: 50, display: 'flex', flexDirection: 'column',
              marginTop: 4, transformOrigin: 'top right'
            }}
          >
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                style={{
                  padding: '12px 16px', background: value === opt.value ? 'var(--b-yellow)' : 'transparent',
                  border: 'none', borderBottom: idx < options.length - 1 ? '2px solid var(--b-black)' : 'none',
                  textAlign: 'left', fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase',
                  cursor: 'pointer', color: 'var(--b-black)', width: '100%'
                }}
                onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'var(--b-cream)'; }}
                onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MultiSelectDropdown({ selected, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = selected.length > 0;

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="forum-toolbar-action" ref={containerRef} style={{ background: isActive ? 'var(--b-yellow)' : 'transparent', transition: 'background 0.2s' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          width: '100%', height: '100%', background: 'transparent', border: 'none',
          padding: '0 14px', cursor: 'pointer', outline: 'none',
          color: 'var(--b-black)', fontFamily: "'Space Grotesk', sans-serif",
        }}
        className="custom-dropdown-btn"
      >
        <span className="hide-on-mobile custom-dropdown-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: 140, textAlign: 'left' }}>
          {isActive ? `${selected.length} Selezionate` : 'Tutte le categorie'}
        </span>
        <Icon size={16} strokeWidth={2.5} />
      </button>

      {/* Pulsante per rimuovere il filtro specifico */}
      {isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange([]); setIsOpen(false); }}
          style={{
            position: 'absolute', top: 4, right: 4, width: 16, height: 16,
            background: 'rgba(0, 0, 0, 0.12)', color: 'var(--b-black)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', zIndex: 10, padding: 0, lineHeight: 0
          }}
          title="Rimuovi filtro"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'absolute', top: '100%', right: -2,
              minWidth: 160, background: 'var(--b-white)',
              border: '2px solid var(--b-black)',
              boxShadow: 'var(--b-shadow-sm)',
              zIndex: 50, display: 'flex', flexDirection: 'column',
              marginTop: 4, transformOrigin: 'top right'
            }}
          >
            {options.map((opt, idx) => {
              const isChecked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', background: isChecked ? 'var(--b-yellow)' : 'transparent',
                    borderBottom: idx < options.length - 1 ? '2px solid var(--b-black)' : 'none',
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase',
                    cursor: 'pointer', color: 'var(--b-black)', width: '100%', margin: 0
                  }}
                  onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = 'var(--b-cream)'; }}
                  onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = 'transparent'; }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt.value)}
                    style={{
                      width: 16, height: 16, margin: 0, cursor: 'pointer',
                      accentColor: 'var(--b-black)'
                    }}
                  />
                  {opt.label}
                </label>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Forum() {
  const { slug } = useParams();
  const isDemo = slug === 'demo';
  const [search, setSearch] = useState('');
  const [filterTypes, setFilterTypes] = useState([]); // array vuoto = tutte
  const [sortOrder, setSortOrder] = useState('recent'); // recent, popular

  // ── Dati: demo usa mock, reale usa Supabase ────────────────────────────
  const mockPosts = useReportsMock().filter(r => r.isPublic);
  const [realPosts, setRealPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    setLoadingPosts(true);
    getPublicReports(slug)
      .then(data => {
        setRealPosts(data.map(r => ({
          ...r,
          createdAt: new Date(r.created_at).getTime(),
          time: new Date(r.created_at).toLocaleString('it-IT', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          }),
          isPublic: r.is_public,
          anonimo: r.is_anonymous,
          likes: r.votes?.[0]?.count || 0,
          commentsCount: r.comments?.[0]?.count || 0,
          authorName: r.authorName,               // dalla RPC (NULL se anonimo)
          authorClass: r.authorClass || '—',
        })));
      })
      .catch(console.error)
      .finally(() => setLoadingPosts(false));
  }, [isDemo, slug]);

  const handleVote = async (e, reportId, value) => {
    e.stopPropagation();
    if (isDemo) {
      voteReportMock(reportId, value);
    } else {
      try {
        const res = await toggleVote(reportId);
        setRealPosts(prev => prev.map(r =>
          r.id === reportId
            ? {
                ...r,
                likes: Math.max(0, (r.likes || 0) + (res.voted ? 1 : -1)),
                voted: res.voted,
                userVote: res.voted ? 1 : 0,
              }
            : r
        ));
      } catch (err) { console.error(err); }
    }
  };

  const allPosts = isDemo ? mockPosts : realPosts;

  // Opzioni filtro: canoniche + tipi custom presenti nei post (es. Bullismo)
  const categoryFilterOptions = (() => {
    const opts = [
      { value: 'problema', label: 'Problemi' },
      { value: 'proposta', label: 'Proposte' },
      { value: 'dubbio', label: 'Dubbi' },
    ];
    const seen = new Set(['problema', 'proposta', 'dubbio']);
    for (const post of allPosts) {
      const canon = canonicalTypeKey(post.type);
      if (TYPE_LABEL[canon]) continue;
      const key = slugifyType(post.type);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      opts.push({ value: key, label: getTypeLabel(post.type) });
    }
    return opts;
  })();

  const posts = allPosts
    .filter(post => {
      if (filterTypes.length > 0 && !filterTypes.some((ft) => typesMatch(post.type, ft))) return false;
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
      if (sortOrder === 'unpopular') {
        return a.likes - b.likes || b.createdAt - a.createdAt;
      }
      return b.createdAt - a.createdAt;
    });

  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 4, textTransform: 'uppercase' }}>Bacheca</h1>
          <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', fontWeight: 600 }}>
            Scopri e commenta le segnalazioni degli studenti.
          </p>
        </div>
        <button
          className="btn-orange hide-on-mobile"
          onClick={() => navigate(`/box/${slug}/new`)}
          id="forum-new-report-btn"
        >
          <PlusCircle size={16} strokeWidth={2.5} /> Nuova
        </button>
      </div>

      {/* Toolbar (Search & Filters) */}
      <div className="forum-toolbar">
        <div className="forum-toolbar-search" style={{ position: 'relative' }}>
          <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', left: 12, color: 'var(--b-gray)' }} />
          <input
            type="text"
            placeholder="Cerca per parola chiave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="forum-search-input"
            style={{ paddingRight: search ? 36 : 12 }}
          />
          {/* Pulsante X interno per la barra di ricerca */}
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.12)', color: 'var(--b-black)', border: 'none',
                width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                padding: 0, opacity: 0.7, transition: 'opacity 0.2s', lineHeight: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              title="Cancella ricerca"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Categories Select */}
        <MultiSelectDropdown
          selected={filterTypes}
          options={categoryFilterOptions}
          onChange={setFilterTypes}
          icon={Filter}
        />

        {/* Sort Select */}
        <CustomDropdown
          value={sortOrder}
          options={[
            { value: 'recent', label: 'Più Recenti' },
            { value: 'popular', label: 'Più Votate' },
            { value: 'unpopular', label: 'Meno Votate' }
          ]}
          onChange={setSortOrder}
          icon={ArrowUpDown}
          activeCondition={(val) => val !== 'recent'}
        />
      </div>

      {/* Post list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loadingPosts ? (
          <div style={{
            padding: 40, textAlign: 'center', border: '3px solid var(--b-black)',
            background: 'var(--b-white)', boxShadow: 'var(--b-shadow-sm)',
            fontWeight: 700, color: 'var(--b-gray)',
          }}>
            Caricamento bacheca...
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', border: '3px solid var(--b-black)',
            background: 'var(--b-white)', boxShadow: 'var(--b-shadow-sm)',
          }}>
            <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 8, textTransform: 'uppercase' }}>
              {allPosts.length === 0 ? 'Nessun post ancora' : 'Nessun risultato'}
            </p>
            <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
              {allPosts.length === 0
                ? 'Quando qualcuno pubblicherà una segnalazione pubblica, la troverai qui.'
                : 'Nessuna segnalazione corrisponde ai filtri o alla ricerca.'}
            </p>
          </div>
        ) : (
        posts.map(post => {
          const typeLabel = getTypeLabel(post.type);
          const badgeClass = getTypeBadgeClass(post.type);
          const canon = canonicalTypeKey(post.type);
          const stripeStyle = {
            background: `var(--b-${canon === 'problema' ? 'red' : canon === 'proposta' ? 'blue' : canon === 'dubbio' ? 'orange' : 'gray'})`,
          };
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

              {/* Colonna voti — in reale solo like (DB toggle), in demo up/down */}
              <div className="forum-vote-col">
                <button
                  className={`vote-btn vote-btn-up ${post.userVote === 1 ? 'active' : ''}`}
                  onClick={(e) => handleVote(e, post.id, 1)}
                  aria-label={`Vota positivamente ${post.title}`}
                  id={`vote-up-${post.id}`}
                >
                  <motion.div
                    initial={false}
                    whileTap={{ scale: 0.7, rotate: -25 }}
                    animate={{
                      rotate: post.userVote === 1 ? -15 : 0,
                      scale: post.userVote === 1 ? 1.15 : 1
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <ThumbsUp size={16} strokeWidth={2.5} />
                  </motion.div>
                </button>
                <span className="vote-count">{Math.max(0, post.likes)}</span>
                {isDemo && (
                  <button
                    className={`vote-btn vote-btn-down ${post.userVote === -1 ? 'active' : ''}`}
                    onClick={(e) => handleVote(e, post.id, -1)}
                    aria-label={`Vota negativamente ${post.title}`}
                    id={`vote-down-${post.id}`}
                  >
                    <motion.div
                      initial={false}
                      whileTap={{ scale: 0.7, rotate: 25 }}
                      animate={{
                        rotate: post.userVote === -1 ? 15 : 0,
                        scale: post.userVote === -1 ? 1.15 : 1
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <ThumbsDown size={16} strokeWidth={2.5} />
                    </motion.div>
                  </button>
                )}
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
                  {post.commentsCount ?? post.comments?.length ?? 0} Commenti
                  <span className="forum-read-more" style={{ marginLeft: 'auto', color: 'var(--b-black)', fontWeight: 800 }}>
                    Leggi <ArrowRight className="read-more-icon" size={12} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </span>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
