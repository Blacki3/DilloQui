import { useSyncExternalStore } from 'react';
import { getSettings } from './mockSettings';

// Store mock condiviso per la demo.
// Unica fonte di verita per segnalazioni, chat, voti e commenti.
// Persistenza su localStorage cosi i dati restano coerenti tra le pagine
// (NewReport -> ReportsList / MyReports / Forum) anche dopo un refresh.

// v4: seed esteso su ~30 giorni (per popolare la vista "Mensile" con tutti e 5
// i bucket settimanali) con la settimana corrente ben popolata e, per oggi,
// segnalazioni distribuite su piu fasce orarie (per la vista "Giornaliero").
// Alziamo la versione della chiave per invalidare le cache v1/v2/v3 e
// rigenerare i dati nuovi.
const STORAGE_KEY = 'dq_reports_v4';
const ADMIN_READ_KEY = 'dq_admin_read_v1';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function formatDate(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Timestamp di N giorni fa (a un'ora fissa) cosi il seed cade sempre
// nella finestra "ultimi 7 giorni" della dashboard, qualunque sia la data odierna.
function daysAgo(n, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.getTime();
}

function relTime(n) {
  if (n <= 0) return 'Oggi';
  if (n === 1) return 'Ieri';
  return `${n} giorni fa`;
}

// Etichette categoria: lo store usa la chiave canonica minuscola,
// le viste possono mostrare la versione "bella".
export const TYPE_LABEL = { problema: 'Problema', proposta: 'Proposta', dubbio: 'Dubbio' };
export const TYPE_BADGE_CLASS = {
  problema: 'badge badge-problema',
  proposta: 'badge badge-proposta',
  dubbio: 'badge badge-dubbio',
};

function formatGenericTypeLabel(type) {
  const raw = String(type || '').trim();
  if (!raw) return 'Altro';
  return raw
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getTypeLabel(type) {
  const key = String(type || '').toLowerCase();
  if (TYPE_LABEL[key]) return TYPE_LABEL[key];
  const settingsMatch = getSettings().categories.find((category) => category.toLowerCase() === key);
  if (settingsMatch) return settingsMatch;
  return formatGenericTypeLabel(type);
}

export function getTypeBadgeClass(type) {
  const key = String(type || '').toLowerCase();
  return TYPE_BADGE_CLASS[key] || 'badge badge-dubbio';
}

// Stati canonici condivisi tra vista admin e vista studente.
export const STATUS = {
  new: 'new',
  in_review: 'in_review',
  resolved: 'resolved',
  closed: 'closed',
};

export const STATUS_LABEL = {
  [STATUS.new]: 'Aperta',
  [STATUS.in_review]: 'In Revisione',
  [STATUS.resolved]: 'Risolta',
  [STATUS.closed]: 'Chiusa',
};

export const STATUS_BADGE_CLASS = {
  [STATUS.new]: 'badge badge-status-new',
  [STATUS.in_review]: 'badge badge-status-review',
  [STATUS.resolved]: 'badge badge-status-resolved',
  [STATUS.closed]: 'badge badge-status-read',
};

// Mostra "Anonimo" all'admin/forum se la segnalazione e anonima.
export function displayAuthor(report) {
  return report.anonimo ? 'Anonimo' : report.authorName;
}

// Pool di contenuti realistici (contesto scolastico italiano) usati per
// generare un seed ricco ma deterministico.
const STUDENT_NAMES = [
  'Giulia R.', 'Marco T.', 'Sofia L.', 'Luca M.', 'Anna B.', 'Mario Rossi',
  'Francesca P.', 'Davide C.', 'Chiara V.', 'Matteo G.', 'Elena S.',
  'Alessandro F.', 'Martina D.', 'Lorenzo B.',
];

const ADMIN_NAMES = ['Admin Rossi', 'Admin Bianchi', 'Prof.ssa Verdi'];

const CONTENT_POOL = {
  problema: [
    { title: 'Wi-Fi assente in palestra', content: 'Nella palestra non prende il Wi-Fi e non riusciamo a usare i tablet durante educazione fisica.' },
    { title: 'Bagni del secondo piano senza sapone', content: 'Da una settimana i dispenser del sapone nei bagni del secondo piano sono vuoti.' },
    { title: 'Distributore snack guasto', content: 'Il distributore automatico al piano terra trattiene le monete senza erogare nulla.' },
    { title: 'Aula 2B troppo rumorosa', content: 'I lavori in cortile rendono quasi impossibile seguire le lezioni in 2B.' },
    { title: 'Proiettore rotto in aula magna', content: 'Il proiettore dell\'aula magna non si accende e le presentazioni sono ferme.' },
    { title: 'Mensa: code troppo lunghe', content: 'All\'intervallo lungo la coda alla mensa fa perdere metà della pausa.' },
    { title: 'Riscaldamento eccessivo in 3A', content: 'In 3A i termosifoni restano al massimo e fa caldissimo anche in pieno inverno.' },
    { title: 'Armadietti danneggiati', content: 'Diversi armadietti nello spogliatoio non chiudono più a chiave.' },
  ],
  proposta: [
    { title: 'Distributore d\'acqua alla spina', content: 'Installare un erogatore d\'acqua per ridurre le bottigliette di plastica.' },
    { title: 'Gruppo di studio pomeridiano', content: 'Organizzare un gruppo di studio guidato per matematica e fisica due volte a settimana.' },
    { title: 'Rastrelliera coperta per le bici', content: 'Una rastrelliera coperta incoraggerebbe più studenti a venire a scuola in bicicletta.' },
    { title: 'Giornata dello sport', content: 'Proporre una giornata dedicata a tornei sportivi tra le classi.' },
    { title: 'Bacheca digitale eventi', content: 'Uno schermo all\'ingresso con gli eventi e gli avvisi della settimana.' },
    { title: 'Raccolta differenziata in classe', content: 'Aggiungere contenitori per carta e plastica in ogni aula.' },
    { title: 'Club di lettura', content: 'Creare un club di lettura che si incontri in biblioteca il venerdì.' },
    { title: 'Laboratorio di robotica', content: 'Avviare un corso pomeridiano facoltativo di robotica e coding.' },
  ],
  dubbio: [
    { title: 'Date dei colloqui con i genitori', content: 'Non è chiaro quando si terranno i colloqui del secondo quadrimestre.' },
    { title: 'Regole per le assenze giustificate', content: 'Quante assenze possiamo fare prima che incida sulla valutazione finale?' },
    { title: 'Uscita anticipata: come funziona?', content: 'Qual è la procedura per richiedere l\'uscita anticipata autorizzata?' },
    { title: 'Gita di istruzione confermata?', content: 'La gita di primavera è stata confermata o è ancora in forse?' },
    { title: 'Recupero debiti formativi', content: 'Quando inizieranno i corsi di recupero per i debiti del primo quadrimestre?' },
    { title: 'Orario ricevimento docenti', content: 'Dove posso trovare l\'orario aggiornato di ricevimento dei professori?' },
    { title: 'Accesso alla biblioteca', content: 'La biblioteca resta aperta anche durante l\'intervallo lungo?' },
    { title: 'Certificato per attività sportiva', content: 'Serve il certificato medico per partecipare ai tornei interni?' },
  ],
};

const ADMIN_REPLIES = [
  'Grazie per la segnalazione, abbiamo girato la richiesta al personale competente.',
  'Ci stiamo occupando del problema, ti aggiorneremo a breve.',
  'Ottima proposta! La porteremo al prossimo consiglio d\'istituto.',
  'Risolto: la situazione è stata sistemata, grazie per la pazienza.',
  'Confermiamo che l\'intervento è stato programmato per questa settimana.',
  'Trovi tutte le informazioni aggiornate nella bacheca all\'ingresso.',
];

const COMMENT_POOL = [
  'Verissimo, è capitato anche a me.',
  'Quoto, andrebbe sistemato al più presto.',
  'Bella idea, mi unisco volentieri!',
  'Speriamo si muovano in fretta.',
  'Anche nella mia classe stessa cosa.',
  'Era ora che qualcuno lo dicesse.',
  'Concordo pienamente.',
  'Sarebbe davvero utile per tutti.',
];

// Statuses pesati: ~70% risolte/chiuse per un tasso di risoluzione "sano",
// il resto tra nuove e in revisione.
const STATUS_WEIGHTED = [
  'resolved', 'resolved', 'resolved', 'resolved',
  'closed', 'closed',
  'in_review', 'in_review',
  'new', 'new',
];

// Piano di distribuzione: quante segnalazioni "filler" creare per ciascun
// giorno (chiave = giorni fa rispetto a oggi). La settimana corrente (0-6) e
// densa per la vista "Settimanale"; i giorni 7-29 sono piu radi ma presenti su
// tutti e 5 i bucket settimanali della vista "Mensile" (5 bucket x 6 giorni).
// Conteggi variabili cosi i grafici mostrano valori diversi (non piatti).
const FILLER_DAY_COUNTS = {
  // Settimana corrente (densa).
  0: 6, 1: 6, 2: 4, 3: 6, 4: 3, 5: 5, 6: 4,
  // Bucket "Sett. 4" (giorni 7-11).
  7: 3, 8: 2, 9: 3, 10: 1, 11: 2,
  // Bucket "Sett. 3" (giorni 12-17).
  12: 2, 13: 3, 14: 1, 15: 2, 16: 3, 17: 1,
  // Bucket "Sett. 2" (giorni 18-23).
  18: 2, 19: 1, 20: 3, 21: 2, 22: 1, 23: 2,
  // Bucket "Sett. 1" (giorni 24-29, il piu vecchio).
  24: 1, 25: 2, 26: 1, 27: 2, 28: 1, 29: 1,
};

// Espande FILLER_DAY_COUNTS in una lista ordinata dal piu recente al piu vecchio.
// Ogni voce porta lo "slot" (indice progressivo nel giorno) usato per variare l'ora.
const FILLER_PLAN = Object.keys(FILLER_DAY_COUNTS)
  .map(Number)
  .sort((a, b) => a - b)
  .flatMap((offset) =>
    Array.from({ length: FILLER_DAY_COUNTS[offset] }, (_, slot) => ({ offset, slot })),
  );

// Indici (nel piano espanso) forzati come segnalazioni dell'utente ("Tu") cosi
// "Le mie segnalazioni" resta popolata in tutte le finestre (oggi, settimana,
// mese) oltre alle anchor curate.
const MINE_FILLER_INDEXES = new Set([3, 17, 47]);

// Il seed e costruito a ogni avvio con date relative a "oggi" (ultimi 7 giorni),
// cosi la dashboard mostra sempre un grafico con dati e numeri coerenti.
// La generazione e deterministica (RNG con seed costante): stesso output a ogni
// load, niente disordine di idratazione o ordini che cambiano tra refresh.
function buildSeed() {
  // offset = giorni fa rispetto a oggi; copre tutta la finestra dei 7 giorni.
  const dated = (offset, hour) => {
    const createdAt = daysAgo(offset, hour);
    return { createdAt, date: formatDate(new Date(createdAt)), time: relTime(offset) };
  };

  // RNG deterministico (LCG) con seed fisso.
  let s = 0x9e3779b9 >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const range = (min, max) => min + Math.floor(rnd() * (max - min + 1));

  // Anchor curate: garantiscono coerenza per MyReports (mine + risposta admin)
  // e per la Bacheca (post pubblici con like e commenti).
  const anchors = [
    {
      id: 101,
      type: 'problema',
      title: 'Problema con il tutor di Matematica',
      content: 'Il tutor di matematica del pomeriggio salta spesso le lezioni senza avvisare.',
      isPublic: false,
      anonimo: false,
      authorName: 'Tu',
      mine: true,
      status: 'in_review',
      ...dated(6, 10),
      chat: [
        { id: 1, author: 'Admin Rossi', isAdmin: true, text: 'Stiamo parlando con il docente interessato, ti aggiorneremo presto.', time: 'Ieri' },
        { id: 2, author: 'Tu', isAdmin: false, text: 'Grazie, ma succede da tre settimane — serve una risposta concreta.', time: '2 ore fa' },
      ],
      likes: 0,
      userVote: 0,
      comments: [],
    },
    {
      id: 102,
      type: 'proposta',
      title: 'Proposta per un club di scacchi',
      content: 'Mi piacerebbe creare un club di scacchi che si ritrovi una volta a settimana in biblioteca.',
      isPublic: true,
      anonimo: false,
      authorName: 'Tu',
      mine: true,
      status: 'resolved',
      ...dated(5, 11),
      chat: [
        { id: 1, author: 'Admin Bianchi', isAdmin: true, text: 'Ottima idea! La proposta e stata approvata. Controlla la bacheca.', time: '5 giorni fa' },
      ],
      likes: 18,
      userVote: 0,
      comments: [
        { id: 1, author: 'Anonimo', text: 'Bellissima idea, mi iscrivo subito!', time: '4 giorni fa' },
      ],
    },
    {
      id: 103,
      type: 'dubbio',
      title: 'Dubbio sulle date degli esami',
      content: 'Non e chiaro se le date degli esami di recupero siano gia state confermate. Qualcuno ha informazioni?',
      isPublic: true,
      anonimo: true,
      authorName: 'Tu',
      mine: true,
      status: 'in_review',
      ...dated(4, 9),
      chat: [],
      likes: 3,
      userVote: 0,
      comments: [],
    },
    {
      id: 104,
      type: 'proposta',
      title: 'Distributore acqua potabile',
      content: 'Sarebbe fantastico installare un distributore d\'acqua potabile per ridurre la plastica delle bottigliette in classe.',
      isPublic: true,
      anonimo: true,
      authorName: 'Luca M.',
      mine: false,
      status: 'resolved',
      ...dated(2, 13),
      chat: [
        { id: 1, author: 'Prof.ssa Verdi', isAdmin: true, text: 'Erogatore installato al piano terra, grazie per la proposta!', time: 'Ieri' },
      ],
      likes: 45,
      userVote: 0,
      comments: [
        { id: 1, author: 'Anonimo', text: 'Sono d\'accordo, troppe bottigliette di plastica!', time: '1 ora fa' },
        { id: 2, author: 'Anonimo', text: 'Magari uno per piano.', time: '40 min fa' },
      ],
    },
    {
      id: 105,
      type: 'problema',
      title: 'Riscaldamento rotto al piano terra',
      content: 'Nelle aule del piano terra fa freddissimo da due giorni. Qualcuno ha avvisato i tecnici?',
      isPublic: true,
      anonimo: false,
      authorName: 'Mario Rossi',
      mine: false,
      status: 'in_review',
      ...dated(1, 9),
      chat: [
        { id: 1, author: 'Mario Rossi', isAdmin: false, text: 'I tecnici sono passati? In 1A fa ancora freddissimo.', time: '1 ora fa' },
      ],
      likes: 89,
      userVote: 0,
      comments: [
        { id: 1, author: 'Anonimo', text: 'Confermo, in 1A si gela.', time: '5 ore fa' },
        { id: 2, author: 'Anonimo', text: 'Ho avvisato la segreteria stamattina.', time: '3 ore fa' },
      ],
    },
    {
      id: 106,
      type: 'proposta',
      title: 'Nuovi cestini per il riciclaggio',
      content: 'Propongo di aggiungere cestini per la raccolta differenziata della carta in ogni piano.',
      isPublic: true,
      anonimo: false,
      authorName: 'Anna B.',
      mine: false,
      status: 'new',
      ...dated(0, 8),
      chat: [],
      likes: 8,
      userVote: 0,
      comments: [],
    },
  ];

  const types = ['problema', 'proposta', 'dubbio'];

  // Ora corrente: le segnalazioni di "oggi" vengono distribuite tra le 0 e
  // l'ora attuale, cosi la vista "Giornaliero" mostra una distribuzione
  // intraday su piu fasce senza generare timestamp nel futuro.
  const nowHour = new Date().getHours();
  const todayCount = FILLER_DAY_COUNTS[0] || 1;

  const filler = FILLER_PLAN.map(({ offset, slot }, i) => {
    const type = pick(types);
    const template = pick(CONTENT_POOL[type]);
    // Oggi: ore spalmate su [0, nowHour]; altri giorni: ore diurne variabili (8-16).
    const hour = offset === 0
      ? Math.min(nowHour, Math.round(((slot + 1) / (todayCount + 1)) * Math.max(nowHour, 1)))
      : 8 + ((offset + slot) % 9);
    const isMine = MINE_FILLER_INDEXES.has(i);
    const anonimo = isMine ? false : rnd() < 0.35;
    const authorName = isMine ? 'Tu' : pick(STUDENT_NAMES);
    const isPublic = isMine ? rnd() < 0.6 : rnd() < 0.7;
    const status = isMine ? pick(['resolved', 'in_review', 'closed']) : pick(STATUS_WEIGHTED);
    const replyOffset = Math.max(0, offset - 1);

    // Chat: le segnalazioni gestite (non "new") possono avere una risposta admin.
    const hasAdminReply = status !== 'new' && (isMine || rnd() < 0.55);
    const chat = hasAdminReply
      ? [{ id: 1, author: pick(ADMIN_NAMES), isAdmin: true, text: pick(ADMIN_REPLIES), time: relTime(replyOffset) }]
      : [];

    // Commenti solo per i post pubblici (compaiono in Bacheca / PostDetail).
    const commentCount = isPublic ? range(0, 3) : 0;
    const comments = Array.from({ length: commentCount }, (_, c) => ({
      id: c + 1,
      author: rnd() < 0.6 ? 'Anonimo' : pick(STUDENT_NAMES),
      text: pick(COMMENT_POOL),
      time: relTime(replyOffset),
    }));

    return {
      id: 200 + i,
      type,
      title: template.title,
      content: template.content,
      isPublic,
      anonimo,
      authorName,
      mine: isMine,
      status,
      ...dated(offset, hour),
      chat,
      likes: isPublic ? range(2, 130) : 0,
      userVote: 0,
      comments,
    };
  });

  return [...anchors, ...filler];
}

const seed = buildSeed();

function loadAdminReadMap() {
  try {
    const raw = localStorage.getItem(ADMIN_READ_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignora JSON corrotto
  }
  return {};
}

let adminReadMap = loadAdminReadMap();
let adminReadVersion = 0;

function persistAdminReadMap() {
  try {
    localStorage.setItem(ADMIN_READ_KEY, JSON.stringify(adminReadMap));
  } catch {
    // ignora errori di quota/privacy
  }
}

// Arricchisce anchor demo con messaggi studente per badge "Nuova risposta"
// anche su installazioni con dati gia persistiti in localStorage.
function patchDemoUnreadReports(data) {
  if (!Array.isArray(data)) return data;
  const byId = new Map(data.map((r) => [r.id, r]));
  const demoPatches = [
    {
      id: 101,
      chat: [
        { id: 1, author: 'Admin Rossi', isAdmin: true, text: 'Stiamo parlando con il docente interessato, ti aggiorneremo presto.', time: 'Ieri' },
        { id: 2, author: 'Tu', isAdmin: false, text: 'Grazie, ma succede da tre settimane — serve una risposta concreta.', time: '2 ore fa' },
      ],
    },
    {
      id: 105,
      chat: [
        { id: 1, author: 'Mario Rossi', isAdmin: false, text: 'I tecnici sono passati? In 1A fa ancora freddissimo.', time: '1 ora fa' },
      ],
    },
  ];

  let changed = false;
  for (const patch of demoPatches) {
    const report = byId.get(patch.id);
    if (!report) continue;
    const lastMsg = report.chat?.[report.chat.length - 1];
    const needsPatch = !lastMsg || lastMsg.isAdmin || report.chat.length < patch.chat.length;
    if (needsPatch) {
      byId.set(patch.id, { ...report, chat: patch.chat });
      changed = true;
    }
  }
  return changed ? data.map((r) => byId.get(r.id) || r) : data;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const patched = patchDemoUnreadReports(parsed);
        if (patched !== parsed) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(patched));
          } catch {
            // ignora errori di quota/privacy
          }
        }
        return patched;
      }
    }
  } catch {
    // localStorage non disponibile o JSON corrotto: usa il seed.
  }
  return seed;
}

// Stato modulo: riferimento stabile finche non muta (richiesto da useSyncExternalStore).
let reports = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // ignora errori di quota/privacy
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return reports;
}

export function getReports() {
  return reports;
}

export function addReport({ type, title, content, isPublic, anonimo, authorName = 'Tu' }) {
  const now = new Date();
  const report = {
    id: Date.now(),
    type,
    title,
    content,
    isPublic: !!isPublic,
    anonimo: !!anonimo,
    authorName,
    mine: true,
    status: STATUS.new,
    date: formatDate(now),
    time: 'Adesso',
    createdAt: now.getTime(),
    chat: [],
    likes: 0,
    userVote: 0,
    comments: [],
  };
  reports = [report, ...reports];
  emit();
  return report;
}

export function addMessage(reportId, { text, isAdmin, author }) {
  reports = reports.map((r) => {
    if (r.id !== reportId) return r;
    const msg = { id: Date.now(), author, isAdmin: !!isAdmin, text, time: 'Adesso' };
    const status = isAdmin && r.status === STATUS.new ? STATUS.in_review : r.status;
    return { ...r, chat: [...r.chat, msg], status };
  });
  emit();
}

export function setStatus(reportId, status) {
  reports = reports.map((r) => (r.id === reportId ? { ...r, status } : r));
  emit();
}

export function markReportRead(reportId) {
  adminReadMap[String(reportId)] = Date.now();
  persistAdminReadMap();
  adminReadVersion += 1;
  listeners.forEach((l) => l());
}

export function hasUnreadForAdmin(report) {
  if (!report) return false;
  const readAt = adminReadMap[String(report.id)] || 0;
  if (!readAt) return true;
  const chat = report.chat || [];
  if (chat.length === 0) return false;
  const lastMsg = chat[chat.length - 1];
  if (lastMsg.isAdmin) return false;
  return readAt < lastMsg.id;
}

export function countUnreadForAdmin(reportsList) {
  return (reportsList || []).filter(hasUnreadForAdmin).length;
}

export function needsAdminAttention(report) {
  if (!report) return false;
  if (report.status === STATUS.new) return true;
  if (report.status === STATUS.in_review) return hasUnreadForAdmin(report);
  return false;
}

export function voteReport(reportId, value) {
  reports = reports.map((r) => {
    if (r.id !== reportId) return r;
    if (r.userVote === value) return { ...r, likes: r.likes - value, userVote: 0 };
    return { ...r, likes: r.likes + value - r.userVote, userVote: value };
  });
  emit();
}

export function addComment(reportId, { text, author = 'Tu' }) {
  reports = reports.map((r) => {
    if (r.id !== reportId) return r;
    const c = { id: Date.now(), author, text, time: 'Adesso' };
    return { ...r, comments: [c, ...r.comments] };
  });
  emit();
}

export function useReports() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useAdminReadVersion() {
  return useSyncExternalStore(subscribe, () => adminReadVersion);
}

export function useUnreadReportCount() {
  const reportsList = useReports();
  useAdminReadVersion();
  return countUnreadForAdmin(reportsList);
}

export function useReport(id) {
  const all = useReports();
  return all.find((r) => String(r.id) === String(id));
}
