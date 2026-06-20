import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QrCode, TrendingUp, FileText, Users, CheckCircle } from 'lucide-react';
import Popup from '../../components/Popup';
import CopyLinkButton from '../../components/CopyLinkButton';
import { useReports, STATUS } from '../../services/mockStore';
import { getSettings } from '../../services/mockSettings';

// Numero di giorni coperti da ciascun periodo (oggi incluso).
const PERIOD_DAYS = { settimanale: 7, mensile: 30 };
// Periodo "mensile": 5 bucket settimanali da 6 giorni (5 * 6 = 30 giorni).
const MONTHLY_BUCKETS = 5;
const MONTHLY_BUCKET_DAYS = 6;
// Periodo "giornaliero": la giornata e divisa in blocchi da 4 ore (6 blocchi).
const DAILY_BLOCK_HOURS = 4;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

const PERIOD_HEADINGS = {
  giornaliero: 'Andamento Giornaliero',
  settimanale: 'Andamento Settimanale',
  mensile: 'Andamento Mensile',
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function Dashboard() {
  const reports = useReports();
  const [showQr, setShowQr] = useState(false);
  const [period, setPeriod] = useState('settimanale');
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo/admin');
  const boxSlug = isDemo ? 'demo' : getSettings().slug;
  const shareUrl = `https://dilloqui.app/box/${boxSlug}`;

  const chartData = useMemo(() => {
    if (period === 'giornaliero') {
      const todayStart = startOfDay(new Date()).getTime();
      // Blocchi intraday da 4 ore (00-04, 04-08, ... 20-24) per la giornata di oggi.
      const blocks = Array.from({ length: 24 / DAILY_BLOCK_HOURS }, (_, i) => {
        const start = i * DAILY_BLOCK_HOURS;
        return {
          name: `${pad2(start)}-${pad2(start + DAILY_BLOCK_HOURS)}`,
          problemi: 0,
          proposte: 0,
          dubbi: 0,
        };
      });
      reports.forEach((report) => {
        const created = new Date(report.createdAt);
        if (startOfDay(created).getTime() !== todayStart) return;
        const index = Math.floor(created.getHours() / DAILY_BLOCK_HOURS);
        const item = blocks[index];
        if (!item) return;
        if (report.type === 'problema') item.problemi += 1;
        if (report.type === 'proposta') item.proposte += 1;
        if (report.type === 'dubbio') item.dubbi += 1;
      });
      return blocks;
    }

    if (period === 'mensile') {
      const todayStart = startOfDay(new Date());
      // Bucket dal piu vecchio ("Sett. 1") al piu recente ("Sett. 5").
      const buckets = Array.from({ length: MONTHLY_BUCKETS }, (_, i) => ({
        name: `Sett. ${i + 1}`,
        problemi: 0,
        proposte: 0,
        dubbi: 0,
      }));
      reports.forEach((report) => {
        const dayDiff = Math.floor((todayStart - startOfDay(report.createdAt)) / 86400000);
        if (dayDiff < 0 || dayDiff >= MONTHLY_BUCKETS * MONTHLY_BUCKET_DAYS) return;
        // dayDiff 0 = oggi -> bucket piu recente (indice piu alto).
        const index = MONTHLY_BUCKETS - 1 - Math.floor(dayDiff / MONTHLY_BUCKET_DAYS);
        const item = buckets[index];
        if (report.type === 'problema') item.problemi += 1;
        if (report.type === 'proposta') item.proposte += 1;
        if (report.type === 'dubbio') item.dubbi += 1;
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
        problemi: 0,
        proposte: 0,
        dubbi: 0,
      });
    }
    const indexByKey = Object.fromEntries(days.map((d) => [d.key, d]));
    reports.forEach((report) => {
      const key = new Date(report.createdAt).toISOString().slice(0, 10);
      const item = indexByKey[key];
      if (!item) return;
      if (report.type === 'problema') item.problemi += 1;
      if (report.type === 'proposta') item.proposte += 1;
      if (report.type === 'dubbio') item.dubbi += 1;
    });
    return days;
  }, [reports, period]);

  const statCards = useMemo(() => {
    // Finestra selezionata: 24h per "giornaliero", altrimenti gli ultimi N giorni (oggi incluso).
    let windowStartMs;
    if (period === 'giornaliero') {
      windowStartMs = Date.now() - DAILY_WINDOW_MS;
    } else {
      const windowStart = startOfDay(new Date());
      windowStart.setDate(windowStart.getDate() - (PERIOD_DAYS[period] - 1));
      windowStartMs = windowStart.getTime();
    }
    const windowed = reports.filter((report) => report.createdAt >= windowStartMs);

    const total = windowed.length;
    // Studenti attivi = autori identificabili distinti. Le segnalazioni anonime
    // non sono deduplicabili, quindi non vengono conteggiate qui per non gonfiare il dato.
    const students = new Set(
      windowed
        .filter((report) => report.authorName && !report.anonimo)
        .map((report) => report.authorName),
    ).size;
    const resolved = windowed.filter((report) => report.status === STATUS.resolved || report.status === STATUS.closed).length;
    const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
    const newCount = windowed.filter((report) => report.status === STATUS.new).length;
    const mineCount = windowed.filter((report) => report.mine).length;

    return [
      {
        label: 'SEGNALAZIONI TOTALI',
        value: String(total),
        trend: `${newCount} nuove`,
        icon: FileText,
        bg: '#FFD600', color: '#0A0A0A',
      },
      {
        label: 'STUDENTI ATTIVI',
        value: String(students),
        trend: `${mineCount} inviate da te`,
        icon: Users,
        bg: '#1A56DB', color: '#FFFFFF',
      },
      {
        label: 'TASSO RISOLUZIONE',
        value: `${resolutionRate}%`,
        trend: `${resolved} su ${total} gestite`,
        icon: CheckCircle,
        bg: '#00A832', color: '#FFFFFF',
      },
    ];
  }, [reports, period]);


  return (
    <div className="admin-page admin-page-wide">

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
            style={{ padding: '9px 18px', fontSize: '0.8rem', boxShadow: 'var(--b-shadow-sm)' }}
          />
          <button className="dash-btn" onClick={() => setShowQr(true)} id="dash-qr-btn">
            <QrCode size={15} strokeWidth={2.5} color="var(--b-black)" /> QR Code
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map(card => (
          <div
            key={card.label}
            className="stat-card"
            style={{ background: card.bg, border: '3px solid var(--b-black)', boxShadow: 'var(--b-shadow)' }}
            id={`stat-${card.label.toLowerCase().replace(/ /g, '-')}`}
          >
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
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={period === opt.id}
                className={`period-toggle-btn ${period === opt.id ? 'active' : ''}`}
                onClick={() => setPeriod(opt.id)}
                id={`period-toggle-${opt.id}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gProblemi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E80000" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E80000" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProposte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1A56DB" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDubbi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF6B00" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8D0C0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
              <Tooltip
                contentStyle={{ border: '3px solid #0A0A0A', borderRadius: 0, boxShadow: '4px 4px 0 #0A0A0A', fontSize: 12, fontFamily: 'Space Grotesk', fontWeight: 700 }}
              />
              <Area type="monotone" dataKey="problemi" stroke="#E80000" strokeWidth={2.5} fill="url(#gProblemi)" name="Problema" dot={{ r: 4, fill: '#E80000', stroke: '#0A0A0A', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#0A0A0A', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="proposte" stroke="#1A56DB" strokeWidth={2.5} fill="url(#gProposte)" name="Proposta" dot={{ r: 4, fill: '#1A56DB', stroke: '#0A0A0A', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#0A0A0A', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="dubbi"    stroke="#FF6B00" strokeWidth={2.5} fill="url(#gDubbi)"    name="Dubbio"   dot={{ r: 4, fill: '#FF6B00', stroke: '#0A0A0A', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#0A0A0A', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 0, justifyContent: 'center', marginTop: 16, border: '2px solid var(--b-black)', width: 'fit-content', margin: '16px auto 0' }}>
          {[
            { label: 'PROBLEMA', color: '#E80000' },
            { label: 'PROPOSTA',  color: '#1A56DB' },
            { label: 'DUBBIO',    color: '#FF6B00' },
          ].map((l, i) => (
            <div key={l.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.7rem', fontWeight: 800,
              letterSpacing: '0.06em', padding: '7px 16px',
              borderRight: i < 2 ? '2px solid var(--b-black)' : 'none',
            }}>
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
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
              alt="QR Code"
              style={{ display: 'block' }}
            />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--b-gray)', textAlign: 'center', marginBottom: 16 }}>
            Fai scansionare questo codice per far accedere gli studenti.
          </p>
          <button className="btn-primary" onClick={() => setShowQr(false)}>Chiudi ✕</button>
        </div>
      </Popup>
    </div>
  );
}
