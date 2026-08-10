/**
 * Web Push — registrazione Service Worker + subscription sul dispositivo.
 *
 * Richiede in .env.local:
 *   VITE_VAPID_PUBLIC_KEY=...  (chiave pubblica VAPID)
 *
 * Genera le chiavi con: npx web-push generate-vapid-keys
 */

import { supabase } from '../lib/supabaseClient';
import { updateMyProfile, getMyProfile } from './db';

const DEFAULT_PREFS = {
  push_enabled: false,
  new_report: true,
  chat_message: true,
  status_change: true,
  forum_comment: true,
};

export function getDefaultNotifPrefs() {
  return { ...DEFAULT_PREFS };
}

export function mergeNotifPrefs(raw) {
  return { ...DEFAULT_PREFS, ...(raw || {}) };
}

async function saveNotifPrefs(patch) {
  const profile = await getMyProfile();
  const next = mergeNotifPrefs({ ...(profile?.notif_prefs || {}), ...patch });
  await updateMyProfile({
    notifications: next.push_enabled,
    notif_prefs: next,
  });
  return next;
}

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function getPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration() {
  return navigator.serviceWorker.register('/sw.js');
}

/**
 * Attiva le push: permesso browser → subscription → salva su Supabase.
 */
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Questo browser non supporta le notifiche push.');
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error('Chiave VAPID mancante. Aggiungi VITE_VAPID_PUBLIC_KEY in .env.local.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permesso notifiche negato. Puoi riabilitarlo dalle impostazioni del browser.');
  }

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const json = subscription.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) throw error;

  // Master switch ON — merge sulle preferenze esistenti
  return saveNotifPrefs({ push_enabled: true });
}

/**
 * Disattiva le push su questo dispositivo e spegne il master switch.
 */
export async function disablePushNotifications() {
  if (isPushSupported()) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  }

  return saveNotifPrefs({ push_enabled: false });
}

/**
 * Aggiorna una o più categorie di preferenza (merge sul JSON esistente).
 */
export async function updateNotifCategory(currentPrefs, patch) {
  return saveNotifPrefs({ ...currentPrefs, ...patch });
}

/**
 * Invoca l'Edge Function che manda le push (best-effort, non blocca l'UI).
 */
export async function notifyEvent({ type, boxSlug, reportId, eventId }) {
  try {
    await supabase.functions.invoke('send-push', {
      // Il server ricava testo, URL, destinatari e box dal database. I campi
      // legacy title/body/excludeUserId restano nell'API JS per non rompere i
      // chiamanti, ma non vengono mai inviati al server.
      body: { type, boxSlug, reportId, eventId },
    });
  } catch (err) {
    console.warn('Push non inviata:', err);
  }
}
