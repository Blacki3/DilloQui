import { useEffect, useRef } from 'react';

/**
 * Esegue un callback a intervalli regolari.
 * Mette in pausa l'esecuzione automaticamente se la scheda del browser è nascosta,
 * riprendendo non appena l'utente torna sulla pagina.
 * Assicura che le chiamate asincrone non si accavallino.
 * 
 * @param {Function} callback Funzione da eseguire (può essere asincrona)
 * @param {number} intervalMs Intervallo in millisecondi
 */
export function usePolling(callback, intervalMs) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!intervalMs) return;

    let timeoutId;
    let isRunning = true;

    const tick = async () => {
      if (!isRunning) return;
      
      if (document.visibilityState === 'visible') {
        try {
          await savedCallback.current();
        } catch (err) {
          console.error('Polling error:', err);
        }
      }
      
      if (isRunning) {
        timeoutId = setTimeout(tick, intervalMs);
      }
    };

    timeoutId = setTimeout(tick, intervalMs);

    // Riprendi il polling immediato se la finestra torna visibile
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        clearTimeout(timeoutId);
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isRunning = false;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs]);
}
