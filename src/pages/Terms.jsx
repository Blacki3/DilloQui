import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function Terms() {
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
            Termini di <span className="landing-highlight-dark">Servizio</span>
          </h1>
          
          <div className="flat-panel" style={{ padding: 'clamp(20px, 5vw, 40px)' }}>
            <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--b-black)', fontWeight: 500 }}>
              
              <div style={{
                background: 'var(--b-red)', color: 'white', padding: '16px 20px', 
                border: '2px solid var(--b-black)', marginBottom: 40, fontWeight: 700,
                display: 'flex', gap: 16, alignItems: 'flex-start'
              }}>
                <AlertTriangle strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  L'uso di DILLOQUI comporta l'accettazione di queste regole. L'abuso dello strumento, in particolare della funzione di anonimato per scopi illeciti, comporterà segnalazioni alle autorità competenti.
                </div>
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                1. Scopo della Piattaforma
              </h2>
              <p>
                DILLOQUI è un servizio per facilitare la comunicazione costruttiva tra gli studenti e i loro Rappresentanti (di classe o d'istituto). Lo scopo è segnalare problemi infrastrutturali, dubbi didattici, proposte per la scuola o disagi, migliorando la vita scolastica di tutti.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                2. Chi Può Iscriversi
              </h2>
              <p>
                Per usare DILLOQUI devi avere <strong>almeno 14 anni compiuti</strong> ed essere uno studente della scuola a cui appartiene lo sportello. Sotto i 14 anni la legge italiana richiede il consenso di chi esercita la responsabilità genitoriale, che DilloQui non è in grado di raccogliere: per questo il servizio non è aperto a chi ha un'età inferiore.
                <br /><br />
                Confermi di avere l'età richiesta quando completi l'iscrizione. Gli account che risultano appartenere a minori di 14 anni vengono chiusi e i loro dati eliminati.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                3. Regole di Condotta per chi Segnala (Studenti)
              </h2>
              <p>
                Utilizzando DILLOQUI ti impegni a <strong>NON</strong> usare la piattaforma per:
              </p>
              <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
                <li>Inviare insulti, minacce, o messaggi discriminatori verso compagni, professori o personale scolastico.</li>
                <li>Compiere atti di cyberbullismo o diffamazione.</li>
                <li>Inviare false segnalazioni di emergenza (es. falsi allarmi, procurato allarme).</li>
                <li>Caricare materiale o testi osceni, illegali o non pertinenti alla vita scolastica.</li>
              </ul>
              <p>
                In caso di violazione di queste regole, i Rappresentanti possono cancellare la segnalazione. Nei casi previsti dalla legge (es. reati), DILLOQUI collaborerà con le Forze dell'Ordine fornendo i dati di tracciamento associati all'account.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                4. Doveri dei Rappresentanti (Admin della Box)
              </h2>
              <p>
                Se crei una Box e diventi Amministratore (Rappresentante), ti assumi la responsabilità di gestire i dati dei tuoi compagni in modo etico. Ti impegni espressamente a:
              </p>
              <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
                <li><strong>Mantenere la Riservatezza:</strong> Non divulgare mai all'esterno (es. chat WhatsApp, social media) il contenuto delle segnalazioni private dei tuoi compagni.</li>
                <li><strong>Non fare indagini personali:</strong> Se ricevi una segnalazione anonima, è vietato cercare di forzare o dedurre l'identità dell'autore tramite pressioni.</li>
                <li><strong>Utilizzo Costruttivo:</strong> Usare i dati aggregati (senza nomi) per presentare proposte valide ai professori, ai Consigli di Classe o d'Istituto.</li>
              </ul>
              <p>
                DILLOQUI si riserva il diritto di chiudere le Box i cui Amministratori non rispettino questi standard etici.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                5. Limitazione di Responsabilità del Creatore della Piattaforma
              </h2>
              <p>
                DILLOQUI è un fornitore tecnico del servizio (Software as a Service) fornito "così com'è". <strong>Il creatore e gli sviluppatori della piattaforma non hanno alcun accesso non autorizzato né controllo</strong> sui contenuti inseriti all'interno delle singole Box. 
              </p>
              <p style={{ marginTop: 16 }}>
                <strong>Ogni Box scolastica è uno spazio virtuale auto-gestito.</strong> La responsabilità penale, civile e morale dei contenuti (messaggi, commenti) ricade unicamente ed esclusivamente sull'autore degli stessi. Allo stesso modo, la responsabilità gestionale della singola Box ricade in pieno sugli Amministratori (i Rappresentanti) che l'hanno aperta e che vi operano. Il creatore di DilloQui declina ogni responsabilità per danni, controversie o illeciti derivanti dall'uso improprio dello strumento da parte degli studenti o dei rappresentanti.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
