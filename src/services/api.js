// Mock API
export async function requestCode(email, slug) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!email.includes("@")) {
        resolve({ success: false, message: "Email non valida ❌" });
      } else {
        // Simuliamo che tutte le email valide passino il check per questa fase mock
        resolve({ success: true, message: `Codice inviato per lo sportello ${slug.toUpperCase()} ✅` });
      }
    }, 1500);
  });
}

export async function verifyCode(email, code, slug) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (code === "123456") {
        resolve({ success: true, token: `mock-session-${slug}-${Date.now()}` });
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
