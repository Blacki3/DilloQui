import { useEffect, useRef } from 'react';

const FOCUSABILI = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Comportamento da finestra di dialogo: Esc chiude, il Tab gira dentro la
 * modale invece di finire sulla pagina sotto, e alla chiusura il focus
 * torna dov'era. Senza, chi naviga da tastiera o con uno screen reader
 * esce dalla modale senza accorgersene e continua a premere Invio su
 * elementi che non vede più.
 *
 * Restituisce la ref da mettere sul contenitore, che deve avere tabIndex={-1}
 * per poter ricevere il focus quando dentro non c'è niente di focusabile.
 */
export function useDialog(isOpen, onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const node = ref.current;
    if (!node) return;

    const precedente = document.activeElement;

    // Gli elementi nascosti hanno offsetParent nullo: entrarci con il Tab
    // manderebbe il focus in un punto che l'utente non vede.
    const elenco = () =>
      Array.from(node.querySelectorAll(FOCUSABILI)).filter((el) => el.offsetParent !== null);

    const primo = elenco()[0];
    (primo || node).focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = elenco();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const inizio = items[0];
      const fine = items[items.length - 1];

      if (e.shiftKey && document.activeElement === inizio) {
        e.preventDefault();
        fine.focus();
      } else if (!e.shiftKey && document.activeElement === fine) {
        e.preventDefault();
        inizio.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (precedente && typeof precedente.focus === 'function') precedente.focus();
    };
  }, [isOpen]);

  return ref;
}
