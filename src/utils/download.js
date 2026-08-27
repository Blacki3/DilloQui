/** Download helpers (CSV / JSON) — no toast, triggers a file save. */

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(typeof c.get === 'function' ? c.get(row) : row[c.key])).join(','),
  );
  return `\uFEFF${[header, ...lines].join('\n')}`;
}

const REPORT_CSV_COLUMNS = [
  { key: 'id', label: 'id', get: (r) => r.id },
  { key: 'created_at', label: 'data', get: (r) => r.created_at || r.date || '' },
  { key: 'type', label: 'categoria', get: (r) => r.type || '' },
  { key: 'title', label: 'titolo', get: (r) => r.title || '' },
  { key: 'content', label: 'contenuto', get: (r) => r.content || '' },
  { key: 'status', label: 'stato', get: (r) => r.status || '' },
  {
    key: 'is_public',
    label: 'pubblica',
    get: (r) => (r.is_public ?? r.isPublic) ? 'si' : 'no',
  },
  {
    key: 'is_anonymous',
    label: 'anonima',
    get: (r) => (r.is_anonymous ?? r.isAnonymous ?? r.anonimo) ? 'si' : 'no',
  },
  {
    key: 'author',
    label: 'autore',
    get: (r) => {
      if (r.is_anonymous || r.isAnonymous || r.anonimo) return 'Anonimo';
      if (r.profiles?.nome) {
        return `${r.profiles.nome} ${r.profiles.cognome || ''}`.trim();
      }
      return r.authorName || '';
    },
  },
  {
    key: 'classe',
    label: 'classe',
    get: (r) => {
      if (r.is_anonymous || r.isAnonymous || r.anonimo) return '';
      return r.profiles?.classe || r.authorClass || '';
    },
  },
  {
    key: 'likes',
    label: 'voti',
    get: (r) => r.likes ?? r.votes?.[0]?.count ?? 0,
  },
];

export function reportsToCsv(reports) {
  return toCsv(reports || [], REPORT_CSV_COLUMNS);
}

export function supportMailto({ slug, role = 'student' } = {}) {
  const subject = slug
    ? `DilloQui Support (${slug})`
    : 'DilloQui Support';
  const body = [
    'Descrivi il problema o la richiesta:',
    '',
    '',
    '---',
    `Ruolo: ${role}`,
    slug ? `Box: ${slug}` : null,
  ].filter(Boolean).join('\n');
  return `mailto:info.dilloqui@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
