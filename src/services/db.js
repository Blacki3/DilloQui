import { supabase } from '../lib/supabaseClient';

// Colonne reports senza anon_token (REVOKE SELECT sulla colonna lato DB)
const REPORT_SAFE_COLS = 'id, box_slug, author_id, type, title, content, is_public, is_anonymous, status, created_at';

// BOXES

/**
 * Campi pubblici di una box (view boxes_public).
 * NON include whitelist / notif_emails — usare getBoxAdmin o checkEmailAllowed.
 */
export async function getBox(slug) {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('boxes_public')
    .select('slug, name, categories, require_class, email_filter_mode, regolamento, verified, suspended')
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
 * Gestione piattaforma (non del singolo sportello).
 * Le RPC ricontrollano il permesso lato server: qui si decide solo cosa mostrare.
 */
export async function amIPlatformAdmin() {
  const { data, error } = await supabase.rpc('am_i_platform_admin');
  if (error) return false;
  return data === true;
}

/** Lo sblocco vive nel database e scade da solo: qui si legge soltanto. */
export async function platformSessionStatus() {
  const { data, error } = await supabase.rpc('platform_session_status');
  if (error) return { unlocked: false };
  return data || { unlocked: false };
}

/**
 * Seconda password del pannello. Non solleva sui tentativi sbagliati:
 * risponde { ok:false, locked_until } dopo cinque errori.
 */
export async function platformUnlock(email, password) {
  const { data, error } = await supabase.rpc('platform_unlock', {
    p_email: email,
    p_password: password,
  });
  // Un guasto del server non è una password sbagliata: confonderli
  // manda a cercare per mezz'ora una credenziale che era giusta
  if (error) return { ok: false, error: error.message };
  return data || { ok: false };
}

export async function platformLock() {
  await supabase.rpc('platform_lock');
}

/** Tutti gli sportelli con i dati del referente. I non verificati vengono per primi. */
export async function listBoxesOverview() {
  const { data, error } = await supabase.rpc('list_boxes_overview');
  if (error) throw error;
  return data || [];
}

/** Verifica o revoca uno sportello. La nota resta come traccia della decisione. */
export async function setBoxVerified(slug, verified, note) {
  const { data, error } = await supabase.rpc('set_box_verified', {
    p_slug: slug,
    p_verified: verified,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

/** Scheda completa di uno sportello: configurazione, referenti, attività. */
export async function getBoxDetail(slug) {
  const { data, error } = await supabase.rpc('get_box_detail', { p_slug: slug });
  if (error) throw error;
  return data;
}

/** Sospende o riattiva. I dati restano, si fermano solo le scritture. */
export async function setBoxSuspended(slug, suspended, note) {
  const { data, error } = await supabase.rpc('set_box_suspended', {
    p_slug: slug,
    p_suspended: suspended,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

/**
 * Eliminazione di uno sportello altrui dal pannello di piattaforma:
 * `conferma` deve ripetere lo slug. Non si annulla.
 * Da non confondere con deleteBox, con cui un admin chiude il proprio.
 */
export async function platformDeleteBox(slug, conferma) {
  const { data, error } = await supabase.rpc('delete_box', {
    p_slug: slug,
    p_conferma: conferma,
  });
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
  // Se stiamo cambiando lo slug, usiamo una RPC dedicata per evitare
  // conflitti RLS causati da ON UPDATE CASCADE sulla tabella profiles.
  if (updates.slug && updates.slug !== slug) {
    const { error: rpcError } = await supabase.rpc('update_box_slug', {
      old_slug: slug,
      new_slug: updates.slug
    });
    if (rpcError) throw rpcError;
    
    // Aggiorniamo la variabile slug locale per le successive modifiche
    slug = updates.slug;
  }

  // Rimuoviamo lo slug dall'oggetto updates per il normale update
  const { slug: _slugToRemove, ...otherUpdates } = updates;
  
  if (Object.keys(otherUpdates).length > 0) {
    const { data, error } = await supabase
      .from('boxes')
      .update(otherUpdates)
      .eq('slug', slug)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  // Se abbiamo aggiornato solo lo slug, facciamo una GET per restituire il box
  const { data, error } = await supabase.from('boxes').select('*').eq('slug', slug).single();
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

// PROFILES

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
    .in('role', ['student', 'banned'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// REPORTS

/**
 * Legge le segnalazioni pubbliche di una box (Forum studenti).
 * Usa la RPC `get_public_reports_with_authors`: le RLS impediscono di leggere
 * i profili altrui, quindi il nome autore (solo per post NON anonimi)
 * viene restituito dalla funzione SECURITY DEFINER lato database.
 * Il risultato viene rimappato nella stessa forma dell'embed PostgREST
 * (votes/comments come array di { count }) per non toccare le pagine.
 */
export const FORUM_PAGE_SIZE = 50;

export async function getPublicReports(boxSlug, { limit = FORUM_PAGE_SIZE } = {}) {
  // Chiediamo una riga in più di quelle che servono: se torna indietro
  // vuol dire che ce ne sono altre, ed è così che sappiamo se mostrare
  // il pulsante «carica altri» senza una seconda query di conteggio.
  const { data, error } = await supabase
    .rpc('get_public_reports_with_authors', { p_box_slug: boxSlug, p_limit: limit + 1 });
  if (error) throw error;
  const righe = data || [];
  const altriDisponibili = righe.length > limit;
  return {
    posts: (altriDisponibili ? righe.slice(0, limit) : righe).map(r => ({
      ...r,
      votes: [{ count: Number(r.votes_count) || 0 }],
      comments: [{ count: Number(r.comments_count) || 0 }],
      authorName: r.is_anonymous
        ? null
        : `${r.author_nome || ''} ${r.author_cognome || ''}`.trim() || null,
      authorClass: r.is_anonymous ? null : (r.author_classe || null),
    })),
    altriDisponibili,
  };
}

/**
 * Tetto di default alle segnalazioni caricate in una volta. Una scuola
 * grande accumula migliaia di righe e la lista ne mostra una schermata:
 * scaricarle tutte a ogni giro di polling costa senza servire a niente.
 */
export const REPORTS_PAGE_SIZE = 500;

/**
 * Legge le segnalazioni di una box (Dashboard/Lista admin), dalla più
 * recente. Usa la reports_admin_view che maschera author_id e anon_token
 * per le anonime, e arricchisce con nome/cognome/classe degli autori
 * identificati.
 *
 * @param {object} [opts]
 * @param {number|null} [opts.limit] massimo di righe, null per tutte (export CSV)
 * @param {string|null} [opts.since] ISO date: scarta le segnalazioni precedenti
 */
export async function getAllReports(boxSlug, { limit = REPORTS_PAGE_SIZE, since = null } = {}) {
  let query = supabase
    .from('reports_admin_view')
    .select(`
      *,
      votes(count),
      comments(count),
      chat_messages(count)
    `)
    .eq('box_slug', boxSlug)
    .order('created_at', { ascending: false });

  if (since) query = query.gte('created_at', since);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
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
 * Solo il numero di segnalazioni da leggere, per il badge della sidebar.
 * È una COUNT eseguita dal database: prima si scaricava l'intera tabella,
 * con voti, commenti e chat annidati, per poi contare in JavaScript.
 */
export async function countNewReports(boxSlug) {
  const { count, error } = await supabase
    .from('reports_admin_view')
    .select('id', { count: 'exact', head: true })
    .eq('box_slug', boxSlug)
    .eq('status', 'new');
  if (error) throw error;
  return count || 0;
}

/**
 * Legge una singola segnalazione per ID.
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
 * Recupera le segnalazioni anonime dell'utente tramite la tabella report_owners (server-side).
 * Non dipende più dal localStorage: funziona su tutti i dispositivi.
 */
export async function getMyAnonReports() {
  const { data, error } = await supabase
    .rpc('get_my_anon_reports');
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
 * @returns {Promise<{id: string}>} solo l'id: la riga non viene riletta.
 */
export async function createReport({ boxSlug, type, title, content, isPublic, isAnonymous }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  // Per le segnalazioni anonime, author_id è NULL nel record pubblico.
  // L'ownership è tracciata nella tabella report_owners (server-side).
  const authorId = isAnonymous ? null : user.id;

  // L'id lo genera il client perché la riga NON va richiesta indietro: una
  // segnalazione anonima non supera nessuna policy di SELECT su reports —
  // author_id è NULL per scelta, e se è privata non vale nemmeno quella sui
  // post pubblici — quindi un INSERT ... RETURNING verrebbe respinto dalla
  // RLS annullando anche la scrittura. L'autore la rilegge da
  // get_my_anon_reports().
  const reportId = crypto.randomUUID();

  const { error } = await supabase
    .from('reports')
    .insert({
      id: reportId,
      box_slug: boxSlug,
      author_id: authorId,
      anon_token: isAnonymous ? crypto.randomUUID() : null,
      type,
      title,
      content,
      is_public: isPublic,
      is_anonymous: isAnonymous,
      status: 'new',
    });

  if (error) throw error;

  // L'ownership privata (report_owners) la registra il trigger
  // claim_report_owner lato database: la tabella non ha policy INSERT,
  // altrimenti si potrebbe rivendicare la segnalazione di un altro e
  // leggerne la chat anonima.

  // Avvisa gli admin della box (best-effort)
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'new_report',
    boxSlug,
    reportId,
    eventId: reportId,
    title: 'Nuova segnalazione',
    body: 'È stata inviata una nuova segnalazione.',
    excludeUserId: user.id,
  });

  return { id: reportId };
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
      body: 'Lo stato della segnalazione è stato aggiornato.',
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

// COMMENTI (Forum pubblico)

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

  // Come per le segnalazioni: nei commenti anonimi author_id è NULL e il
  // vincolo chk_comment_author pretende un anon_token al suo posto.
  // Il token non serve a rileggere il commento (nessun client può
  // selezionarlo), tiene solo insieme le due metà del vincolo.
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
    eventId: data.id,
    title: 'Nuovo commento',
    body: 'È stato aggiunto un nuovo commento al forum.',
    excludeUserId: user.id,
  });

  return data;
}

// CHAT PRIVATA (admin ↔ studente identificato)

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
    eventId: data.id,
    title: 'Nuovo messaggio',
    body: 'Hai ricevuto un nuovo messaggio in chat.',
    excludeUserId: user.id,
  });

  return data;
}

// CHAT PER SEGNALAZIONI ANONIME (autenticata via JWT / report_owners)

/**
 * Legge la chat di una segnalazione anonima.
 * L'accesso è verificato tramite report_owners (ownership server-side).
 */
export async function getAnonChatMessages(reportId) {
  const { data, error } = await supabase
    .rpc('get_anon_chat', { p_report_id: reportId });
  if (error) throw error;
  return data || [];
}

/**
 * Invia un messaggio nella chat di una segnalazione anonima.
 * L'accesso è verificato tramite report_owners (ownership server-side).
 */
export async function sendAnonChatMessage({ reportId, content }) {
  const { data, error } = await supabase
    .rpc('send_anon_chat_message', {
      p_report_id: reportId,
      p_content: content,
    });
  if (error) throw error;
  const saved = Array.isArray(data) ? data[0] : data;

  // Il box arriva dalla RPC: la riga di una segnalazione anonima privata
  // non è leggibile dalla tabella (author_id è NULL), quindi una query su
  // reports tornerebbe vuota e la notifica partirebbe senza destinatari.
  const { data: { user } } = await supabase.auth.getUser();
  const { notifyEvent } = await import('./push');
  notifyEvent({
    type: 'chat_message',
    boxSlug: saved?.box_slug,
    reportId,
    eventId: saved?.id,
    title: 'Nuovo messaggio',
    body: 'Hai ricevuto un nuovo messaggio in chat.',
    excludeUserId: user?.id,
  });

  return saved;
}

/**
 * Aggiorna lo stato di una segnalazione anonima (risolta/chiusa).
 * L'accesso è verificato tramite report_owners (ownership server-side).
 */
export async function updateAnonReportStatus(reportId, status) {
  const { data, error } = await supabase
    .rpc('update_anon_report_status', {
      p_report_id: reportId,
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
    body: 'Lo stato della segnalazione è stato aggiornato.',
    excludeUserId: user?.id,
  });

  return updated;
}

// VOTI

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

// NOTIFICHE IN-APP

/**
 * Legge le ultime 30 notifiche dell'utente corrente.
 */
export async function getNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, url, report_id, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data || []).map((n) => ({
    ...n,
    // Formato leggibile per il pannello
    time: formatRelativeTime(n.created_at),
    text: n.body || n.title,
    reportId: n.report_id,
  }));
}

/**
 * Marca una singola notifica come letta.
 */
export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Marca tutte le notifiche non lette dell'utente come lette.
 */
export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) throw error;
}

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ora';
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ieri';
  return `${days} giorni fa`;
}

// ── FUNZIONI DISTRUTTIVE (GDPR) ──

/**
 * Cancellazione irreversibile dell'account (Diritto all'Oblio).
 * L'account sparisce davvero; le segnalazioni restano sul forum senza
 * più autore, con un token nuovo che non è collegato a nessuno.
 * La scrittura diretta su profiles non poteva funzionare: il ruolo non
 * è modificabile dal client e 'deleted' non è un valore ammesso.
 */
export async function deleteMyProfile() {
  const { data, error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  return data;
}

/**
 * Elimina tutte le segnalazioni di una box (solo admin).
 * Utile per il reset di fine anno.
 */
export async function resetBox(slug) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('box_slug', slug);
  if (error) throw error;
}

/**
 * Elimina un'intera box (solo admin).
 */
export async function deleteBox(slug) {
  const { error } = await supabase
    .from('boxes')
    .delete()
    .eq('slug', slug);
  if (error) throw error;
}

/**
 * Blocca o sblocca un utente (solo admin).
 */
export async function toggleUserBan(userId, ban) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: ban ? 'banned' : 'student' })
    .eq('id', userId);
  if (error) throw error;
}
