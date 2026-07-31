/**
 * db.js — Unico punto di accesso a Supabase per DilloQui.
 * Tutte le funzioni usano questo file. Le pagine demo NON importano da qui.
 *
 * Schema DB:
 *   boxes          — slug (PK), name, whitelist[], categories[], email_filter_mode, require_class, notif_emails[], regolamento
 *   profiles       — id (FK auth.users), email, role, nome, cognome, classe, box_slug, default_anon, notifications
 *   reports        — id, box_slug, author_id (NULL se anonimo), anon_token (NULL se identificato), type, title, content, is_public, is_anonymous, status
 *   comments       — id, report_id, author_id, anon_token, is_anonymous, content
 *   votes          — user_id, report_id (PK composita)
 *   chat_messages  — id, report_id, author_id, anon_token, content
 */

import { supabase } from '../lib/supabaseClient';

// ─── Chiave localStorage per i token anonimi ───────────────────────────────
const ANON_TOKENS_KEY = 'dq_anon_tokens';

// Colonne reports senza anon_token (REVOKE SELECT sulla colonna lato DB)
const REPORT_SAFE_COLS = 'id, box_slug, author_id, type, title, content, is_public, is_anonymous, status, created_at';

function getAnonTokens() {
  try { return JSON.parse(localStorage.getItem(ANON_TOKENS_KEY) || '[]'); }
  catch { return []; }
}

function saveAnonToken(token) {
  const tokens = getAnonTokens();
  if (!tokens.includes(token)) {
    tokens.push(token);
    localStorage.setItem(ANON_TOKENS_KEY, JSON.stringify(tokens));
  }
}

// ─── BOXES ─────────────────────────────────────────────────────────────────

/**
 * Campi pubblici di una box (view boxes_public).
 * NON include whitelist / notif_emails — usare getBoxAdmin o checkEmailAllowed.
 */
export async function getBox(slug) {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('boxes_public')
    .select('slug, name, categories, require_class, email_filter_mode, regolamento')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Box completa incluso whitelist/notif_emails (solo admin del box via RLS).
 * Usato da Settings admin.
 */
export async function getBoxAdmin(slug) {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Verifica se un'email è ammessa nella whitelist della box (RPC server-side).
 * Non espone la whitelist al client.
 */
export async function checkEmailAllowed(slug, email) {
  const { data, error } = await supabase
    .rpc('check_email_allowed', { p_slug: slug, p_email: email });
  if (error) throw error;
  return !!data;
}

/**
 * Aggiorna le impostazioni di una box (solo admin del box).
 * @param {string} slug
 * @param {object} updates — campi da aggiornare (name, whitelist, categories, require_class, notif_emails, email_filter_mode, regolamento)
 */
export async function updateBox(slug, updates) {
  const { data, error } = await supabase
    .from('boxes')
    .update(updates)
    .eq('slug', slug)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Crea una nuova box (durante la registrazione del rappresentante/admin).
 */
export async function createBox({ slug, name, categories }) {
  const { data, error } = await supabase
    .from('boxes')
    .insert({
      slug,
      name,
      categories: categories || ['Bullismo', 'Infrastrutture', 'Didattica', 'Proposte', 'Altro'],
      whitelist: [],
      notif_emails: [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── PROFILES ──────────────────────────────────────────────────────────────

/**
 * Legge il profilo dell'utente autenticato corrente.
 */
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Aggiorna i dati del profilo dell'utente corrente.
 */
export async function updateMyProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Inserisce o aggiorna il profilo studente dopo il login OTP.
 * Chiamato dal passo 3 di Verify.jsx.
 */
export async function upsertStudentProfile({ nome, cognome, classe, boxSlug }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      role: 'student',
      nome,
      cognome,
      classe: classe || '',
      box_slug: boxSlug,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Legge tutti i profili studenti di una box (per UsersList admin).
 */
export async function getBoxUsers(boxSlug) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('box_slug', boxSlug)
    .eq('role', 'student')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── REPORTS ───────────────────────────────────────────────────────────────

/**
 * Legge le segnalazioni pubbliche di una box (Forum studenti).
 * Usa la RPC `get_public_reports_with_authors`: le RLS impediscono di leggere
 * i profili altrui, quindi il nome autore (solo per post NON anonimi)
 * viene restituito dalla funzione SECURITY DEFINER lato database.
 * Il risultato viene rimappato nella stessa forma dell'embed PostgREST
 * (votes/comments come array di { count }) per non toccare le pagine.
 */
export async function getPublicReports(boxSlug) {
  const { data, error } = await supabase
    .rpc('get_public_reports_with_authors', { p_box_slug: boxSlug });
  if (error) throw error;
  return (data || []).map(r => ({
    ...r,
    votes: [{ count: Number(r.votes_count) || 0 }],
    comments: [{ count: Number(r.comments_count) || 0 }],
    authorName: r.is_anonymous
      ? null
      : `${r.author_nome || ''} ${r.author_cognome || ''}`.trim() || null,
    authorClass: r.is_anonymous ? null : (r.author_classe || null),
  }));
}

/**
 * Legge tutte le segnalazioni di una box (Dashboard/Lista admin).
 * Usa la reports_admin_view che maschera author_id e anon_token per le anonime.
 * Arricchisce con profiles (nome/cognome/classe) per gli autori identificati.
 */
export async function getAllReports(boxSlug) {
  const { data, error } = await supabase
    .from('reports_admin_view')
    .select(`
      *,
      votes(count),
      comments(count),
      chat_messages(count)
    `)
    .eq('box_slug', boxSlug)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];

  const authorIds = [...new Set(
    rows.filter((r) => r.author_id && !r.is_anonymous).map((r) => r.author_id),
  )];
  if (authorIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome, cognome, classe')
    .in('id', authorIds);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    profiles: r.author_id && !r.is_anonymous ? (byId[r.author_id] || null) : null,
  }));
}

/**
 * Legge una singola segnalazione per ID.
 * anon_token non viene mai selezionato (colonna revocata lato DB).
 */
export async function getReport(reportId) {
  const { data, error } = await supabase
    .from('reports')
    .select(`${REPORT_SAFE_COLS}, votes(count), comments(count)`)
    .eq('id', reportId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Legge le segnalazioni identificate dell'utente corrente.
 */
export async function getMyReports() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('reports')
    .select(`${REPORT_SAFE_COLS}, votes(count), comments(count), chat_messages(count)`)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Recupera le segnalazioni anonime dell'utente tramite i token salvati in localStorage.
 * Usa la funzione RPC `get_anon_reports` che bypassa le RLS policy.
 */
export async function getMyAnonReports() {
  const tokens = getAnonTokens();
  if (tokens.length === 0) return [];

  const { data, error } = await supabase
    .rpc('get_anon_reports', { tokens });
  if (error) throw error;
  return data || [];
}

/**
 * Crea una nuova segnalazione.
 * @param {object} params
 * @param {string} params.boxSlug
 * @param {string} params.type — categoria
 * @param {string} params.title
 * @param {string} params.content
 * @param {boolean} params.isPublic
 * @param {boolean} params.isAnonymous
 */
export async function createReport({ boxSlug, type, title, content, isPublic, isAnonymous }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  let anonToken = null;
  let authorId = null;

  if (isAnonymous) {
    anonToken = crypto.randomUUID();
  } else {
    authorId = user.id;
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      box_slug: boxSlug,
      author_id: authorId,
      anon_token: anonToken,
      type,
      title,
      content,
      is_public: isPublic,
      is_anonymous: isAnonymous,
      status: 'new',
    })
    .select(REPORT_SAFE_COLS)
    .single();

  if (error) throw error;

  // Salva il token anonimo in localStorage per permettere il recupero futuro
  // (non restituito dal SELECT: colonna revocata)
  if (anonToken) saveAnonToken(anonToken);

  // Ownership privata (anche per anonime) → serve alle push senza esporre l'autore all'admin.
  // Preferibile il trigger SECURITY DEFINER AFTER INSERT (supabase_security_p2.sql);
  // questo upsert resta come fallback se il trigger non è ancora deployato.
  try {
    const { error: ownErr } = await supabase.from('report_owners').upsert({
      report_id: data.id,
      user_id: user.id,
    });
    if (ownErr) console.warn('report_owners fallback:', ownErr);
  } catch (ownErr) {
    console.warn('report_owners fallback:', ownErr);
  }

  // Avvisa gli admin della box (best-effort)
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'new_report',
    boxSlug,
    reportId: data.id,
    title: 'Nuova segnalazione',
    body: title,
    excludeUserId: user.id,
  });

  return data;
}

/**
 * Aggiorna lo stato o i dati di una segnalazione (solo admin).
 */
export async function updateReport(reportId, updates) {
  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', reportId)
    .select(REPORT_SAFE_COLS)
    .single();
  if (error) throw error;

  if (updates?.status) {
    const { data: { user } } = await supabase.auth.getUser();
    const { notifyEvent } = await import('./push');
    notifyEvent({
      type: 'status_change',
      boxSlug: data.box_slug,
      reportId,
      title: 'Aggiornamento segnalazione',
      body: `Stato aggiornato: ${updates.status}`,
      excludeUserId: user?.id,
    });
  }

  return data;
}

/**
 * Elimina una segnalazione (solo admin).
 */
export async function deleteReport(reportId) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);
  if (error) throw error;
}

// ─── COMMENTI (Forum pubblico) ──────────────────────────────────────────────

/**
 * Legge i commenti di un post pubblico.
 * Usa la RPC `get_comments_with_authors` (le RLS bloccano la lettura dei
 * profili altrui, quindi il join client-side darebbe sempre nomi NULL).
 * Rimappa il risultato nella stessa forma dell'embed `profiles(...)`.
 */
export async function getComments(reportId) {
  const { data, error } = await supabase
    .rpc('get_comments_with_authors', { p_report_id: reportId });
  if (error) throw error;
  return (data || []).map(c => ({
    ...c,
    profiles: c.is_anonymous ? null : {
      nome: c.author_nome,
      cognome: c.author_cognome,
      classe: c.author_classe,
      role: c.author_role,
    },
  }));
}

/**
 * Aggiunge un commento a un post pubblico.
 */
export async function addComment({ reportId, content, isAnonymous }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const payload = {
    report_id: reportId,
    content,
    is_anonymous: isAnonymous,
    author_id: isAnonymous ? null : user.id,
    anon_token: isAnonymous ? crypto.randomUUID() : null,
  };

  const { data, error } = await supabase
    .from('comments')
    .insert(payload)
    .select('id, report_id, author_id, is_anonymous, content, created_at')
    .single();
  if (error) throw error;

  // Notifica l'autore del post (se diverso da chi commenta)
  const { data: report } = await supabase.from('reports').select('box_slug, title').eq('id', reportId).maybeSingle();
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'forum_comment',
    boxSlug: report?.box_slug,
    reportId,
    title: 'Nuovo commento',
    body: report?.title || content.slice(0, 80),
    excludeUserId: user.id,
  });

  return data;
}

// ─── CHAT PRIVATA (admin ↔ studente identificato) ──────────────────────────

/**
 * Legge i messaggi della chat privata di una segnalazione.
 */
export async function getChatMessages(reportId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, report_id, author_id, content, created_at, profiles(nome, cognome, role)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Invia un messaggio nella chat privata.
 */
export async function sendChatMessage({ reportId, content }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      report_id: reportId,
      author_id: user.id,
      content,
    })
    .select('id, report_id, author_id, content, created_at')
    .single();
  if (error) throw error;

  const { data: report } = await supabase.from('reports').select('box_slug, title').eq('id', reportId).maybeSingle();
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'chat_message',
    boxSlug: report?.box_slug,
    reportId,
    title: 'Nuovo messaggio',
    body: report?.title || content.slice(0, 80),
    excludeUserId: user.id,
  });

  return data;
}

// ─── CHAT PER SEGNALAZIONI ANONIME (via token localStorage) ────────────────

/**
 * Legge la chat di una segnalazione anonima usando il token segreto.
 */
export async function getAnonChatMessages(reportId, anonToken) {
  const { data, error } = await supabase
    .rpc('get_anon_chat', { p_report_id: reportId, p_token: anonToken });
  if (error) throw error;
  return data || [];
}

/**
 * Invia un messaggio nella chat di una segnalazione anonima.
 */
export async function sendAnonChatMessage({ reportId, anonToken, content }) {
  const { data, error } = await supabase
    .rpc('send_anon_chat_message', {
      p_report_id: reportId,
      p_token: anonToken,
      p_content: content,
    });
  if (error) throw error;
  // Le RPC che ritornano una riga singola possono restituire un array
  const saved = Array.isArray(data) ? data[0] : data;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: report } = await supabase.from('reports').select('box_slug, title').eq('id', reportId).maybeSingle();
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'chat_message',
    boxSlug: report?.box_slug,
    reportId,
    title: 'Nuovo messaggio',
    body: report?.title || content.slice(0, 80),
    excludeUserId: user?.id,
  });

  return saved;
}

/**
 * Aggiorna lo stato di una segnalazione anonima (risolta/chiusa) via token.
 */
export async function updateAnonReportStatus(reportId, anonToken, status) {
  const { data, error } = await supabase
    .rpc('update_anon_report_status', {
      p_report_id: reportId,
      p_token: anonToken,
      p_status: status,
    });
  if (error) throw error;
  const updated = Array.isArray(data) ? data[0] : data;

  const { data: { user } } = await supabase.auth.getUser();
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'status_change',
    boxSlug: updated?.box_slug,
    reportId,
    title: 'Aggiornamento segnalazione',
    body: `Stato aggiornato: ${status}`,
    excludeUserId: user?.id,
  });

  return updated;
}

// ─── VOTI ──────────────────────────────────────────────────────────────────

/**
 * Aggiunge o toglie il voto dell'utente corrente a una segnalazione.
 * Ritorna il nuovo conteggio voti.
 */
export async function toggleVote(reportId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  // Controlla se ha già votato
  const { data: existing } = await supabase
    .from('votes')
    .select('report_id')
    .eq('user_id', user.id)
    .eq('report_id', reportId)
    .maybeSingle();

  if (existing) {
    await supabase.from('votes').delete()
      .eq('user_id', user.id).eq('report_id', reportId);
    return { voted: false };
  } else {
    await supabase.from('votes').insert({ user_id: user.id, report_id: reportId });
    return { voted: true };
  }
}

/**
 * Controlla se l'utente corrente ha votato una segnalazione.
 */
export async function hasVoted(reportId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('votes')
    .select('report_id')
    .eq('user_id', user.id)
    .eq('report_id', reportId)
    .maybeSingle();

  return !!data;
}
