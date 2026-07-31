import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QrCode, TrendingUp, FileText, Users, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Popup from '../../components/Popup';
import CopyLinkButton from '../../components/CopyLinkButton';
import { useAuth } from '../../context/AuthContext';
// Mock (solo per la demo)
import { useReports as useReportsMock, STATUS, TYPE_LABEL } from '../../services/mockStore';
import { getSettings } from '../../services/mockSettings';
// Reale
import { getAllReports, getBox } from '../../services/db';

// Numero di giorni coperti da ciascun periodo (oggi incluso).
const PERIOD_DAYS = { settimanale: 7, mensile: 30 };
// Periodo "mensile": 5 bucket settimanali da 6 giorni (5 * 6 = 30 giorni).
const MONTHLY_BUCKETS = 5;
const MONTHLY_BUCKET_DAYS = 6;
// Periodo "giornaliero": la giornata locale (mezzanotte→ora) in blocchi da 4 ore.
const DAILY_BLOCK_HOURS = 4;

const PERIOD_HEADINGS = {
  giornaliero: 'Andamento Giornaliero',
  settimanale: 'Andamento Settimanale',
  mensile: 'Andamento Mensile',
};

const CHART_COLORS = [
  '#E80000', '#1A56DB', '#FF6B00', '#00A832',
  '#7C3AED', '#DB2777', '#0F766E', '#CA8A04',
];

const DEFAULT_CATEGORIES = Object.keys(TYPE_LABEL);

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function categoryKey(name) {
  return String(name || '').trim().toLowerCase();
}

function emptyCategoryCounts(categories) {
  return Object.fromEntries(categories.map((c) => [categoryKey(c), 0]));
}

function bumpCategory(counts, reportType, categories) {
  const key = categoryKey(reportType);
  if (Object.prototype.hasOwnProperty.call(counts, key)) {
    counts[key] += 1;
    return;
  }
  // Match soft: report.type "problema" vs label "Un problema"
  const soft = categories.find((c) => {
    const ck = categoryKey(c);
    return ck.includes(key) || key.includes(ck);
  });
  if (soft) counts[categoryKey(soft)] += 1;
}

/** Hook che ritorna i report normalizzati (demo = mock, reale = Supabase) */
function useAdminReports(isDemo, boxSlug) {
  const mockReports = useReportsMock();
  const [realReports, setRealReports] = useState([]);
  const [loadingReal, setLoadingReal] = useState(!isDemo);

  useEffect(() => {
    if (isDemo || !boxSlug) {
      setLoadingReal(false);
      return;
    }
    setLoadingReal(true);
    getAllReports(boxSlug)
      .then(data => {
        setRealReports(data.map(r => ({
          ...r,
          createdAt: new Date(r.created_at).getTime(),
          authorName: r.author_id ? r.profiles?.nome : null,
          anonimo: r.is_anonymous,
          mine: false,
        })));
      })
      .catch(console.error)
      .finally(() => setLoadingReal(false));
  }, [isDemo, boxSlug]);

  return isDemo ? { reports: mockReports, loading: false } : { reports: realReports, loading: loadingReal };
}

export default function Dashboard() {
  const [showQr, setShowQr] = useState(false);
  const [period, setPeriod] = useState('settimanale');
  const location = useLocation();
  const { profile } = useAuth();
  const isDemo = location.pathname.startsWith('/demo/admin');
  // In reale solo profile.box_slug — niente fallback a mockSettings.slug
  const boxSlug = isDemo ? 'demo' : profile?.box_slug;
  const appUrl = import.meta.env.VITE_APP_URL || 'https://dilloqui.netlify.app';
  const shareUrl = boxSlug ? `${appUrl}/box/${boxSlug}` : appUrl;

  const { reports, loading } = useAdminReports(isDemo, boxSlug);

  const [categories, setCategories] = useState(() =>
    isDemo
      ? (getSettings().categories?.length ? getSettings().categories : DEFAULT_CATEGORIES)
      : DEFAULT_CATEGORIES,
  );

  useEffect(() => {
    if (isDemo) {
      const fromSettings = getSettings().categories;
      setCategories(fromSettings?.length ? fromSettings : DEFAULT_CATEGORIES);
      return;
    }
    if (!boxSlug) return;
    getBox(boxSlug)
      .then((box) => {
        if (box?.categories?.length) setCategories(box.categories);
        else setCategories(DEFAULT_CATEGORIES);
      })
      .catch(console.error);
  }, [isDemo, boxSlug]);

  const categoryKeys = useMemo(
    () => categories.map(categoryKey).filter(Boolean),
    [categories],
  );

  const chartData = useMemo(() => {
    if (period === 'giornaliero') {
      const todayStart = startOfDay(new Date()).getTime();
      const blocks = Array.from({ length: 24 / DAILY_BLOCK_HOURS }, (_, i) => {
        const start = i * DAILY_BLOCK_HOURS;
        return {
          name: `${pad2(start)}-${pad2(start + DAILY_BLOCK_HOURS)}`,
          ...emptyCategoryCounts(categories),
        };
      });
      reports.forEach((report) => {
        const created = new Date(report.createdAt || report.created_at);
        if (startOfDay(created).getTime() !== todayStart) return;
        const index = Math.floor(created.getHours() / DAILY_BLOCK_HOURS);
        const item = blocks[index];
        if (!item) return;
        bumpCategory(item, report.type, categories);
      });
      return blocks;
    }

    if (period === 'mensile') {
      const todayStart = startOfDay(new Date());
      const buckets = Array.from({ length: MONTHLY_BUCKETS }, (_, i) => ({
        name: `Sett. ${i + 1}`,
        ...emptyCategoryCounts(categories),
      }));
      reports.forEach((report) => {
        const dayDiff = Math.floor((todayStart - startOfDay(new Date(report.createdAt || report.created_at))) / 86400000);
        if (dayDiff < 0 || dayDiff >= MONTHLY_BUCKETS * MONTHLY_BUCKET_DAYS) return;
        const index = MONTHLY_BUCKETS - 1 - Math.floor(dayDiff / MONTHLY_BUCKET_DAYS);
        const item = buckets[index];
        if (!item) return;
        bumpCategory(item, report.type, categories);
      });
      return buckets;
    }

    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      days.push({
        key,
        name: date.toLocaleDateString('it-IT', { weekday: 'short' }),
        ...emptyCategoryCounts(categories),
      });
    }
    const indexByKey = Object.fromEntries(days.map((d) => [d.key, d]));
    reports.forEach((report) => {
      const key = new Date(report.createdAt || report.created_at).toISOString().slice(0, 10);
      const item = indexByKey[key];
      if (!item) return;
      bumpCategory(item, report.type, categories);
    });
    return days;
  }, [reports, period, categories]);

  const statCards = useMemo(() => {
    // Allineato al chart: giorno locale (mezzanotte), non finestra rolling 24h
    let windowStartMs;
    if (period === 'giornaliero') {
      windowStartMs = startOfDay(new Date()).getTime();
    } else {
      const windowStart = startOfDay(new Date());
      windowStart.setDate(windowStart.getDate() - (PERIOD_DAYS[period] - 1));
      windowStartMs = windowStart.getTime();
    }
    const windowed = reports.filter((report) => {
      const ts = report.createdAt || new Date(report.created_at).getTime();
      return ts >= windowStartMs;
    });

    const total = windowed.length;
    const students = new Set(
      windowed.filter((r) => r.author_id && !r.is_anonymous).map((r) => r.author_id),
    ).size;
    const resolved = windowed.filter((r) => r.status === 'resolved' || r.status === 'closed' || r.status === STATUS?.resolved || r.status === STATUS?.closed).length;
    const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
    const newCount = windowed.filter((r) => r.status === 'new' || r.status === STATUS?.new).length;

    return [
      { label: 'SEGNALAZIONI TOTALI', value: String(total), trend: `${newCount} nuove`, icon: FileText, bg: '#FFD600', color: '#0A0A0A' },
      { label: 'STUDENTI ATTIVI', value: String(students), trend: 'utenti identificati', icon: Users, bg: '#1A56DB', color: '#FFFFFF' },
      { label: 'TASSO RISOLUZIONE', value: `${resolutionRate}%`, trend: `${resolved} su ${total} gestite`, icon: CheckCircle, bg: '#00A832', color: '#FFFFFF' },
    ];
  }, [reports, period]);

  const legendItems = categories.map((label, i) => ({
    label: String(label).toUpperCase(),
    color: CHART_COLORS[i % CHART_COLORS.length],
    key: categoryKey(label),
  }));

  return (
    <motion.div
      className="admin-page admin-page-wide"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="dash-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 36, background: 'var(--b-yellow)', border: '2px solid var(--b-black)' }} />
            <h1 style={{ textTransform: 'uppercase', margin: 0 }}>Dashboard</h1>
          </div>
          <div style={{ color: 'var(--b-gray)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', paddingLeft: 18 }}>
            Panoramica e andamento della piattaforma
          </div>
        </div>
        <div className="dash-actions">
          <CopyLinkButton
            url={shareUrl}
            label="Condividi"
            icon="share"
            id="dash-share-btn"
            style={{ padding: '9px 18px', fontSize: '0.8rem', boxShadow: 'var(--b-shadow-sm)', ...(boxSlug ? {} : { opacity: 0.45, pointerEvents: 'none' }) }}
          />
          <button
            className="dash-btn"
            onClick={() => boxSlug && setShowQr(true)}
            id="dash-qr-btn"
            style={boxSlug ? undefined : { opacity: 0.45, pointerEvents: 'none' }}
          >
            <QrCode size={15} strokeWidth={2.5} color="var(--b-black)" /> QR Code
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>Caricamento statistiche...</div>
      ) : (
        <div className="stats-grid">
          {statCards.map(card => (
            <div key={card.label} className="stat-card" style={{ background: card.bg, border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)' }} id={`stat-${card.label.toLowerCase().replace(/ /g, '-')}`}>
              <div className="stat-card-label" style={{ color: `${card.color}CC` }}>
                <card.icon size={18} strokeWidth={2.5} color={card.color} />
                {card.label}
              </div>
              <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-card-trend" style={{ color: `${card.color}CC` }}>
                <TrendingUp size={13} strokeWidth={2.5} />
                {card.trend}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="flat-panel">
        <div className="dash-chart-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 24, background: 'var(--b-orange)', border: '1px solid var(--b-black)' }} />
            <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
              {PERIOD_HEADINGS[period]}
            </h3>
          </div>
          <div className="period-toggle" role="tablist" aria-label="Periodo andamento">
            {[
              { id: 'giornaliero', label: 'Giornaliero' },
              { id: 'settimanale', label: 'Settimanale' },
              { id: 'mensile', label: 'Mensile' },
            ].map((opt) => (
              <button key={opt.id} type="button" role="tab" aria-selected={period === opt.id}
                className={`period-toggle-btn ${period === opt.id ? 'active' : ''}`}
                onClick={() => setPeriod(opt.id)} id={`period-toggle-${opt.id}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                {categoryKeys.map((key, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  return (
                    <linearGradient key={key} id={`gCat-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8D0C0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
              <Tooltip contentStyle={{ border: '3px solid #0A0A0A', borderRadius: 0, boxShadow: '4px 4px 0 #0A0A0A', fontSize: 12, fontFamily: 'Space Grotesk', fontWeight: 700 }} />
              {categoryKeys.map((key, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                const label = categories[i] || key;
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2.5}
                    fill={`url(#gCat-${i})`}
                    name={label}
                    dot={{ r: 4, fill: color, stroke: '#0A0A0A', strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: '#0A0A0A', strokeWidth: 2 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 0, justifyContent: 'center', marginTop: 16, border: '2px solid var(--b-black)', width: 'fit-content', margin: '16px auto 0', flexWrap: 'wrap' }}>
          {legendItems.map((l, i) => (
            <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', padding: '7px 16px', borderRight: i < legendItems.length - 1 ? '2px solid var(--b-black)' : 'none' }}>
              <div style={{ width: 12, height: 12, background: l.color, border: '1.5px solid var(--b-black)' }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* QR Popup */}
      <Popup show={showQr} title="QR Code Dillo Qui" onClose={() => setShowQr(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 8px' }}>
          <div style={{ border: '3px solid var(--b-black)', padding: 8, boxShadow: 'var(--b-shadow)', marginBottom: 16 }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`} alt="QR Code" style={{ display: 'block' }} />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--b-gray)', textAlign: 'center', marginBottom: 16 }}>
            Fai scansionare questo codice per far accedere gli studenti.
          </p>
          <button className="btn-primary" onClick={() => setShowQr(false)}>Chiudi ✕</button>
        </div>
      </Popup>
    </motion.div>
  );
}
