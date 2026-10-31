// Ti wrapper IndexedDB san depandans. Tout done aplikasyon an viv isit la:
// ekran yo li sèlman nan baz lokal la, epi sync.js senkronize l ak sèvè a.

const DB_NAME = 'kane-dijital';
const DB_VERSION = 1;
export const STORES = ['customers', 'transactions', 'meta'];

let dbPromise = null;
const listeners = new Set();

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'uuid' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const tx = db.createObjectStore('transactions', { keyPath: 'uuid' });
        tx.createIndex('customer_uuid', 'customer_uuid');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(storeNames, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    Promise.resolve(fn(tx)).then((r) => { result = r; }, reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Ekran yo abòne pou yo re-afiche lè done yo chanje. */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(stores) {
  for (const fn of listeners) fn(stores);
}

export function getAll(store) {
  return run([store], 'readonly', (tx) => wrap(tx.objectStore(store).getAll()));
}

export function get(store, key) {
  return run([store], 'readonly', (tx) => wrap(tx.objectStore(store).get(key)));
}

export function getByIndex(store, index, value) {
  return run([store], 'readonly', (tx) => wrap(tx.objectStore(store).index(index).getAll(value)));
}

/** put(store, obj) oswa put(store, [obj, obj...]) nan yon sèl tranzaksyon. */
export async function put(store, value, { silent = false } = {}) {
  const items = Array.isArray(value) ? value : [value];
  await run([store], 'readwrite', (tx) => {
    const os = tx.objectStore(store);
    for (const item of items) os.put(item);
  });
  if (!silent) emit([store]);
}

export async function del(store, keys, { silent = false } = {}) {
  const list = Array.isArray(keys) ? keys : [keys];
  await run([store], 'readwrite', (tx) => {
    const os = tx.objectStore(store);
    for (const k of list) os.delete(k);
  });
  if (!silent) emit([store]);
}

export async function getMeta(key, fallback = null) {
  const row = await get('meta', key);
  return row ? row.value : fallback;
}

export function setMeta(key, value) {
  return put('meta', { key, value }, { silent: true });
}

export async function clearAll() {
  await run(STORES, 'readwrite', (tx) => {
    for (const s of STORES) tx.objectStore(s).clear();
  });
  emit(STORES);
}

/** Pou sync.js: avèti ekran yo apre yon gwo chanjman. */
export function notify(stores = STORES) {
  emit(stores);
}
