// ======================== DRAFT STORE ========================
// Gestisce un archivio di bozze multiplo in localStorage, scoped per box slug.

const DRAFTS_KEY_LEGACY = 'dq_drafts_v3';
const DRAFTS_KEY_PREFIX = 'dq_drafts_v3_';

function draftsKey(slug) {
  const s = String(slug || 'demo').toLowerCase().trim() || 'demo';
  return `${DRAFTS_KEY_PREFIX}${s}`;
}

const DEMO_DRAFTS = [
  {
    id: 'draft_demo_1',
    titolo: 'Bagni palestra rotti',
    tipo: 'problema',
    problema: "I bagni vicino alla palestra hanno una perdita d'acqua dal lavandino principale e non c'è mai carta. Andrebbero riparati.",
    isPublic: true,
    anonimo: true,
    boxSlug: 'demo',
    savedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
  },
  {
    id: 'draft_demo_2',
    titolo: 'Torneo di pallavolo',
    tipo: 'proposta',
    problema: 'Volevo proporre di organizzare un torneo di fine anno...',
    isPublic: false,
    anonimo: false,
    boxSlug: 'demo',
    savedAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
  }
];

function migrateLegacyOnce(slug) {
  const key = draftsKey(slug);
  try {
    if (localStorage.getItem(key)) return;
    const legacy = localStorage.getItem(DRAFTS_KEY_LEGACY);
    if (!legacy) return;
    const parsed = JSON.parse(legacy);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    // Migra solo verso la box demo (o slug corrente se è la prima lettura):
    // le bozze legacy non avevano boxSlug → le attribuiamo allo slug richiesto una sola volta.
    const migrated = parsed.map((d) => ({
      ...d,
      boxSlug: d.boxSlug || slug || 'demo',
    }));
    localStorage.setItem(key, JSON.stringify(migrated));
    // Rimuove la chiave legacy dopo la prima migrazione riuscita
    localStorage.removeItem(DRAFTS_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

function getDrafts(slug) {
  const s = String(slug || 'demo').toLowerCase().trim() || 'demo';
  migrateLegacyOnce(s);
  const key = draftsKey(s);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (s === 'demo') {
        localStorage.setItem(key, JSON.stringify(DEMO_DRAFTS));
        return DEMO_DRAFTS;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setDrafts(slug, drafts) {
  try {
    localStorage.setItem(draftsKey(slug), JSON.stringify(drafts));
  } catch {}
}

export function getAllDrafts(slug = 'demo') {
  return getDrafts(slug).sort((a, b) => b.savedAt - a.savedAt);
}

export function getDraftById(id, slug = 'demo') {
  return getDrafts(slug).find(d => d.id === id) || null;
}

export function saveDraft({ id, titolo, tipo, problema, isPublic, anonimo, boxSlug = 'demo' }) {
  const slug = String(boxSlug || 'demo').toLowerCase().trim() || 'demo';
  const drafts = getDrafts(slug);
  const draftId = id || `draft_${Date.now()}`;
  const existing = drafts.findIndex(d => d.id === draftId);
  const draft = {
    id: draftId,
    titolo,
    tipo,
    problema,
    isPublic,
    anonimo,
    boxSlug: slug,
    savedAt: Date.now(),
  };
  if (existing >= 0) {
    drafts[existing] = draft;
  } else {
    drafts.unshift(draft);
  }
  setDrafts(slug, drafts);
  return draftId;
}

export function deleteDraft(id, slug = 'demo') {
  const s = String(slug || 'demo').toLowerCase().trim() || 'demo';
  setDrafts(s, getDrafts(s).filter(d => d.id !== id));
}

export function countDrafts(slug = 'demo') {
  return getDrafts(slug).length;
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
      boxSlug: 'demo',
      savedAt: now - 1000 * 60 * 30, // 30 minuti fa
    },
    {
      id: 'draft_demo_2',
      titolo: 'Proposta: orario flessibile per l\'ultimo giorno di scuola',
      tipo: 'Una proposta',
      problema: 'Propongo di organizzare l\'ultimo giorno di scuola con un programma alleggerito: mattinata libera con attività proposte dagli studenti, come sport, musica o cineforum. Potremmo votare tra le classi cosa fare.',
      isPublic: true,
      anonimo: false,
      boxSlug: 'demo',
      savedAt: now - 1000 * 60 * 60 * 3, // 3 ore fa
    },
    {
      id: 'draft_demo_3',
      titolo: 'Wi-fi in palestra?',
      tipo: 'Un dubbio',
      problema: 'Sarebbe possibile estendere la copertura del wi-fi scolastico anche alla palestra e ai corridoi del piano terra? Spesso durante le ore libere non riusciamo a connetterci per fare ricerche.',
      isPublic: true,
      anonimo: true,
      boxSlug: 'demo',
      savedAt: now - 1000 * 60 * 60 * 24, // ieri
    },
  ];

  const existing = getDrafts('demo');
  const existingIds = new Set(existing.map(d => d.id));
  const toAdd = demoDrafts.filter(d => !existingIds.has(d.id));
  setDrafts('demo', [...toAdd, ...existing]);
  localStorage.setItem(DEMO_DRAFTS_KEY, '1');
}
