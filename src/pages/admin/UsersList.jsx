import { useState, useEffect } from 'react';
import { Shield, ShieldBan, Trash2, User, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// Mock (solo per la demo)
import { getAllUsers, blockUser, deleteUser } from '../../services/mockProfiles';
// Reale
import { getBoxUsers } from '../../services/db';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { profile } = useAuth();
  const isDemo = location.pathname.startsWith('/demo/admin');
  const boxSlug = isDemo ? 'demo' : profile?.box_slug;

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setUsers(getAllUsers());
      } else if (boxSlug) {
        const data = await getBoxUsers(boxSlug);
        setUsers(data);
      }
    } catch (err) {
      console.error('Errore caricamento utenti:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [isDemo, boxSlug]);

  // Profilo admin senza sportello collegato
  if (!isDemo && profile && !boxSlug) {
    return (
      <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="flat-panel" style={{ maxWidth: 480, textAlign: 'center', padding: 24 }}>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 8 }}>Nessuno sportello collegato</h3>
          <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', margin: 0 }}>
            Il tuo profilo admin non è collegato a nessuna Box.
            Probabilmente la registrazione non è andata a buon fine:
            contatta il supporto o ripeti la registrazione dello sportello.
          </p>
        </div>
      </div>
    );
  }

  const handleBlock = (id, isBlocked) => {
    if (!isDemo) return; // Blocco non implementato su Supabase in questa fase
    blockUser(id, !isBlocked);
    loadUsers();
  };

  const handleDelete = (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;
    if (!isDemo) return; // Eliminazione non implementata su Supabase in questa fase
    deleteUser(id);
    loadUsers();
  };

  const filtered = users.filter(u =>
    (u.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.cognome || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="admin-page admin-page-wide"
      style={{ paddingBottom: 60 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 8, height: 36, background: 'var(--b-blue)', border: '2px solid var(--b-black)' }} />
          <h1 style={{ textTransform: 'uppercase', margin: 0 }}>Gestione Utenti</h1>
        </div>
        <p style={{ color: 'var(--b-gray)', fontSize: '0.9rem', paddingLeft: 18, fontWeight: 600 }}>
          Visualizza e gestisci gli utenti registrati sulla piattaforma.
        </p>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, border: '2px solid var(--b-black)', background: 'var(--b-white)', padding: '0 12px', boxShadow: 'var(--b-shadow-sm)' }}>
          <Search size={18} color="var(--b-gray)" />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', flex: 1, padding: '12px', outline: 'none', fontWeight: 700 }}
          />
        </div>
      </div>

      <div style={{ border: '3px solid var(--b-black)', background: 'var(--b-cream)', boxShadow: 'var(--b-shadow)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>Caricamento utenti...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--b-gray)', fontWeight: 700 }}>Nessun utente trovato.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 800 }}>
            {/* Header Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '12px 16px', borderBottom: '3px solid var(--b-black)', background: 'var(--b-yellow)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem' }}>
              <div>Utente</div>
              <div>Email</div>
              <div>Ruolo</div>
              <div>Classe</div>
              <div style={{ textAlign: 'right' }}>
                Azioni
                {!isDemo && (
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'none', letterSpacing: 0, color: 'var(--b-black)', opacity: 0.7, marginTop: 2 }}>
                    Solo lettura
                  </div>
                )}
              </div>
            </div>
            {filtered.map((u, i) => {
              const isBlocked = u.status === 'blocked';
              return (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--b-black)' : 'none', background: isBlocked ? '#ffebeb' : 'var(--b-white)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: u.role === 'admin' ? 'var(--b-blue)' : 'var(--b-yellow)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} color={u.role === 'admin' ? '#fff' : '#000'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isBlocked ? 'var(--b-red)' : 'var(--b-black)', textDecoration: isBlocked ? 'line-through' : 'none' }}>{u.nome} {u.cognome}</div>
                    </div>
                  </div>

                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>{u.email}</div>

                  <div>
                    <span style={{ background: u.role === 'admin' ? 'var(--b-blue)' : 'var(--b-gray-l)', color: u.role === 'admin' ? '#fff' : '#000', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', border: '1px solid var(--b-black)' }}>
                      {u.role === 'admin' ? 'Admin' : 'Studente'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--b-gray)' }}>
                    {u.classe || '-'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {isDemo && u.role !== 'admin' && (
                      <button
                        onClick={() => handleBlock(u.id, isBlocked)}
                        title={isBlocked ? 'Sblocca utente' : 'Blocca utente'}
                        style={{ background: isBlocked ? 'var(--b-green)' : 'var(--b-orange)', border: '2px solid var(--b-black)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translate(-1px,-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        {isBlocked ? <Shield size={16} color="#000" /> : <ShieldBan size={16} color="#000" />}
                      </button>
                    )}
                    {isDemo && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        title="Elimina utente"
                        style={{ background: 'var(--b-red)', border: '2px solid var(--b-black)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translate(-1px,-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        <Trash2 size={16} color="#fff" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
