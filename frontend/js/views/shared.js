import * as db from '../db.js';
import { html, raw, icons, sheet } from '../ui.js';
import { getStatus, syncNow } from '../sync.js';
import { moneyShort, initials, relativeDate } from '../format.js';
import { balancesByCustomer, emptyBalance, visible, owes, isOverdue } from '../stats.js';
import { openEntry } from './entry.js';
import { sendReminder } from '../reminder.js';

// ---------- Endikatè sync ----------

export function syncLabel(s) {
  if (s.state === 'syncing') return { key: 'syncing', text: 'Ap senkronize…' };
  if (s.state === 'offline') return { key: 'offline', text: s.pending ? `Offline, ${s.pending} ap tann` : 'Offline' };
  if (s.state === 'error') return { key: 'error', text: 'Sync pa pase' };
  if (s.pending) return { key: 'pending', text: `${s.pending} ap tann` };
  return { key: 'ok', text: 'Tout sove' };
}

export function syncPill() {
  const { key, text } = syncLabel(getStatus());
  return html`<button class="sync-pill" data-sync data-state="${key}" aria-label="Senkronize kounye a">
    <span class="dot" aria-hidden="true"></span><span class="sync-text">${text}</span></button>`;
}

export function updateSyncPills(status) {
  const { key, text } = syncLabel(status);
  for (const el of document.querySelectorAll('[data-sync]')) {
    el.dataset.state = key;
    const t = el.querySelector('.sync-text');
    if (t) t.textContent = text;
  }
}

// ---------- Tèt + navigasyon ----------

export function topbar({ title, back = null }) {
  return html`
    <header class="topbar">
      ${back ? html`<a class="icon-btn" href="${back}" aria-label="Retounen">${raw(icons.back)}</a>` : ''}
      <h1>${title}</h1>
      ${syncPill()}
    </header>`;
}

const NAV = [
  { key: 'home', href: '#/', label: 'Akèy', icon: icons.home },
  { key: 'customers', href: '#/customers', label: 'Kliyan', icon: icons.users },
  null, // bouton + nan mitan an
  { key: 'reports', href: '#/reports', label: 'Rapò', icon: icons.chart },
  { key: 'settings', href: '#/settings', label: 'Paramèt', icon: icons.settings },
];

export function bottomNav(active) {
  return html`<nav class="bottom-nav" aria-label="Navigasyon prensipal">
    ${NAV.map((item) => (item
      ? html`<a class="nav-item" href="${item.href}" ${raw(item.key === active ? 'aria-current="page"' : '')}>${raw(item.icon)}${item.label}</a>`
      : html`<button class="nav-plus" data-plus aria-label="Nouvo operasyon">${raw(icons.plus)}</button>`))}
  </nav>`;
}

/** Tèt + nav: aksyon ki pataje sou tout ekran ki gen ba navigasyon an. */
export function bindChrome(root) {
  root.querySelector('[data-sync]')?.addEventListener('click', () => syncNow());
  root.querySelector('[data-plus]')?.addEventListener('click', () => openActionMenu());
  root.querySelectorAll('[data-quick-action]').forEach((el) => el.addEventListener('click', () => {
    quickAction(el.dataset.quickAction);
  }));
}

// Pou ekran ki pa gen nav (ansyen non an).
export const bindTopbar = bindChrome;

// ---------- Ti eleman pou lis yo ----------

export function avatar(name) {
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return html`<span class="avatar avatar-${hash % 4}" aria-hidden="true">${initials(name)}</span>`;
}

export function amountCell(b) {
  if (b.HTG === 0 && b.USD === 0) return html`<span class="row-amount num muted">0</span>`;
  const main = b.HTG !== 0 ? { v: b.HTG, c: 'HTG' } : { v: b.USD, c: 'USD' };
  const extra = b.HTG !== 0 && b.USD !== 0 ? { v: b.USD, c: 'USD' } : null;
  const tone = (v) => (v > 0 ? 'debt' : 'paid');
  return html`<span class="row-amount num ${tone(main.v)}">${main.v < 0 ? 'Avans ' : ''}${moneyShort(Math.abs(main.v), main.c)}${extra ? html`<small class="${tone(extra.v)}">${moneyShort(Math.abs(extra.v), extra.c)}</small>` : ''}</span>`;
}

export function toneOf(value) {
  if (value > 0) return 'debt';
  if (value < 0) return 'paid';
  return 'muted';
}

/** Kliyan + balans yo, pou lis yo ak chwazi kliyan. */
export async function loadCustomerItems() {
  const [customers, transactions] = await Promise.all([db.getAll('customers'), db.getAll('transactions')]);
  const balances = balancesByCustomer(transactions);
  return visible(customers).map((c) => {
    const b = balances.get(c.uuid) ?? emptyBalance();
    return { c, b, overdue: isOverdue(b) };
  });
}

export function customerRowSub(item) {
  if (item.c._rejected) return html`<span class="flag">Pa sove sou sèvè a</span>`;
  if (item.overdue) return html`<span class="flag">An reta</span>, ${relativeDate(item.b.last_activity_at)}`;
  if (item.b.last_activity_at) return relativeDate(item.b.last_activity_at);
  return 'Poko gen operasyon';
}

// ---------- Aksyon rapid: chwazi yon kliyan, apre sa aji ----------

const QUICK = {
  credit: {
    title: 'Kredi pou kiyès?',
    filter: () => true,
    act: (item, business) => openEntry({ customer: item.c, type: 'credit', balance: item.b, defaultCurrency: business?.currency_default }),
  },
  payment: {
    title: 'Kiyès k ap peye?',
    filter: () => true,
    sort: (a, b) => Number(owes(b.b)) - Number(owes(a.b)) || b.b.HTG - a.b.HTG,
    act: (item, business) => openEntry({ customer: item.c, type: 'payment', balance: item.b, defaultCurrency: business?.currency_default }),
  },
  reminder: {
    title: 'Voye rapèl bay kiyès?',
    filter: (i) => owes(i.b) && i.c.phone,
    sort: (a, b) => Number(b.overdue) - Number(a.overdue) || b.b.HTG - a.b.HTG,
    empty: 'Pa gen kliyan ki dwe w epi ki gen yon nimewo telefòn.',
    act: (item, business) => sendReminder({ customer: item.c, balance: item.b, businessName: business?.name ?? 'boutik la', channel: 'whatsapp' }),
  },
};

export async function quickAction(kind) {
  const cfg = QUICK[kind];
  const [items, business] = await Promise.all([loadCustomerItems(), db.getMeta('business')]);
  let list = items.filter(cfg.filter);
  list.sort(cfg.sort ?? ((a, b) => (b.b.last_activity_at || '').localeCompare(a.b.last_activity_at || '')));

  const rows = (query) => {
    const q = query.trim().toLowerCase();
    const shown = q ? list.filter((i) => i.c.name.toLowerCase().includes(q) || (q.replace(/\D/g, '').length >= 3 && (i.c.phone || '').includes(q.replace(/\D/g, '')))) : list;
    if (!items.length) {
      return html`<li class="empty"><strong>Ou poko gen kliyan.</strong>Ajoute premye kliyan ou anvan.<br>
        <a class="btn btn-ink btn-small" href="#/new" data-close>Ajoute yon kliyan</a></li>`;
    }
    if (!shown.length) return html`<li class="empty">${q ? `Pa gen kliyan ki rele “${query}”.` : cfg.empty ?? 'Pa gen kliyan.'}</li>`;
    return shown.map((i) => html`<li><button class="row" data-pick="${i.c.uuid}">
      ${avatar(i.c.name)}
      <span class="row-main"><span class="row-name">${i.c.name}</span><span class="row-sub">${customerRowSub(i)}</span></span>
      ${amountCell(i.b)}
    </button></li>`);
  };

  sheet({
    title: cfg.title,
    body: html`
      ${items.length > 5 ? html`<label class="search"><span class="visually-hidden">Chèche</span>${raw(icons.search)}
        <input type="search" data-picker-search placeholder="Chèche pa non oswa telefòn" autocomplete="off" autofocus></label>` : ''}
      <ul class="list" data-picker-list>${rows('')}</ul>`,
    bind(root, close) {
      const listEl = root.querySelector('[data-picker-list]');
      root.querySelector('[data-picker-search]')?.addEventListener('input', (e) => {
        listEl.innerHTML = String(html`${rows(e.target.value)}`);
      });
      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-pick]');
        if (!btn) return;
        const item = list.find((i) => i.c.uuid === btn.dataset.pick);
        close();
        // Kite fèy la fèmen anvan n louvri pwochen an.
        setTimeout(() => cfg.act(item, business), 200);
      });
    },
  });
}

export function openActionMenu() {
  sheet({
    title: 'Sa w vle fè?',
    body: html`<div class="menu">
      <button class="tile tile-credit" data-menu="credit"><span class="tile-icon">${raw(icons.credit)}</span>Bay kredi</button>
      <button class="tile tile-pay" data-menu="payment"><span class="tile-icon">${raw(icons.cash)}</span>Resevwa peman</button>
      <a class="tile tile-brand" href="#/new" data-close><span class="tile-icon">${raw(icons.userPlus)}</span>Ajoute yon kliyan</a>
    </div>`,
    bind(root, close) {
      root.querySelectorAll('[data-menu]').forEach((btn) => btn.addEventListener('click', () => {
        close();
        setTimeout(() => quickAction(btn.dataset.menu), 200);
      }));
    },
  });
}

