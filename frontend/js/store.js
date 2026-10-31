// Aksyon lokal yo. Chak chanjman ekri nan IndexedDB touswit (ak _dirty),
// epi sync.js voye l bay sèvè a lè gen entènèt.

import * as db from './db.js';
import { normalizePhone } from './format.js';

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Fallback pou http:// sou rezo lokal (randomUUID mande yon kontèks sekirize).
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const nowIso = () => new Date().toISOString();

/** _dirty = moman chanjman an. sync.js efase l sèlman si l pa chanje pandan voye a. */
const dirtyStamp = () => Date.now() + Math.random();

let afterWrite = () => {};
export function onLocalWrite(fn) {
  afterWrite = fn;
}

export async function addCustomer({ name, phone }) {
  const customer = {
    uuid: uuid(),
    name: name.trim(),
    phone: normalizePhone(phone),
    public_url: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
    _dirty: dirtyStamp(),
    _rejected: null,
  };
  await db.put('customers', customer);
  afterWrite();
  return customer;
}

export async function updateCustomer(uuidValue, { name, phone }) {
  const c = await db.get('customers', uuidValue);
  if (!c) return null;
  Object.assign(c, {
    name: name.trim(),
    phone: normalizePhone(phone),
    updated_at: nowIso(),
    _dirty: dirtyStamp(),
    _rejected: null,
  });
  await db.put('customers', c);
  afterWrite();
  return c;
}

export async function deleteCustomer(uuidValue) {
  const c = await db.get('customers', uuidValue);
  if (!c) return;
  Object.assign(c, { deleted_at: nowIso(), updated_at: nowIso(), _dirty: dirtyStamp() });
  await db.put('customers', c);
  afterWrite();
}

export async function addTransaction({ customer_uuid, type, amount, currency, note }) {
  const t = {
    uuid: uuid(),
    customer_uuid,
    type,
    amount: Math.round(Number(amount) * 100) / 100,
    currency,
    note: note?.trim() || null,
    occurred_at: nowIso(),
    source: 'local',
    updated_at: nowIso(),
    deleted_at: null,
    _dirty: dirtyStamp(),
    _rejected: null,
  };
  await db.put('transactions', t);
  afterWrite();
  return t;
}

export async function deleteTransaction(uuidValue) {
  const t = await db.get('transactions', uuidValue);
  if (!t) return;
  Object.assign(t, { deleted_at: nowIso(), updated_at: nowIso(), _dirty: dirtyStamp() });
  await db.put('transactions', t);
  afterWrite();
}

export async function customerWithTransactions(uuidValue) {
  const [customer, transactions] = await Promise.all([
    db.get('customers', uuidValue),
    db.getByIndex('transactions', 'customer_uuid', uuidValue),
  ]);
  return { customer, transactions };
}

export async function pendingCount() {
  const [customers, transactions] = await Promise.all([db.getAll('customers'), db.getAll('transactions')]);
  return customers.filter((c) => c._dirty).length + transactions.filter((t) => t._dirty).length;
}

export async function rejectedRows() {
  const [customers, transactions] = await Promise.all([db.getAll('customers'), db.getAll('transactions')]);
  return [...customers, ...transactions].filter((r) => r._rejected && !r.deleted_at);
}
