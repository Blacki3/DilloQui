import {
  getAllowedEmailSet,
  getSettings,
  isValidEmail,
  normalizeEmail,
  normalizeSlug,
} from './mockSettings';

// Mock API
export async function requestCode(email, slug) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedSlug = normalizeSlug(slug);
      const settings = getSettings();

      if (!isValidEmail(normalizedEmail)) {
        resolve({ success: false, message: "Email non valida ❌" });
      } else if (!normalizedSlug) {
        resolve({ success: false, message: 'Link Box non valido.' });
      } else if (normalizedSlug !== 'demo' && normalizedSlug !== settings.slug) {
        resolve({ success: false, message: 'Questa Box non è attiva. Verifica il link fornito dalla scuola.' });
      } else if (normalizedSlug !== 'demo' && getAllowedEmailSet().size === 0) {
        resolve({ success: false, message: 'Whitelist vuota: chiedi ai referenti di configurare le email autorizzate.' });
      } else if (normalizedSlug !== 'demo' && !getAllowedEmailSet().has(normalizedEmail)) {
        resolve({ success: false, message: 'Email non autorizzata per questa Box.' });
      } else {
        // Simuliamo che tutte le email valide passino il check per questa fase mock
        resolve({ success: true, message: `Codice inviato per lo sportello ${normalizedSlug.toUpperCase()} ✅` });
      }
    }, 1500);
  });
}

export async function verifyCode(email, code, slug) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalizedSlug = normalizeSlug(slug);
      if (!normalizedSlug) {
        resolve({ success: false, message: 'Link Box non valido.' });
      } else if (normalizedSlug !== 'demo' && normalizedSlug !== getSettings().slug) {
        resolve({ success: false, message: 'Questa Box non è più attiva. Richiedi un link aggiornato.' });
      } else if (code === "123456") {
        resolve({ success: true, token: `mock-session-${normalizedSlug}-${Date.now()}` });
      } else {
        resolve({ success: false, message: "Codice errato o scaduto." });
      }
    }, 1000);
  });
}

export async function sendData(data, sessionToken, slug) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Dati inviati per lo sportello ${slug}:`, data);
      resolve({ success: true });
    }, 1500);
  });
}
