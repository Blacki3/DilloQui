const STUDENT_STORAGE_KEY = 'dq_student_profile_v1';
const ADMIN_STORAGE_KEY = 'dq_admin_profile_v1';

const defaultStudentProfile = {
  email: 'student@scuola.edu.it',
  nome: 'Mario',
  cognome: 'Rossi',
  classe: '3B',
  notifications: false,
  defaultAnon: true,
};

const defaultAdminProfile = {
  email: 'admin@scuola.edu.it',
  nome: 'Admin',
  cognome: 'Scuola',
  notifications: true,
};

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora errori storage in ambiente mock.
  }
}

function normalizeStudentProfile(raw = {}) {
  return {
    email: String(raw.email || defaultStudentProfile.email).trim().toLowerCase(),
    nome: String(raw.nome || defaultStudentProfile.nome).trim(),
    cognome: String(raw.cognome || defaultStudentProfile.cognome).trim(),
    classe: String(raw.classe || '').trim(),
    notifications: typeof raw.notifications === 'boolean' ? raw.notifications : defaultStudentProfile.notifications,
    defaultAnon: typeof raw.defaultAnon === 'boolean' ? raw.defaultAnon : defaultStudentProfile.defaultAnon,
  };
}

function normalizeAdminProfile(raw = {}) {
  return {
    email: String(raw.email || defaultAdminProfile.email).trim().toLowerCase(),
    nome: String(raw.nome || defaultAdminProfile.nome).trim(),
    cognome: String(raw.cognome || defaultAdminProfile.cognome).trim(),
    notifications: typeof raw.notifications === 'boolean' ? raw.notifications : defaultAdminProfile.notifications,
  };
}

export function getStudentProfile() {
  const stored = safeRead(STUDENT_STORAGE_KEY);
  return normalizeStudentProfile(stored || defaultStudentProfile);
}

export function saveStudentProfile(next) {
  const normalized = normalizeStudentProfile(next);
  safeWrite(STUDENT_STORAGE_KEY, normalized);
  return normalized;
}

export function patchStudentProfile(partial = {}) {
  return saveStudentProfile({ ...getStudentProfile(), ...partial });
}

export function getAdminProfile() {
  const stored = safeRead(ADMIN_STORAGE_KEY);
  return normalizeAdminProfile(stored || defaultAdminProfile);
}

export function saveAdminProfile(next) {
  const normalized = normalizeAdminProfile(next);
  safeWrite(ADMIN_STORAGE_KEY, normalized);
  return normalized;
}

export function patchAdminProfile(partial = {}) {
  return saveAdminProfile({ ...getAdminProfile(), ...partial });
}
