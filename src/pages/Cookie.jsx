import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function Cookie() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--b-bg)', color: 'var(--b-black)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '140px 24px 80px', flex: 1 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
            style={{ marginBottom: 32, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} /> Torna alla Home
          </button>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            marginBottom: 24,
            lineHeight: 1.1,
          }}>
            Cookie <span className="landing-highlight">Policy</span>
          </h1>
          
          <div className="flat-panel" style={{ padding: 'clamp(20px, 5vw, 40px)' }}>
            <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--b-black)', fontWeight: 500 }}>
              <p>
                <strong>Ultimo aggiornamento: Settembre 2026</strong>
              </p>
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                1. Cosa sono i Cookie?
              </h2>
              <p>
                I cookie sono piccoli file di testo che i siti visitati inviano al tuo dispositivo, dove vengono memorizzati per poi essere ritrasmessi agli stessi siti alla visita successiva.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                2. Privacy-First: Niente Cookie di Tracciamento
              </h2>
              <p>
                DilloQui è una piattaforma costruita con il principio della <em>Privacy by Design</em>. <strong>Non utilizziamo cookie di profilazione, cookie pubblicitari, o tracker di terze parti (come Google Analytics, Pixel di Facebook, ecc.)</strong>. Non ci interessa vendere i tuoi dati.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                3. Cookie Tecnici Essenziali
              </h2>
              <p>
                Utilizziamo esclusivamente <strong>cookie tecnici e tecnologie simili (es. LocalStorage)</strong> strettamente necessari per il funzionamento dell'applicazione. Ai sensi del Provvedimento del Garante per la Protezione dei Dati Personali italiano, <strong>per l'uso dei cookie tecnici non è richiesto il consenso preventivo dell'utente</strong>, motivo per cui non ti abbiamo mostrato un "banner enorme" per accettarli.
              </p>
              <ul style={{ paddingLeft: 24, marginBottom: 24, marginTop: 16 }}>
                <li><strong>Autenticazione (Supabase Auth):</strong> Salviamo un token sicuro per mantenerti connesso alla piattaforma mentre navighi tra le pagine. (Scadenza: fine sessione / configurazione cloud).</li>
                <li><strong>Anonimato (Ownership server-side):</strong> Se invii una segnalazione anonima, il sistema crea un collegamento cifrato tra il tuo account e la segnalazione nella nostra tabella <code>report_owners</code> su Supabase, senza che i Rappresentanti possano vederlo. Questo ti permette di visualizzare le risposte e la chat su qualsiasi dispositivo, anche se svuoti la cache del browser. Nessun dato aggiuntivo viene salvato in locale per questo scopo.</li>
                <li><strong>Preferenze UI:</strong> Potremmo salvare preferenze temporanee sull'interfaccia (es. modalità scura/chiara se implementata).</li>
              </ul>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                4. Come Disabilitare i Cookie
              </h2>
              <p>
                Puoi disabilitare o cancellare i cookie attraverso le impostazioni del tuo browser. Tuttavia, ti avvisiamo che disabilitando i cookie tecnici (o svuotando il LocalStorage) <strong>DilloQui non funzionerà correttamente</strong>: non potrai fare il login e non potrai ricevere le risposte ai tuoi messaggi anonimi.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
