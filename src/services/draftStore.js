// ======================== DRAFT STORE ========================
// Gestisce un archivio di bozze multiplo in localStorage

const DRAFTS_KEY = 'dq_drafts_v3';

const DEMO_DRAFTS = [
  {
    id: 'draft_demo_1',
    titolo: 'Bagni palestra rotti',
    tipo: 'problema',
    problema: "I bagni vicino alla palestra hanno una perdita d'acqua dal lavandino principale e non c'è mai carta. Andrebbero riparati.",
    isPublic: true,
    anonimo: true,
    savedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
  },
  {
    id: 'draft_demo_2',
    titolo: 'Torneo di pallavolo',
    tipo: 'proposta',
    problema: 'Volevo proporre di organizzare un torneo di fine anno...',
    isPublic: false,
    anonimo: false,
    savedAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
  }
];

function getDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(DEMO_DRAFTS));
      return DEMO_DRAFTS;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setDrafts(drafts) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {}
}

export function getAllDrafts() {
  return getDrafts().sort((a, b) => b.savedAt - a.savedAt);
}

export function getDraftById(id) {
  return getDrafts().find(d => d.id === id) || null;
}

export function saveDraft({ id, titolo, tipo, problema, isPublic, anonimo }) {
  const drafts = getDrafts();
  const draftId = id || `draft_${Date.now()}`;
  const existing = drafts.findIndex(d => d.id === draftId);
  const draft = {
    id: draftId,
    titolo,
    tipo,
    problema,
    isPublic,
    anonimo,
    savedAt: Date.now(),
  };
  if (existing >= 0) {
    drafts[existing] = draft;
  } else {
    drafts.unshift(draft);
  }
  setDrafts(drafts);
  return draftId;
}

export function deleteDraft(id) {
  setDrafts(getDrafts().filter(d => d.id !== id));
}

export function countDrafts() {
  return getDrafts().length;
}

export function formatDraftDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return `Oggi ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const DEMO_DRAFTS_KEY = 'dq_demo_drafts_v2_seeded';

export function seedDemoDrafts() {
  // Evita di riseminare ogni volta
  if (localStorage.getItem(DEMO_DRAFTS_KEY)) return;

  const now = Date.now();
  const demoDrafts = [
    {
      id: 'draft_demo_1',
      titolo: 'Problemi con il riscaldamento in aula 3B',
      tipo: 'Un problema',
      problema: 'Da novembre il termosifone dell\'aula 3B non funziona correttamente. La temperatura scende sotto i 15 gradi nelle giornate più fredde e molti compagni stanno avendo difficoltà a concentrarsi. Ho già segnalato la cosa al professore di turno ma non è cambiato nulla.',
      isPublic: false,
      anonimo: true,
      savedAt: now - 1000 * 60 * 30, // 30 minuti fa
    },
    {
      id: 'draft_demo_2',
      titolo: 'Proposta: orario flessibile per l\'ultimo giorno di scuola',
      tipo: 'Una proposta',
      problema: 'Propongo di organizzare l\'ultimo giorno di scuola con un programma alleggerito: mattinata libera con attività proposte dagli studenti, come sport, musica o cineforum. Potremmo votare tra le classi cosa fare.',
      isPublic: true,
      anonimo: false,
      savedAt: now - 1000 * 60 * 60 * 3, // 3 ore fa
    },
    {
      id: 'draft_demo_3',
      titolo: 'Wi-fi in palestra?',
      tipo: 'Un dubbio',
      problema: 'Sarebbe possibile estendere la copertura del wi-fi scolastico anche alla palestra e ai corridoi del piano terra? Spesso durante le ore libere non riusciamo a connetterci per fare ricerche.',
      isPublic: true,
      anonimo: true,
      savedAt: now - 1000 * 60 * 60 * 24, // ieri
    },
  ];

  const existing = getDrafts();
  const existingIds = new Set(existing.map(d => d.id));
  const toAdd = demoDrafts.filter(d => !existingIds.has(d.id));
  setDrafts([...toAdd, ...existing]);
  localStorage.setItem(DEMO_DRAFTS_KEY, '1');
}
