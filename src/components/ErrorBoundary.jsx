import { Component } from 'react';

/**
 * Ultima rete di sicurezza dell'interfaccia.
 *
 * Un'eccezione lanciata durante il render smonta l'intero albero React e
 * lascia una pagina bianca, senza un messaggio e senza un modo per
 * ripartire: chi la incontra pensa che il sito sia rotto o offline.
 * Qui l'errore si ferma al confine, resta scritto in console per chi
 * sviluppa, e all'utente arriva qualcosa che si può leggere e da cui si
 * può uscire.
 *
 * Deve essere una classe: i componenti a funzione non hanno un
 * equivalente di componentDidCatch.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // L'utente vede il riquadro, lo sviluppatore lo stack completo
    console.error('Errore non gestito nell\'interfaccia:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          background: 'var(--b-black)',
          color: 'var(--b-white)',
          fontFamily: "'Space Grotesk', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: 'var(--b-cream)',
            color: 'var(--b-black)',
            border: '3px solid var(--b-black)',
            boxShadow: '8px 8px 0 var(--b-yellow)',
            padding: '28px 24px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--b-red)',
            }}
          >
            Errore inatteso
          </p>

          <h1
            style={{
              margin: '10px 0 14px',
              fontSize: '1.6rem',
              fontWeight: 900,
              lineHeight: 1.15,
              textTransform: 'uppercase',
            }}
          >
            Qualcosa si è rotto
          </h1>

          <p style={{ margin: '0 0 22px', fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.5 }}>
            La pagina non è riuscita a caricarsi. I dati che avevi già inviato
            sono al sicuro: nessuna segnalazione viene perduta per un errore
            dell&apos;interfaccia.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: '2px solid var(--b-black)',
                background: 'var(--b-yellow)',
                color: 'var(--b-black)',
                padding: '10px 16px',
                fontWeight: 900,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Ricarica la pagina
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              style={{
                border: '2px solid var(--b-black)',
                background: 'var(--b-white)',
                color: 'var(--b-black)',
                padding: '10px 16px',
                fontWeight: 900,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Torna all&apos;inizio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
