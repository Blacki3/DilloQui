import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, ArrowLeft, Send, MessageSquare, EyeOff, CornerUpLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
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
import { getStudentProfile } from '../../services/mockProfiles';

/* Icona incognito da public/incognito-svgrepo-com.svg — inline per poter
   usare currentColor e scalare con la prop size */
function IncognitoIcon({ size = 24 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.92"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Linea orizzontale tesa cappello */}
      <polyline points="0.5 11.04 12 11.04 23.5 11.04" />
      {/* Corona cappello */}
      <path d="M19.67,11H4.33L5,4.68A2.54,2.54,0,0,1,7.57,2.42h0a2.47,2.47,0,0,1,1.13.27h0a7.43,7.43,0,0,0,6.6,0h0a2.47,2.47,0,0,1,1.13-.27h0A2.54,2.54,0,0,1,19,4.68Z" />
      {/* Lente sinistra */}
      <circle cx="6.73" cy="18.23" r="3.35" />
      {/* Lente destra */}
      <circle cx="17.27" cy="18.23" r="3.35" />
      {/* Ponte centrale */}
      <path d="M10.08,18.71a1.92,1.92,0,1,1,3.84,0" />
      {/* Stanghetta sinistra */}
      <line x1="1.46" y1="15.83" x2="4.33" y2="15.83" />
      {/* Stanghetta destra */}
      <line x1="19.67" y1="15.83" x2="22.54" y2="15.83" />
    </svg>
  );
}


export default function PostDetail() {
  const { slug, postId } = useParams();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const post = useReport(postId);
  const commentsEndRef = useRef(null);
  const profile = getStudentProfile();

  const handleVote = (value) => {
    if (!post) return;
    voteReport(post.id, value);
  };

  const handleAddComment = () => {
    if (!post) return;
    if (!newComment.trim()) return;
    addComment(post.id, {
      text: newComment.trim(),
      author: isAnon ? 'Anonimo' : 'Tu',
      authorClass: isAnon ? null : profile.classe,
      isAnon,
      replyToId: replyTo ? replyTo.id : null,
    });
    setNewComment('');
    setReplyTo(null);
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // -------- Long-press sul bottone invia --------
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const handlePressStart = useCallback(() => {
    longPressFired.current = false;
    setIsPressing(true);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setIsPressing(false);
      setIsAnon(v => !v);
      navigator.vibrate?.(40);
    }, 600);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setIsPressing(false);
    if (!longPressFired.current) {
      handleAddComment();
    }
    longPressFired.current = false;
  }, [newComment, isAnon, post]); // eslint-disable-line

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
              <motion.div
                initial={false}
                whileTap={{ scale: 0.7, rotate: -25 }}
                animate={{ 
                  rotate: post.userVote === 1 ? -15 : 0, 
                  scale: post.userVote === 1 ? 1.15 : 1 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <ThumbsUp size={15} strokeWidth={2.5} />
              </motion.div>
            </button>
            <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace" }}>{Math.max(0, post.likes)}</span>
            <button onClick={() => handleVote(-1)} className={`vote-btn vote-btn-down ${post.userVote === -1 ? 'active' : ''}`} aria-label="Vota negativamente il post" id="post-vote-down">
              <motion.div
                initial={false}
                whileTap={{ scale: 0.7, rotate: 25 }}
                animate={{ 
                  rotate: post.userVote === -1 ? 15 : 0, 
                  scale: post.userVote === -1 ? 1.15 : 1 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <ThumbsDown size={15} strokeWidth={2.5} />
              </motion.div>
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
      <div className="flat-panel" style={{
        padding: '16px', marginBottom: 16,
        background: isAnon ? 'var(--b-cream)' : undefined,
        transition: 'background 0.25s',
        border: isAnon ? '3px solid var(--b-black)' : undefined,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {/* Wrapper textarea con watermark incognito */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Watermark — posizionato nel wrapper, la textarea sopra è trasparente */}
            <div style={{
              position: 'absolute',
              right: 8, top: '50%', transform: 'translateY(-50%)',
              opacity: isAnon ? 0.09 : 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: 'none',
              color: 'var(--b-black)',
              lineHeight: 0,
            }}>
              <IncognitoIcon size={80} />
            </div>

            {/* Box di anteprima risposta */}
            {replyTo && (
              <div style={{
                margin: '0 0 10px 0', padding: '8px 12px',
                background: 'var(--b-white)', borderLeft: '4px solid var(--b-yellow)',
                borderTop: '2px solid var(--b-black)', borderRight: '2px solid var(--b-black)', borderBottom: '2px solid var(--b-black)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                position: 'relative', zIndex: 2
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--b-gray)', display: 'block', marginBottom: 2 }}>
                    Risposta a {replyTo.author}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--b-black)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                    {replyTo.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            )}

            <textarea
              placeholder={isAnon ? 'Scrivi in incognito...' : 'Aggiungi il tuo pensiero alla discussione...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                minHeight: '90px', margin: 0, width: '100%', boxSizing: 'border-box',
                background: 'transparent', /* lascia vedere il watermark sotto */
                position: 'relative', zIndex: 1,
              }}
              id="post-comment-input"
            />
          </div>

          {/* Bottone invia: tap corto = invia, hold 600ms = toggle anonimo */}
          <button
            aria-label={isAnon ? 'Invia come Anonimo (tieni premuto per disattivare)' : 'Invia commento (tieni premuto per modalità anonima)'}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={() => { clearTimeout(longPressTimer.current); setIsPressing(false); longPressFired.current = false; }}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            style={{
              background: isAnon ? 'var(--b-black)' : 'var(--b-yellow)',
              border: 'var(--b-border)', cursor: 'pointer',
              height: '90px', margin: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: 'var(--b-shadow-sm)',
              transition: 'background 0.25s, color 0.25s',
              color: isAnon ? 'var(--b-white)' : 'var(--b-black)',
              userSelect: 'none', WebkitUserSelect: 'none',
              position: 'relative', overflow: 'hidden',
            }}
            id="post-comment-submit"
            className="post-submit-btn"
          >
            {/* Strato fantasma (in flow) per mantenere la larghezza intrinseca del bottone, basata sul contenuto più largo ("Anonimo") */}
            <div style={{ visibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <IncognitoIcon size={22} />
              <span style={{
                fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.06em',
                textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
                lineHeight: 1,
              }}>
                Anonimo
              </span>
            </div>

            {/* Livello 1: Base - Mostra lo stato CORRENTE */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {isAnon ? <IncognitoIcon size={22} /> : <Send size={20} strokeWidth={2.5} />}
              <span style={{
                fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.06em',
                textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
                opacity: 0.7, lineHeight: 1,
              }}>
                {isAnon ? 'Anonimo' : 'Invia'}
              </span>
            </div>

            {/* Livello 2: Liquido che sale (taglia il contenuto svelato) */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, width: '100%',
              height: isPressing ? '100%' : '0%',
              background: isAnon ? 'var(--b-yellow)' : 'var(--b-black)',
              transition: isPressing ? 'height 600ms linear' : 'height 0ms',
              zIndex: 2,
              overflow: 'hidden',
            }}>
              {/* Contenuto SVELATO (futuro stato) posizionato in modo fisso rispetto al bottone */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '90px', /* Stessa altezza del bottone */
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5,
                color: isAnon ? 'var(--b-black)' : 'var(--b-white)',
              }}>
                {isAnon ? <Send size={20} strokeWidth={2.5} /> : <IncognitoIcon size={22} />}
                <span style={{
                  fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
                  opacity: 0.7, lineHeight: 1,
                }}>
                  {isAnon ? 'Invia' : 'Anonimo'}
                </span>
              </div>
            </div>

            {/* Livello 3: Onda in cima al liquido */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, width: '100%',
              height: isPressing ? '100%' : '0%',
              transition: isPressing ? 'height 600ms linear' : 'height 0ms',
              zIndex: 3,
            }}>
              <div style={{
                position: 'absolute', top: '-11px', left: 0, width: '200%', height: '12px',
                animation: isPressing ? 'wave-shift 0.8s linear infinite' : 'none',
                opacity: isPressing ? 1 : 0,
                transition: 'opacity 0.1s',
              }}>
                <svg viewBox="0 0 800 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                  <path d="M0,50 Q50,0 100,50 T200,50 T300,50 T400,50 T500,50 T600,50 T700,50 T800,50 V100 H0 Z" fill={isAnon ? 'var(--b-yellow)' : 'var(--b-black)'} />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Hint discreto sotto il box - sempre visibile, cambia stato */}
        <div style={{
          marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 5,
          color: 'var(--b-gray)',
          fontSize: '0.68rem',
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
        }}>
          {isAnon ? (
            <>
              <MessageSquare size={11} />
              Tieni premuto <strong style={{ color: 'var(--b-black)' }}>Invia</strong> per commentare con il tuo nome
            </>
          ) : (
            <>
              <IncognitoIcon size={11} />
              Tieni premuto <strong style={{ color: 'var(--b-black)' }}>Invia</strong> per commentare in anonimo
            </>
          )}
        </div>
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
              {/* Avatar: maschera se anonimo, icona messaggio altrimenti */}
              <div style={{
                width: 28, height: 28,
                background: comment.isAnon ? 'var(--b-black)' : 'var(--b-yellow)',
                border: '2px solid var(--b-black)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {comment.isAnon
                  ? <EyeOff size={13} strokeWidth={2.5} color="var(--b-white)" />
                  : <MessageSquare size={13} strokeWidth={2.5} />
                }
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {comment.author}
              </span>

              {comment.authorClass && !comment.isAnon && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  background: 'var(--b-yellow)', color: 'var(--b-black)',
                  border: '1px solid var(--b-black)',
                  padding: '1px 6px', letterSpacing: '0.04em',
                  textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace",
                  marginLeft: 4,
                }}>
                  {comment.authorClass}
                </span>
              )}
              <span style={{ color: 'var(--b-gray)', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, marginLeft: 'auto' }}>{comment.time}</span>
              
              {/* Bottone Rispondi */}
              <button 
                onClick={() => { setReplyTo(comment); document.getElementById('post-comment-input')?.focus(); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 8, padding: 4, display: 'flex', alignItems: 'center' }}
                title="Rispondi"
              >
                <CornerUpLeft size={15} strokeWidth={2.5} color="var(--b-black)" />
              </button>
            </div>

            {/* Quoted Reply Block */}
            {comment.replyToId && post.comments.find(c => c.id === comment.replyToId) && (
              <div style={{
                marginBottom: 8, padding: '6px 10px',
                background: 'rgba(0,0,0,0.04)', borderLeft: '3px solid var(--b-black)',
                fontSize: '0.8rem'
              }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', marginBottom: 2 }}>
                  {post.comments.find(c => c.id === comment.replyToId).author}
                </span>
                <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {post.comments.find(c => c.id === comment.replyToId).text}
                </span>
              </div>
            )}

            <p style={{ color: 'var(--b-black)', margin: 0, lineHeight: 1.55, fontSize: '0.9rem' }}>{comment.text}</p>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>
    </div>
  );
}
