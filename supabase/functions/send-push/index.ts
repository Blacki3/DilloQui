import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_COPY = {
  new_report: { title: 'Nuova segnalazione', body: 'È stata inviata una nuova segnalazione.' },
  chat_message: { title: 'Nuovo messaggio', body: 'Hai ricevuto un nuovo messaggio in chat.' },
  status_change: { title: 'Aggiornamento segnalazione', body: 'Lo stato della segnalazione è stato aggiornato.' },
  forum_comment: { title: 'Nuovo commento', body: 'È stato aggiunto un nuovo commento al forum.' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dilloqui.netlify.app';
    if (!vapidPublic || !vapidPrivate) return json({ error: 'VAPID keys missing' }, 500);
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'Unauthorized' }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData?.user) return json({ error: 'Unauthorized' }, 401);
    const callerId = authData.user.id;

    const { type, boxSlug, reportId, eventId } = await req.json();
    if (!EVENT_COPY[type] || !reportId) return json({ error: 'Invalid event' }, 400);

    const { data: report } = await supabase
      .from('reports')
      .select('id, author_id, box_slug, is_public, created_at')
      .eq('id', reportId)
      .maybeSingle();
    // boxSlug è compatibilità client; non può cambiare la box effettiva.
    if (!report || (boxSlug && boxSlug !== report.box_slug)) return json({ error: 'Forbidden' }, 403);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, box_slug')
      .eq('id', callerId)
      .maybeSingle();
    if (!profile || !await authorizeCaller(supabase, { callerId, type, eventId, profile, report })) {
      return json({ error: 'Forbidden' }, 403);
    }

    // Ogni report/commento/messaggio può generare una sola notifica. Lo stato
    // è escluso perché non esiste una riga-evento distinta da deduplicare.
    if (['new_report', 'chat_message', 'forum_comment'].includes(type)) {
      const { error: eventError } = await supabase.from('notification_event_log').insert({
        actor_id: callerId,
        event_type: type,
        event_id: eventId,
      });
      if (eventError?.code === '23505') return json({ sent: 0, reason: 'duplicate event' });
      if (eventError) throw eventError;
    }

    const targetIds = await resolveTargets(supabase, { type, report, excludeUserId: callerId });
    if (targetIds.length === 0) return json({ sent: 0, reason: 'no targets' });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, notif_prefs')
      .in('id', targetIds);
    const allowed = (profiles || []).filter((p) => notificationEnabled(p, type));
    if (allowed.length === 0) return json({ sent: 0, reason: 'prefs off' });

    const allowedIds = allowed.map((p) => p.id);
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', allowedIds);

    let sent = 0;
    const staleEndpoints: string[] = [];
    for (const sub of subs || []) {
      const target = allowed.find((p) => p.id === sub.user_id);
      if (!target) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            ...EVENT_COPY[type],
            url: buildUrl(type, report.box_slug, report.id, target.role),
            tag: `${type}-${eventId || report.id}`,
          }),
        );
        sent += 1;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) staleEndpoints.push(sub.endpoint);
      }
    }
    if (staleEndpoints.length) await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);

    const notificationRows = allowed.map((target) => ({
      user_id: target.id,
      type,
      ...EVENT_COPY[type],
      url: buildUrl(type, report.box_slug, report.id, target.role),
      report_id: report.id,
      read: false,
    }));
    await supabase.from('notifications').insert(notificationRows);
    return json({ sent });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
  }
});

function notificationEnabled(profile, type) {
  const prefs = profile.notif_prefs || {};
  if (!prefs.push_enabled) return false;
  if (type === 'new_report') return prefs.new_report !== false && profile.role === 'admin';
  if (type === 'chat_message') return prefs.chat_message !== false;
  if (type === 'status_change') return prefs.status_change !== false;
  return prefs.forum_comment !== false;
}

async function authorizeCaller(supabase, { callerId, type, eventId, profile, report }) {
  const isAdmin = profile.role === 'admin' && profile.box_slug === report.box_slug;
  const { data: owner } = await supabase
    .from('report_owners')
    .select('user_id')
    .eq('report_id', report.id)
    .eq('user_id', callerId)
    .maybeSingle();
  const isOwner = !!owner || report.author_id === callerId;

  if (type === 'new_report') return isOwner && eventId === report.id;
  if (type === 'status_change') return isAdmin || isOwner;

  if (type === 'forum_comment') {
    if (!eventId || profile.box_slug !== report.box_slug || !report.is_public) return false;
    const { data: comment } = await supabase
      .from('comments')
      .select('id, report_id, author_id')
      .eq('id', eventId)
      .maybeSingle();
    return !!comment && comment.report_id === report.id && (comment.author_id === callerId || comment.author_id === null);
  }

  if (type === 'chat_message') {
    if (!eventId || !(isAdmin || isOwner)) return false;
    const { data: message } = await supabase
      .from('chat_messages')
      .select('id, report_id, author_id')
      .eq('id', eventId)
      .maybeSingle();
    return !!message && message.report_id === report.id && (message.author_id === callerId || message.author_id === null);
  }

  return false;
}

async function resolveTargets(supabase, { type, report, excludeUserId }) {
  const ids = new Set<string>();
  if (type === 'new_report') {
    const { data } = await supabase.rpc('get_box_admin_ids', { p_box_slug: report.box_slug });
    (data || []).forEach((id) => ids.add(id));
  } else {
    if (report.author_id) ids.add(report.author_id);
    const { data: owner } = await supabase
      .from('report_owners')
      .select('user_id')
      .eq('report_id', report.id)
      .maybeSingle();
    if (owner?.user_id) ids.add(owner.user_id);
    if (type === 'chat_message') {
      const { data } = await supabase.rpc('get_box_admin_ids', { p_box_slug: report.box_slug });
      (data || []).forEach((id) => ids.add(id));
    }
  }
  ids.delete(excludeUserId);
  return [...ids];
}

function buildUrl(type, boxSlug, reportId, role) {
  if (role === 'admin') return '/admin/reports';
  if (type === 'forum_comment') return `/box/${boxSlug}/post/${reportId}`;
  return `/box/${boxSlug}/history`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
