// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push
// Secrets:
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:admin@dilloqui.netlify.app
//
// Auth (P1): richiede JWT valido. Il caller deve essere admin del box
// oppure owner/autore della segnalazione (o membro del box per new_report /
// forum_comment). Fail closed → 401/403.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dilloqui.netlify.app';
    if (!vapidPublic || !vapidPrivate) {
      return json({ error: 'VAPID keys missing' }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth fail-closed: JWT obbligatorio ───────────────────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData?.user) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const callerId = authData.user.id;

    const payload = await req.json();
    const { type, boxSlug, reportId, title, body, excludeUserId } = payload;

    const allowedTypes = ['new_report', 'chat_message', 'status_change', 'forum_comment'];
    if (!type || !allowedTypes.includes(type)) {
      return json({ error: 'Invalid type' }, 400);
    }

    const authorized = await authorizeCaller(supabase, {
      callerId,
      type,
      boxSlug,
      reportId,
    });
    if (!authorized) {
      return json({ error: 'Forbidden' }, 403);
    }

    const targetIds = await resolveTargets(supabase, { type, boxSlug, reportId, excludeUserId });
    if (targetIds.length === 0) {
      return json({ sent: 0, reason: 'no targets' });
    }

    // Filtra per preferenze
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, box_slug, notif_prefs')
      .in('id', targetIds);

    const allowed = (profiles || []).filter((p) => {
      const prefs = p.notif_prefs || {};
      if (!prefs.push_enabled) return false;
      if (type === 'new_report') return prefs.new_report !== false && p.role === 'admin';
      if (type === 'chat_message') return prefs.chat_message !== false;
      if (type === 'status_change') return prefs.status_change !== false;
      if (type === 'forum_comment') return prefs.forum_comment !== false;
      return false;
    });

    if (allowed.length === 0) {
      return json({ sent: 0, reason: 'prefs off' });
    }

    const allowedIds = allowed.map((p) => p.id);
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', allowedIds);

    const url = buildUrl(type, boxSlug, reportId, allowed[0]?.role);
    let sent = 0;
    const staleEndpoints = [];

    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: title || 'DILLOQUI',
            body: body || '',
            url,
            tag: `${type}-${reportId || 'x'}`,
          }),
        );
        sent += 1;
      } catch (err) {
        // 404/410 = subscription scaduta
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    if (staleEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
    }

    return json({ sent });
  } catch (err) {
    console.error(err);
    return json({ error: String(err?.message || err) }, 500);
  }
});

/**
 * Fail closed: solo admin del box, owner/autore della segnalazione,
 * o membro del box per new_report / forum_comment.
 */
async function authorizeCaller(supabase, { callerId, type, boxSlug, reportId }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, box_slug')
    .eq('id', callerId)
    .maybeSingle();

  if (!profile) return false;

  let report = null;
  if (reportId) {
    const { data } = await supabase
      .from('reports')
      .select('author_id, box_slug')
      .eq('id', reportId)
      .maybeSingle();
    report = data;
  }

  const effectiveSlug = boxSlug || report?.box_slug || null;

  // Admin del box
  if (profile.role === 'admin' && effectiveSlug && profile.box_slug === effectiveSlug) {
    return true;
  }

  // Owner privato (anche segnalazioni anonime)
  if (reportId) {
    const { data: owner } = await supabase
      .from('report_owners')
      .select('user_id')
      .eq('report_id', reportId)
      .eq('user_id', callerId)
      .maybeSingle();
    if (owner) return true;

    if (report?.author_id === callerId) return true;
  }

  // Studente membro del box: può notificare new_report / forum_comment
  if (
    (type === 'new_report' || type === 'forum_comment')
    && effectiveSlug
    && profile.box_slug === effectiveSlug
  ) {
    return true;
  }

  // Studente che cambia stato o scrive in chat sulla propria segnalazione
  // (già coperto da owner/author sopra). Niente altro.
  return false;
}

async function resolveTargets(supabase, { type, boxSlug, reportId, excludeUserId }) {
  const ids = new Set();

  if (type === 'new_report' && boxSlug) {
    const { data } = await supabase.rpc('get_box_admin_ids', { p_box_slug: boxSlug });
    (data || []).forEach((id) => ids.add(id));
  }

  if ((type === 'chat_message' || type === 'status_change' || type === 'forum_comment') && reportId) {
    // Owner (identificato o anonimo via report_owners)
    const { data: report } = await supabase
      .from('reports')
      .select('author_id, box_slug')
      .eq('id', reportId)
      .maybeSingle();

    if (report?.author_id) ids.add(report.author_id);

    const { data: owner } = await supabase
      .from('report_owners')
      .select('user_id')
      .eq('report_id', reportId)
      .maybeSingle();
    if (owner?.user_id) ids.add(owner.user_id);

    // Per la chat: avvisa anche gli admin della box
    if (type === 'chat_message') {
      const slug = boxSlug || report?.box_slug;
      if (slug) {
        const { data } = await supabase.rpc('get_box_admin_ids', { p_box_slug: slug });
        (data || []).forEach((id) => ids.add(id));
      }
    }
  }

  if (excludeUserId) ids.delete(excludeUserId);
  return [...ids];
}

function buildUrl(type, boxSlug, reportId, role) {
  if (role === 'admin') return '/admin/reports';
  if (type === 'forum_comment' && boxSlug && reportId) return `/box/${boxSlug}/post/${reportId}`;
  if (boxSlug) return `/box/${boxSlug}/history`;
  return '/';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
