import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Share2, QrCode, TrendingUp, FileText, Users, CheckCircle } from 'lucide-react';
import Popup from '../../components/Popup';
import { useAuth } from '../../context/AuthContext';

const mockData = [
  { name: 'Giov', problemi: 4, proposte: 2, dubbi: 1 },
  { name: 'Luv',  problemi: 3, proposte: 1, dubbi: 2 },
  { name: 'Mar',  problemi: 6, proposte: 4, dubbi: 1 },
  { name: 'Cen',  problemi: 5, proposte: 2, dubbi: 3 },
  { name: 'Giov', problemi: 2, proposte: 3, dubbi: 2 },
  { name: 'Sab',  problemi: 4, proposte: 5, dubbi: 3 },
  { name: 'Mon',  problemi: 7, proposte: 4, dubbi: 4 },
];

export default function Dashboard() {
  const { logoutAdmin } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo/admin');
  const boxSlug = isDemo ? 'demo' : 'liceo-ponti';
  const shareUrl = `https://dilloqui.app/box/${boxSlug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copiato negli appunti!');
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 style={{ color: 'var(--color-text-main)' }}>Dashboard</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Panoramica e andamento della piattaforma.
          </div>
        </div>
        <div className="dash-actions">
          <button className="dash-btn" onClick={copyLink}>
            <Share2 size={16} color="var(--color-primary)" /> Condividi
          </button>
          <button className="dash-btn" onClick={() => setShowQr(true)}>
            <QrCode size={16} color="var(--color-primary)" /> QR Code
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">
            <FileText size={20} color="var(--color-primary)" /> Segnalazioni Totali
          </div>
          <div className="stat-card-value">34</div>
          <div className="stat-card-trend">
            <TrendingUp size={14} /> +12% questa settimana
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <Users size={20} color="var(--color-primary)" /> Studenti Registrati
          </div>
          <div className="stat-card-value">128</div>
          <div className="stat-card-trend">
            <TrendingUp size={14} /> +5 nuovi oggi
          </div>
        </div>

        <div className="stat-card accent">
          <div className="stat-card-label">
            <CheckCircle size={20} /> Tasso di Risoluzione
          </div>
          <div className="stat-card-value">76%</div>
          <div className="stat-card-trend">
            Ottimo lavoro! 26 su 34 risolte.
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flat-panel">
        <h3 style={{ marginBottom: 24, color: 'var(--color-text-main)' }}>Andamento Settimanale</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gProblemi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2d7a47" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2d7a47" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProposte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDubbi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 13 }}
              />
              <Area type="monotone" dataKey="problemi" stroke="#2d7a47" strokeWidth={2.5} fill="url(#gProblemi)" name="Problema" dot={{ r: 3, fill: '#2d7a47' }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="proposte" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gProposte)" name="Proposta" dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="dubbi"    stroke="#3b82f6" strokeWidth={2.5} fill="url(#gDubbi)"    name="Dubbio"   dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16 }}>
          {[{ label: 'Problema', color: '#2d7a47' }, { label: 'Proposta', color: '#f59e0b' }, { label: 'Dubbio', color: '#3b82f6' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* QR Popup */}
      <Popup show={showQr} title="QR Code Dillo Qui" onClose={() => setShowQr(false)}>
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
            alt="QR Code"
            style={{ borderRadius: 12, marginBottom: 16, border: '1px solid #e5e7eb', padding: 8 }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Fai scansionare questo codice per far accedere gli studenti alla piattaforma.
          </p>
        </div>
      </Popup>
    </div>
  );
}
