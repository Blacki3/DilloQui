// Letture admin in modalità reale (localStorage, senza schema DB).
// Chiave: dq_admin_read_v1 → { [adminId]: { [reportId]: lastReadAtMs } }

import { useSyncExternalStore } from 'react';
import { STATUS } from './mockStore';

const STORAGE_KEY = 'dq_admin_read_v1';

let readMap = loadMap();
let version = 0;
const listeners = new Set();

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readMap));
  } catch {
    /* quota / privacy */
  }
}

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  return version;
}

function adminBucket(adminId) {
  const key = String(adminId || '');
  if (!key) return null;
  if (!readMap[key] || typeof readMap[key] !== 'object') {
    readMap[key] = {};
  }
  return readMap[key];
}

/** Timestamp ultimo open della segnalazione da parte di questo admin (0 se mai). */
export function getLastReadAt(adminId, reportId) {
  const bucket = adminBucket(adminId);
  if (!bucket) return 0;
  return Number(bucket[String(reportId)]) || 0;
}

/** Segna la segnalazione come letta ora. */
export function markReportReadReal(adminId, reportId) {
  const bucket = adminBucket(adminId);
  if (!bucket || reportId == null) return;
  bucket[String(reportId)] = Date.now();
  persist();
  emit();
}

function studentMsgTimestamp(msg) {
  if (!msg || msg.isAdmin) return 0;
  if (typeof msg.createdAt === 'number' && msg.createdAt > 0) return msg.createdAt;
  if (msg.created_at) {
    const t = new Date(msg.created_at).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  // fallback: id numerico (demo-like) o 0
  const n = Number(msg.id);
  return Number.isFinite(n) && n > 1e11 ? n : 0;
}

function latestStudentMsgAt(report) {
  const chat = report?.chat || [];
  let max = 0;
  for (const msg of chat) {
    const t = studentMsgTimestamp(msg);
    if (t > max) max = t;
  }
  return max;
}

/**
 * Unread: status new mai aperta, oppure messaggio studente più recente dell'ultimo open.
 * Senza chat caricata, solo status===new (mai letta) conta.
 */
export function hasUnreadReal(report, adminId) {
  if (!report) return false;
  const lastRead = getLastReadAt(adminId, report.id);
  const studentAt = latestStudentMsgAt(report);

  if (studentAt > 0 && studentAt > lastRead) return true;
  if (report.status === STATUS.new && !lastRead) return true;
  return false;
}

/** Da gestire: nuove, oppure in revisione con risposta studente non letta. */
export function needsAttentionReal(report, adminId) {
  if (!report) return false;
  if (report.status === STATUS.new) return true;
  if (report.status === STATUS.in_review) return hasUnreadReal(report, adminId);
  return false;
}

export function countUnreadReal(reportsList, adminId) {
  return (reportsList || []).filter((r) => hasUnreadReal(r, adminId)).length;
}

/** Conta leggera per badge sidebar: status===new (proxy senza caricare tutte le chat). */
export function countNewStatus(reportsList) {
  return (reportsList || []).filter((r) => r.status === STATUS.new).length;
}

export function useAdminReadVersionReal() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
