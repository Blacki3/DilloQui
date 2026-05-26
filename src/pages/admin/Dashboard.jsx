import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Share2, QrCode, LogOut, Users, MessageSquareWarning, TrendingUp } from 'lucide-react';
import Popup from '../../components/Popup';
import { useAuth } from '../../context/AuthContext';

const mockData = [
  { name: 'Lun', problemi: 4, proposte: 2, dubbi: 1 },
  { name: 'Mar', problemi: 3, proposte: 1, dubbi: 2 },
  { name: 'Mer', problemi: 2, proposte: 5, dubbi: 0 },
  { name: 'Gio', problemi: 6, proposte: 2, dubbi: 3 },
  { name: 'Ven', problemi: 1, proposte: 3, dubbi: 1 },
];

export default function Dashboard() {
  const { logoutAdmin } = useAuth();
  const [showQr, setShowQr] = useState(false);
  
  const boxSlug = "liceo-ponti";
  const shareUrl = `https://dilloqui.app/box/${boxSlug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link copiato negli appunti!");
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header con azioni */}
      <div className="dash-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '8px', color: 'var(--color-text-main)' }}>Dashboard</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Panoramica e andamento della piattaforma.</div>
        </div>
        
        <div className="dash-actions">
          <button 
            onClick={copyLink}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', color: 'var(--color-text-main)', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: '0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <Share2 size={18} color="var(--color-primary)" /> Condividi
          </button>
          
          <button 
            onClick={() => setShowQr(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', color: 'var(--color-text-main)', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: '0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <QrCode size={18} color="var(--color-primary)" /> QR Code
          </button>
          
        </div>
      </div>

      {/* Stats Cards Arricchite */}
      <div className="stats-grid">
        <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>Segnalazioni Totali</div>
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '8px', borderRadius: '12px' }}><MessageSquareWarning size={20} /></div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-text-main)' }}>34</div>
          <div style={{ fontSize: '0.875rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            <TrendingUp size={16} /> +12% questa settimana
          </div>
        </div>

        <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>Studenti Registrati</div>
            <div style={{ background: 'var(--color-primary-lighter)', color: 'var(--color-primary)', padding: '8px', borderRadius: '12px' }}><Users size={20} /></div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-text-main)' }}>128</div>
          <div style={{ fontSize: '0.875rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            <TrendingUp size={16} /> +5 nuovi oggi
          </div>
        </div>

        <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', color: 'white' }}>
          <div style={{ fontWeight: '600', opacity: 0.9 }}>Tasso di Risoluzione</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>76%</div>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Ottimo lavoro! 26 su 34 risolte.
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flat-panel" style={{ padding: '32px' }}>
        <h3 style={{ marginBottom: '32px', fontSize: '1.25rem', color: 'var(--color-text-main)' }}>Andamento Settimanale</h3>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProblemi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProposte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDubbi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontWeight: '600' }}
              />
              <Area type="monotone" dataKey="problemi" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorProblemi)" name="Problemi" />
              <Area type="monotone" dataKey="proposte" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProposte)" name="Proposte" />
              <Area type="monotone" dataKey="dubbi" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDubbi)" name="Dubbi" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Popup QR Code */}
      <Popup 
        show={showQr} 
        title="QR Code Dillo Qui" 
        onClose={() => setShowQr(false)}
      >
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`} 
            alt="QR Code" 
            style={{ borderRadius: '12px', marginBottom: '16px', border: '1px solid #e5e7eb', padding: '8px' }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Fai scansionare questo codice per far accedere gli studenti direttamente alla pagina di verifica.
          </p>
        </div>
      </Popup>
    </div>
  );
}
