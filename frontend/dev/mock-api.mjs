// Sèvè mock ki imite API Laravel Kanè Dijital la (menm kontra JSON).
// Itilizasyon:  node dev/mock-api.mjs   →  http://localhost:8787/app/
// Kont demo:    telefòn 3700-0000, PIN 1234
// San okenn depandans: sèlman Node 18+.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

function normalizePhone(phone) {
  if (phone == null) return null;
  let d = String(phone).replace(/\D+/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  return d.length === 8 ? '509' + d : d;
}

function validPhone(phone) {
  const d = normalizePhone(phone);
  if (!d || !/^\d{10,15}$/.test(d)) return false;
  return d.startsWith('509') ? d.length === 11 : true;
}

// Chak apèl now() bay yon lè ki pi gran pase dènye a, pou "since" mache byen.
let lastNow = 0;
function now() {
  const t = Math.max(Date.now(), lastNow + 1);
  lastNow = t;
  return new Date(t).toISOString();
}

export function createState() {
  return { users: [], businesses: [], customers: [], transactions: [], reminders: [], tokens: new Map(), nextId: 1 };
}

export function seed(state) {
  const user = { id: state.nextId++, name: 'Manno Joseph', phone: '50937000000', pin: '1234', plan: 'free', trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString() };
  state.users.push(user);
  state.businesses.push({ id: state.nextId++, user_id: user.id, name: 'Boutik Manno', address: 'Ri Gabriel, Okap', phone: null, currency_default: 'HTG' });
  return user;
}

function recalc(state, customer) {
  customer.updated_at = now();
}

function balanceOf(state, customer) {
  const b = { HTG: 0, USD: 0 };
  for (const t of state.transactions) {
    if (t.customer_id !== customer.id || t.deleted_at) continue;
    b[t.currency] += t.type === 'credit' ? t.amount : -t.amount;
  }
  return b;
}

function businessJson(b) {
  return { id: b.id, name: b.name, address: b.address, phone: b.phone, currency_default: b.currency_default };
}

function userJson(state, u) {
  const b = state.businesses.find((x) => x.user_id === u.id);
  return {
    id: u.id, name: u.name, phone: u.phone, plan: u.plan,
    on_trial: new Date(u.trial_ends_at) > new Date(), trial_ends_at: u.trial_ends_at,
    business: b ? businessJson(b) : null,
  };
}

function customerJson(state, c, origin) {
  const b = balanceOf(state, c);
  return {
    uuid: c.uuid, name: c.name, phone: c.phone,
    balance: b, has_debt: b.HTG > 0 || b.USD > 0,
    public_url: `${origin}/k/${c.public_token}`,
    created_at: c.created_at, updated_at: c.updated_at, deleted_at: c.deleted_at,
  };
}

function txJson(state, t) {
  const c = state.customers.find((x) => x.id === t.customer_id);
  return {
    uuid: t.uuid, customer_uuid: c?.uuid, type: t.type, amount: t.amount, currency: t.currency,
    note: t.note, occurred_at: t.occurred_at, source: t.source,
    created_at: t.created_at, updated_at: t.updated_at, deleted_at: t.deleted_at,
  };
}

function issueToken(state, user) {
  const token = `${user.id}|${randomBytes(20).toString('hex')}`;
  state.tokens.set(token, user.id);
  return token;
}

/** Ajoute yon tranzaksyon dirèkteman sou "sèvè a" (pou simile yon lòt telefòn). */
export function serverAddTransaction(state, { customer_uuid, type, amount, currency = 'HTG', note = null }) {
  const c = state.customers.find((x) => x.uuid === customer_uuid);
  if (!c) throw new Error('customer not found');
  const t = { id: state.nextId++, uuid: randomUUID(), business_id: c.business_id, customer_id: c.id, type, amount, currency, note, occurred_at: now(), source: 'manual', created_at: now(), updated_at: now(), deleted_at: null };
  state.transactions.push(t);
  recalc(state, c);
  return t;
}

export function createMockServer({ state = createState(), freeCustomerLimit = Infinity } = {}) {
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  const invalid = (res, errors) => send(res, 422, { message: Object.values(errors)[0][0], errors });

  async function readJson(req) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  }

  function auth(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    const id = token && state.tokens.get(token);
    const user = id && state.users.find((u) => u.id === id);
    if (!user) return null;
    return { user, token, business: state.businesses.find((b) => b.user_id === user.id) };
  }

  async function serveStatic(res, rel) {
    const file = path.join(FRONTEND_ROOT, rel);
    if (!file.startsWith(FRONTEND_ROOT)) return send(res, 404, { message: 'Not found' });
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      send(res, 404, { message: 'Not found' });
    }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const origin = `http://${req.headers.host}`;
    const p = url.pathname;
    const m = req.method;

    // ---------- Fichye aplikasyon an ----------
    if (p === '/' || p === '/app') { res.writeHead(302, { Location: '/app/' }); return res.end(); }
    if (p.startsWith('/app/')) return serveStatic(res, p === '/app/' ? 'index.html' : p.slice(5));

    // ---------- Zouti pou tès ----------
    if (p === '/__mock/state') {
      return send(res, 200, {
        customers: state.customers.map((c) => ({ ...c, balance: balanceOf(state, c) })),
        transactions: state.transactions,
        reminders: state.reminders,
      });
    }
    if (p === '/__mock/transactions' && m === 'POST') return send(res, 201, serverAddTransaction(state, await readJson(req)));

    // ---------- Paj piblik ----------
    const pub = p.match(/^\/k\/([A-Za-z0-9]+)$/);
    if (pub) {
      const c = state.customers.find((x) => x.public_token === pub[1] && !x.deleted_at);
      if (!c) { res.writeHead(404); return res.end('Not found'); }
      const b = balanceOf(state, c);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><h1>Kanè ${c.name}</h1><p>Ou dwe ${b.HTG} HTG, ${b.USD} USD</p>`);
    }

    if (!p.startsWith('/api/')) return send(res, 404, { message: 'Not found' });

    // ---------- Koneksyon ----------
    if (p === '/api/auth/register' && m === 'POST') {
      const body = await readJson(req);
      const errors = {};
      const phone = normalizePhone(body.phone);
      if (!body.name) errors.name = ['Chan non an obligatwa.'];
      if (!body.business_name) errors.business_name = ['Chan non biznis la obligatwa.'];
      if (!validPhone(phone)) errors.phone = ['Nimewo telefòn nan pa bon. Egzanp: 3700-1234 oswa +509 3700-1234.'];
      else if (state.users.some((u) => u.phone === phone)) errors.phone = ['Gen yon kont ki deja itilize nimewo sa a.'];
      if (!/^\d{4,6}$/.test(body.pin || '')) errors.pin = ['PIN nan dwe gen 4 a 6 chif.'];
      else if (body.pin !== body.pin_confirmation) errors.pin = ['De PIN yo pa menm.'];
      if (Object.keys(errors).length) return invalid(res, errors);

      const user = { id: state.nextId++, name: body.name, phone, pin: body.pin, plan: 'free', trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString() };
      state.users.push(user);
      state.businesses.push({ id: state.nextId++, user_id: user.id, name: body.business_name, address: null, phone: null, currency_default: body.currency_default === 'USD' ? 'USD' : 'HTG' });
      return send(res, 201, { token: issueToken(state, user), user: userJson(state, user) });
    }

    if (p === '/api/auth/login' && m === 'POST') {
      const body = await readJson(req);
      const user = state.users.find((u) => u.phone === normalizePhone(body.phone));
      if (!user || user.pin !== body.pin) return invalid(res, { phone: ['Nimewo telefòn oswa PIN nan pa kòrèk.'] });
      return send(res, 200, { token: issueToken(state, user), user: userJson(state, user) });
    }

    const session = auth(req);
    if (!session) return send(res, 401, { message: 'Unauthenticated.' });
    const { user, business } = session;

    if (p === '/api/auth/me') return send(res, 200, { data: userJson(state, user) });
    if (p === '/api/auth/logout' && m === 'POST') { state.tokens.delete(session.token); return send(res, 200, { message: 'Ou dekonekte.' }); }

    if (p === '/api/business' && m === 'GET') return send(res, 200, { data: businessJson(business) });
    if (p === '/api/business' && m === 'PUT') {
      const body = await readJson(req);
      if (body.phone && !validPhone(body.phone)) return invalid(res, { phone: ['Nimewo telefòn nan pa bon.'] });
      if ('name' in body) {
        if (!body.name) return invalid(res, { name: ['Chan non an obligatwa.'] });
        business.name = body.name;
      }
      if ('address' in body) business.address = body.address;
      if ('phone' in body) business.phone = normalizePhone(body.phone);
      return send(res, 200, { data: businessJson(business) });
    }

    // ---------- Sync ----------
    if (p === '/api/sync/push' && m === 'POST') {
      const body = await readJson(req);
      const accepted = { customers: [], transactions: [] };
      const rejected = [];

      for (const row of body.customers ?? []) {
        let c = state.customers.find((x) => x.uuid === row.uuid);
        if (c && c.business_id !== business.id) { rejected.push({ type: 'customer', uuid: row.uuid, reason: 'uuid_conflict' }); continue; }
        if (!c) {
          const count = state.customers.filter((x) => x.business_id === business.id && !x.deleted_at).length;
          if (count >= freeCustomerLimit) { rejected.push({ type: 'customer', uuid: row.uuid, reason: 'customer_limit' }); continue; }
          c = { id: state.nextId++, uuid: row.uuid, business_id: business.id, name: row.name, phone: normalizePhone(row.phone), public_token: randomBytes(20).toString('hex'), created_at: now(), updated_at: now(), deleted_at: null };
          state.customers.push(c);
        } else if (!row.updated_at || new Date(row.updated_at) >= new Date(c.updated_at)) {
          Object.assign(c, { name: row.name, phone: normalizePhone(row.phone), updated_at: now() });
        }
        if (row.deleted_at && !c.deleted_at) Object.assign(c, { deleted_at: now(), updated_at: now() });
        accepted.customers.push(row.uuid);
      }

      for (const row of body.transactions ?? []) {
        const existing = state.transactions.find((x) => x.uuid === row.uuid);
        if (existing) {
          if (existing.business_id !== business.id) { rejected.push({ type: 'transaction', uuid: row.uuid, reason: 'uuid_conflict' }); continue; }
          if (row.deleted_at && !existing.deleted_at) {
            Object.assign(existing, { deleted_at: now(), updated_at: now() });
            recalc(state, state.customers.find((c) => c.id === existing.customer_id));
          }
          accepted.transactions.push(row.uuid);
          continue;
        }
        const c = state.customers.find((x) => x.uuid === row.customer_uuid && x.business_id === business.id);
        if (!c) { rejected.push({ type: 'transaction', uuid: row.uuid, reason: 'customer_not_found' }); continue; }
        const t = { id: state.nextId++, uuid: row.uuid, business_id: business.id, customer_id: c.id, type: row.type, amount: Number(row.amount), currency: row.currency || business.currency_default, note: row.note ?? null, occurred_at: row.occurred_at, source: 'sync', created_at: now(), updated_at: now(), deleted_at: row.deleted_at ? now() : null };
        state.transactions.push(t);
        recalc(state, c);
        accepted.transactions.push(row.uuid);
      }

      return send(res, 200, { accepted, rejected, server_time: now() });
    }

    if (p === '/api/sync/pull' && m === 'GET') {
      const serverTime = now();
      const since = url.searchParams.get('since');
      const after = (r) => !since || new Date(r.updated_at) >= new Date(since);
      return send(res, 200, {
        customers: state.customers.filter((c) => c.business_id === business.id && after(c)).map((c) => customerJson(state, c, origin)),
        transactions: state.transactions.filter((t) => t.business_id === business.id && after(t)).map((t) => txJson(state, t)),
        has_more: false,
        next_since: serverTime,
      });
    }

    const rem = p.match(/^\/api\/customers\/([\w-]+)\/reminders$/);
    if (rem && m === 'POST') {
      const c = state.customers.find((x) => x.uuid === rem[1] && x.business_id === business.id && !x.deleted_at);
      if (!c) return send(res, 404, { message: 'Not found' });
      const body = await readJson(req);
      state.reminders.push({ customer_uuid: c.uuid, channel: body.channel || 'whatsapp', sent_at: now() });
      return send(res, 201, { channel: body.channel || 'whatsapp' });
    }

    return send(res, 404, { message: 'Not found' });
  });

  return { server, state };
}

// Lanse dirèkteman: node dev/mock-api.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 8787);
  const { server, state } = createMockServer();
  seed(state);
  server.listen(port, () => {
    console.log(`Kanè Dijital mock: http://localhost:${port}/app/`);
    console.log('Kont demo: telefòn 3700-0000, PIN 1234');
  });
}
