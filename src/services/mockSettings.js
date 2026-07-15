const STORAGE_KEY = 'dq_settings_v1';

const defaultSettings = {
  slug: 'liceo-ponti',
  emailFilterMode: 'exact', // 'exact' o 'domain'
  whitelist: [],
  requireClass: true,
  categories: ['Un problema', 'Una proposta', 'Un dubbio'],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function isValidEmail(email = '') {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function normalizeSlug(slug = '') {
  const sanitized = String(slug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized;
}

function normalizeWhitelist(rawWhitelist) {
  const source = Array.isArray(rawWhitelist) ? rawWhitelist : [];
  const valid = source
    .map(normalizeEmail)
    .filter(Boolean); // Accetta sia email che domini (es. @istituto.it)
  return Array.from(new Set(valid));
}

function normalizeCategories(rawCategories) {
  if (!Array.isArray(rawCategories)) return defaultSettings.categories;
  const cleaned = rawCategories
    .map((name) => String(name || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  return cleaned.length ? Array.from(new Set(cleaned)) : defaultSettings.categories;
}

function normalize(raw = {}) {
  const fallback = defaultSettings;
  const slug = normalizeSlug(raw.slug || fallback.slug) || fallback.slug;
  const emailFilterMode = raw.emailFilterMode === 'domain' ? 'domain' : 'exact';
  const whitelistSource = Array.isArray(raw.whitelist) ? raw.whitelist : fallback.whitelist;
  const whitelist = normalizeWhitelist(whitelistSource);
  const categories = normalizeCategories(raw.categories);
  return {
    slug,
    emailFilterMode,
    whitelist,
    requireClass: typeof raw.requireClass === 'boolean' ? raw.requireClass : fallback.requireClass,
    categories,
  };
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalize(defaultSettings);
    return normalize(JSON.parse(raw));
  } catch {
    return normalize(defaultSettings);
  }
}

export function saveSettings(nextSettings) {
  const normalized = normalize(nextSettings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function getAllowedEmailSet() {
  return new Set(getSettings().whitelist);
}

export function isWhitelistEnabled() {
  return getSettings().whitelist.length > 0;
}

export function isSlugAllowed(slug = '') {
  const normalizedInput = normalizeSlug(slug);
  if (!normalizedInput) return false;
  if (normalizedInput === 'demo') return true;
  return normalizedInput === getSettings().slug;
}
