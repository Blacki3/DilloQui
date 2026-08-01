import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function Privacy() {
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
            Informativa sulla <span className="landing-highlight">Privacy</span>
          </h1>
          
          <div className="flat-panel" style={{ padding: 'clamp(20px, 5vw, 40px)' }}>
            <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--b-black)', fontWeight: 500 }}>
              <p>
                <strong>Ultimo aggiornamento: Settembre 2026</strong>
              </p>
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                1. Chi Siamo e Cosa Facciamo
              </h2>
              <p>
                DILLOQUI è una piattaforma indipendente creata <strong>da studenti per gli studenti</strong>. Il nostro scopo è fornire ai Rappresentanti di Classe e d'Istituto uno strumento digitale per raccogliere segnalazioni, dubbi e proposte dai propri compagni. 
                <br /><br />
                <strong>Importante:</strong> DILLOQUI non è gestito da professori, psicologi o personale ATA. È un canale di comunicazione "peer-to-peer" (tra pari) gestito esclusivamente dai Rappresentanti degli Studenti.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                2. L'Anonimato su DilloQui (Pseudo-Anonimato)
              </h2>
              <p>
                Quando invii una segnalazione spuntando la casella "Anonimo", la piattaforma garantisce che <strong>il tuo nome non verrà mai mostrato ai Rappresentanti</strong> che leggono il messaggio. Sulla loro bacheca apparirai semplicemente come "Anonimo".
                <br /><br />
                Tuttavia, per garantire la sicurezza di tutti e prevenire abusi gravi (es. minacce, cyberbullismo, falsi allarmi), il sistema associa internamente la tua segnalazione a un identificativo crittografato (ID Utente). Questo meccanismo tecnico (chiamato <em>Pseudo-anonimato</em>) fa sì che, esclusivamente in caso di indagini per <strong>reati penali o grave pericolo per l'incolumità personale</strong>, l'identità possa essere decriptata e fornita <strong>solo ed esclusivamente alle Forze dell'Ordine o all'Autorità Giudiziaria</strong> dietro formale richiesta.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                3. Quali Dati Raccogliamo e Base Giuridica
              </h2>
              <p>
                Raccogliamo il minimo indispensabile per far funzionare il servizio. Il trattamento si basa sul <strong>legittimo interesse</strong> di garantire la sicurezza informatica e sulla <strong>necessità contrattuale</strong> di fornire il servizio richiesto (erogazione della messaggistica).
              </p>
              <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
                <li><strong>Dati di Autenticazione:</strong> Indirizzo email (usato esclusivamente per l'invio del codice OTP), Nome, Cognome e Classe. L'email non viene mai mostrata agli altri utenti.</li>
                <li><strong>Contenuto delle Segnalazioni:</strong> I testi che scrivi nei report e nei commenti. Ti invitiamo a non inserire dati particolari (es. orientamento sessuale, salute) né nomi di terze persone se non strettamente necessario.</li>
                <li><strong>Dati Tecnici di Navigazione:</strong> Indirizzo IP e User Agent vengono elaborati temporaneamente per prevenire attacchi informatici (DDoS) e abusi.</li>
              </ul>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                4. Titolare e Responsabili del Trattamento (GDPR)
              </h2>
              <p>
                <strong>Titolare del Trattamento:</strong> Ai fini normativi, la singola Box scolastica e i dati in essa contenuti sono gestiti dai Rappresentanti che l'hanno creata (nel ruolo di Titolari autonomi del trattamento dei dati inseriti volontariamente dai compagni). DilloQui opera come fornitore tecnologico dell'infrastruttura.
              </p>
              <p>
                <strong>Responsabili del Trattamento (Sub-Processor):</strong> Per erogare il servizio in sicurezza e velocità, ci affidiamo a infrastrutture cloud leader del settore, che garantiscono la massima compliance al GDPR. In particolare, il database e l'autenticazione sono gestiti tramite <strong>Supabase</strong>, con server fisicamente localizzati nell'Unione Europea (Francoforte, Germania), in ottemperanza ai regolamenti europei sul trasferimento e conservazione dei dati.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                5. Chi ha accesso ai tuoi dati?
              </h2>
              <p>
                <strong>I Rappresentanti (Admin della Box):</strong> Vedono il contenuto delle segnalazioni. Vedono il tuo nome e classe <em>solo</em> se scegli di non usare la modalità anonima. Non hanno mai accesso alla tua email o al tuo ID crittografato.<br />
                <strong>Il Team DILLOQUI:</strong> Ha accesso ai log di sistema esclusivamente per manutenzione tecnica e non legge le conversazioni private se non richiesto dalle Autorità.<br />
                <strong>Autorità Giudiziarie:</strong> In caso di mandato ufficiale per la prevenzione o repressione di reati.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                6. Conservazione dei Dati (Data Retention)
              </h2>
              <p>
                I dati vengono conservati sui server europei di Supabase per il tempo strettamente necessario a erogare il servizio (durata dell'anno scolastico in corso). Al termine dell'anno scolastico, le Box possono essere svuotate dai Rappresentanti. In ogni caso, gli account inattivi e le relative segnalazioni vengono automaticamente eliminati dai nostri sistemi dopo 24 mesi dall'ultimo accesso.
              </p>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 40, marginBottom: 16, textTransform: 'uppercase' }}>
                7. I Tuoi Diritti (Art. 15-22 GDPR)
              </h2>
              <p>
                Il Regolamento Europeo ti garantisce il controllo totale sui tuoi dati personali. In qualsiasi momento hai il diritto di:
              </p>
              <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
                <li><strong>Accesso e Portabilità:</strong> Richiedere una copia dei tuoi dati (puoi farlo autonomamente dalla sezione "Profilo" scaricando il file JSON con tutti i tuoi post).</li>
                <li><strong>Rettifica:</strong> Modificare i tuoi dati personali (es. Nome, Classe) direttamente dal tuo Profilo.</li>
                <li><strong>Diritto all'Oblio (Cancellazione):</strong> Richiedere la cancellazione totale e irreversibile del tuo account e dei tuoi messaggi.</li>
              </ul>
              <p>
                Per esercitare questi diritti, se non riesci a farlo in autonomia tramite l'interfaccia dell'app, puoi contattare i Rappresentanti della tua Box oppure il team di supporto tecnico di DilloQui.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
