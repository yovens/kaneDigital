// Motè senkronizasyon an.
//
//  1. PUSH: voye tout sa ki gen _dirty bay /api/sync/push.
//     Si sèvè a aksepte l epi li pa chanje pandan voye a, nou retire _dirty.
//  2. PULL: mande /api/sync/pull?since=... epi mete chanjman sèvè a nan
//     IndexedDB, eksepte liy ki gen chanjman lokal ki poko voye.
//
// Tout bagay idanpotan (uuid): si yon voye koupe nan mitan, nou jis rekòmanse.

import * as db from './db.js';
import { api } from './api.js';

const MAX_CUSTOMERS = 500;
const MAX_TRANSACTIONS = 1000;

const status = {
  state: 'idle', // idle | syncing | offline | error
  pending: 0,
  lastSync: null,
  error: null,
};
const statusListeners = new Set();

export function onStatus(fn) {
  statusListeners.add(fn);
  fn({ ...status });
  return () => statusListeners.delete(fn);
}

function setStatus(patch) {
  Object.assign(status, patch);
  for (const fn of statusListeners) fn({ ...status });
}

export function getStatus() {
  return { ...status };
}

const iso = (v) => (v ? new Date(v).toISOString() : null);

function fromServerCustomer(c) {
  return {
    uuid: c.uuid,
    name: c.name,
    phone: c.phone,
    public_url: c.public_url ?? null,
    created_at: iso(c.created_at),
    updated_at: iso(c.updated_at),
    deleted_at: iso(c.deleted_at),
    _dirty: 0,
    _rejected: null,
  };
}

function fromServerTransaction(t) {
  return {
    uuid: t.uuid,
    customer_uuid: t.customer_uuid,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    note: t.note ?? null,
    occurred_at: iso(t.occurred_at),
    source: t.source,
    updated_at: iso(t.updated_at),
    deleted_at: iso(t.deleted_at),
    _dirty: 0,
    _rejected: null,
  };
}

async function refreshPending() {
  const [c, t] = await Promise.all([db.getAll('customers'), db.getAll('transactions')]);
  const pending = c.filter((x) => x._dirty).length + t.filter((x) => x._dirty).length;
  setStatus({ pending });
  return pending;
}

async function push() {
  // IndexedDB retounen liy yo nan lòd uuid (o aza). Nou voye yo nan lòd yo te
  // kreye a, pou si gen yon limit, se dènye kliyan yo ki refize, pa premye yo.
  const byDate = (key) => (a, b) => (a[key] || '').localeCompare(b[key] || '');
  const customers = (await db.getAll('customers'))
    .filter((c) => c._dirty)
    .sort(byDate('created_at'))
    .slice(0, MAX_CUSTOMERS);
  const transactions = (await db.getAll('transactions'))
    .filter((t) => t._dirty)
    .sort(byDate('occurred_at'))
    .slice(0, MAX_TRANSACTIONS);
  if (!customers.length && !transactions.length) return false;

  const snapshot = new Map([...customers, ...transactions].map((r) => [r.uuid, r._dirty]));

  const res = await api.post('/api/sync/push', {
    customers: customers.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      phone: c.phone,
      updated_at: c.updated_at,
      deleted_at: c.deleted_at,
    })),
    transactions: transactions.map((t) => ({
      uuid: t.uuid,
      customer_uuid: t.customer_uuid,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      note: t.note,
      occurred_at: t.occurred_at,
      deleted_at: t.deleted_at,
    })),
  });

  const rejectedReason = new Map((res.rejected ?? []).map((r) => [r.uuid, r.reason]));

  for (const [store, accepted] of [['customers', res.accepted?.customers ?? []], ['transactions', res.accepted?.transactions ?? []]]) {
    const done = new Set([...accepted, ...[...rejectedReason.keys()]]);
    const rows = store === 'customers' ? customers : transactions;
    const toPut = [];
    const toDelete = [];

    for (const row of rows) {
      if (!done.has(row.uuid)) continue;
      const current = await db.get(store, row.uuid);
      // Li chanje pandan nou t ap voye l: kite l dirty pou pwochen sync la.
      if (!current || current._dirty !== snapshot.get(row.uuid)) continue;

      if (rejectedReason.has(row.uuid)) {
        toPut.push({ ...current, _dirty: 0, _rejected: rejectedReason.get(row.uuid) });
      } else if (current.deleted_at) {
        toDelete.push(current.uuid);
      } else {
        toPut.push({ ...current, _dirty: 0, _rejected: null });
      }
    }

    if (toPut.length) await db.put(store, toPut, { silent: true });
    if (toDelete.length) await db.del(store, toDelete, { silent: true });
  }

  return customers.length === MAX_CUSTOMERS || transactions.length === MAX_TRANSACTIONS;
}

async function applyServerRows(store, rows, map) {
  const toPut = [];
  const toDelete = [];
  for (const row of rows) {
    const local = await db.get(store, row.uuid);
    if (local && local._dirty) continue; // chanjman lokal la genyen jiskaske li voye
    const mapped = map(row);
    if (mapped.deleted_at) {
      if (local) toDelete.push(row.uuid);
    } else {
      // Kenbe public_url si sèvè a pa voye l.
      toPut.push(local ? { ...local, ...mapped, public_url: mapped.public_url ?? local.public_url } : mapped);
    }
  }
  if (toPut.length) await db.put(store, toPut, { silent: true });
  if (toDelete.length) await db.del(store, toDelete, { silent: true });
}

async function pull() {
  let since = await db.getMeta('since');
  for (let page = 0; page < 50; page++) {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    const res = await api.get(`/api/sync/pull${qs}`);
    await applyServerRows('customers', res.customers ?? [], fromServerCustomer);
    await applyServerRows('transactions', res.transactions ?? [], fromServerTransaction);
    since = res.next_since;
    await db.setMeta('since', since);
    if (!res.has_more) break;
  }
}

let running = null;
let again = false;

/** Lanse yon sync. Si youn deja ap fèt, nou make yon dezyèm pou apre. */
export function syncNow() {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    if (!navigator.onLine) {
      await refreshPending();
      setStatus({ state: 'offline' });
      return;
    }
    setStatus({ state: 'syncing', error: null });
    try {
      for (let i = 0; i < 20 && (await push()); i++) { /* plis pase yon lo */ }
      await pull();
      const lastSync = new Date().toISOString();
      await db.setMeta('last_sync', lastSync);
      await refreshPending();
      setStatus({ state: 'idle', lastSync });
    } catch (e) {
      await refreshPending();
      setStatus({ state: e.offline ? 'offline' : 'error', error: e.message });
    } finally {
      db.notify();
    }
  })().finally(() => {
    running = null;
    if (again) {
      again = false;
      syncNow();
    }
  });
  return running;
}

let debounceTimer = null;
export function scheduleSync(delay = 1200) {
  refreshPending();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(syncNow, delay);
}

let started = false;
export async function startAutoSync() {
  if (started) return;
  started = true;
  setStatus({ lastSync: await db.getMeta('last_sync') });
  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => setStatus({ state: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') syncNow();
  }, 60000);
  syncNow();
}
