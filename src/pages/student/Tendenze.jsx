import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThumbsUp, MessageSquare, TrendingUp, Crown, Medal, Award } from 'lucide-react';

const DunceCapIcon = ({ size = 24 }) => (
  <img src="/dunce-cap-svgrepo-com.svg" width={size} height={size} alt="Asinello" />
);
import { useReports as useReportsMock } from '../../services/mockStore';
import { getPublicReports } from '../../services/db';

function formatPostTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Tendenze() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isDemo = slug === 'demo';
  const mockReports = useReportsMock();
  const [realReports, setRealReports] = useState([]);
  const [loading, setLoading] = useState(!isDemo);
  const [activeTab, setActiveTab] = useState('giornalieri');

  useEffect(() => {
    if (isDemo) return;
    setLoading(true);
    getPublicReports(slug)
      .then(({ posts }) => setRealReports(posts.map(r => {
        const createdAt = new Date(r.created_at).getTime();
        return {
          ...r,
          createdAt,
          time: formatPostTime(createdAt),
          isPublic: true,
          likes: r.votes?.[0]?.count || 0,
          comments: Array(r.comments?.[0]?.count || 0),
        };
      })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isDemo, slug]);

  const allReports = isDemo ? mockReports : realReports;

  // Calcola il punteggio di interazione
  const getInteractions = (r) => (r.likes || 0) + (r.comments?.length || 0);

  // Filtriamo i report pubblici
  const publicReports = allReports.filter(r => r.isPublic);

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;

  // Separiamo per range temporale
  const daily = publicReports.filter(r => now - r.createdAt <= DAY_MS);
  const weekly = publicReports.filter(r => now - r.createdAt <= WEEK_MS);

  // Ordiniamo per interazioni decrescenti
  daily.sort((a, b) => getInteractions(b) - getInteractions(a));
  weekly.sort((a, b) => getInteractions(b) - getInteractions(a));

  const displayReports = activeTab === 'giornalieri' ? daily : weekly;

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--b-red)', color: 'var(--b-white)', border: '3px solid var(--b-black)', padding: '8px 12px', boxShadow: '4px 4px 0 var(--b-black)', transform: 'rotate(-5deg)' }}>
          <TrendingUp size={28} strokeWidth={3} />
        </div>
        <h1 style={{ textTransform: 'uppercase', margin: 0, fontSize: '2.2rem', textShadow: '2px 2px 0 var(--b-yellow)' }}>Tendenze</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', border: '3px solid var(--b-black)', width: 'fit-content', marginBottom: 24, boxShadow: 'var(--b-shadow-sm)' }}>
        <button
          onClick={() => setActiveTab('giornalieri')}
          style={{
            padding: '10px 20px', border: 'none', borderRight: '3px solid var(--b-black)',
            background: activeTab === 'giornalieri' ? 'var(--b-black)' : 'var(--b-white)',
            color: activeTab === 'giornalieri' ? 'var(--b-yellow)' : 'var(--b-black)',
            fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          Giornalieri
        </button>
        <button
          onClick={() => setActiveTab('settimanali')}
          style={{
            padding: '10px 20px', border: 'none',
            background: activeTab === 'settimanali' ? 'var(--b-black)' : 'var(--b-white)',
            color: activeTab === 'settimanali' ? 'var(--b-yellow)' : 'var(--b-black)',
            fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          Settimanali
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', border: '3px solid var(--b-black)', background: 'var(--b-white)', boxShadow: 'var(--b-shadow-sm)' }}>
            <p style={{ fontWeight: 700, color: 'var(--b-gray)', margin: 0 }}>Caricamento tendenze...</p>
          </div>
        ) : displayReports.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', border: '3px solid var(--b-black)', background: 'var(--b-white)', boxShadow: 'var(--b-shadow-sm)' }}>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Nessun post trovato.</p>
            <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem' }}>Non ci sono ancora abbastanza dati.</p>
          </div>
        ) : (
          displayReports.slice(0, 15).map((report, index) => {
            const isLast = index === Math.min(displayReports.length - 1, 14);
            // Stili speciali per i primi 3 classificati e l'ultimo
            let bg = 'var(--b-white)';
            let rotation = 'none';
            let IconCmp = null;
            let iconColor = 'var(--b-black)';
            
            if (index === 0) {
              bg = 'var(--b-yellow)';
              rotation = 'rotate(-1deg)';
              IconCmp = Crown;
              iconColor = 'var(--b-black)';
            } else if (index === 1) {
              bg = 'var(--b-blue)';
              IconCmp = Medal;
              iconColor = 'var(--b-white)';
            } else if (index === 2) {
              bg = 'var(--b-orange)';
              IconCmp = Award;
              iconColor = 'var(--b-white)';
            } else if (isLast && index > 2) {
              bg = 'var(--b-gray-l)';
              rotation = 'rotate(1deg)';
              IconCmp = DunceCapIcon;
              iconColor = 'var(--b-black)';
            }

            const isPodium = index < 3;
            const textColor = index === 1 || index === 2 ? 'var(--b-white)' : 'var(--b-black)';
            const grayColor = index === 1 || index === 2 ? 'rgba(255,255,255,0.8)' : 'var(--b-gray)';
            const timeLabel = report.time || formatPostTime(report.createdAt);

            return (
              <div
                key={report.id}
                onClick={() => navigate(`/box/${slug}/post/${report.id}`)}
                style={{
                  display: 'flex', gap: 16, background: bg, color: textColor,
                  border: '3px solid var(--b-black)', padding: 16, cursor: 'pointer',
                  boxShadow: isPodium ? '6px 6px 0 var(--b-black)' : 'var(--b-shadow-sm)', 
                  transform: rotation,
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.transform = `translate(-2px, -2px) ${rotation !== 'none' ? rotation : ''}`; 
                  e.currentTarget.style.boxShadow = isPodium ? '8px 8px 0 var(--b-black)' : 'var(--b-shadow)'; 
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.transform = rotation; 
                  e.currentTarget.style.boxShadow = isPodium ? '6px 6px 0 var(--b-black)' : 'var(--b-shadow-sm)'; 
                }}
              >
                {/* Posizione in classifica */}
                <div style={{
                  fontSize: '2.5rem', fontWeight: 900, color: textColor,
                  minWidth: 50, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif",
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  {IconCmp && <div style={{ marginBottom: -5 }}><IconCmp size={28} color={iconColor} /></div>}
                  #{index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', textTransform: 'uppercase', lineHeight: 1.2 }}>{report.title}</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: grayColor, fontSize: '0.85rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ThumbsUp size={16} strokeWidth={2.5} color={textColor} /> <span style={{ color: textColor }}>{report.likes || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageSquare size={16} strokeWidth={2.5} color={textColor} /> <span style={{ color: textColor }}>{report.comments?.length || 0}</span>
                    </div>
                    {timeLabel && (
                      <div style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                        {timeLabel}
                      </div>
                    )}
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
