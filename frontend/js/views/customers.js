// Lis kliyan yo: rechèch, filtè, balans chak moun.

import * as db from '../db.js';
import { html, raw, icons } from '../ui.js';
import { owes } from '../stats.js';
import { topbar, bottomNav, bindChrome, avatar, amountCell, customerRowSub, loadCustomerItems } from './shared.js';

// Rechèch ak filtè a rete menm lè ekran an re-afiche apre yon sync.
const state = { query: '', filter: 'all' };

function matches(item, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.c.name.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D+/g, '');
  return digits.length >= 3 && (item.c.phone || '').includes(digits);
}

function renderList(items) {
  let list = items.filter((i) => matches(i, state.query.trim()));
  if (state.filter === 'owing') {
    list = list.filter((i) => owes(i.b)).sort((a, b) => b.b.HTG - a.b.HTG || b.b.USD - a.b.USD);
  } else if (state.filter === 'overdue') {
    list = list.filter((i) => i.overdue).sort((a, b) => b.b.HTG - a.b.HTG);
  }

  if (!items.length) {
    return html`<li class="empty"><strong>Kanè w la vid.</strong>Ajoute premye kliyan ki pran kredi nan men w.</li>`;
  }
  if (!list.length) {
    return html`<li class="empty">${state.query ? `Pa gen kliyan ki rele “${state.query}”.` : 'Pa gen kliyan nan lis sa a.'}</li>`;
  }
  return list.map((i) => html`<li><a class="row" href="#/c/${i.c.uuid}">
    ${avatar(i.c.name)}
    <span class="row-main"><span class="row-name">${i.c.name}</span><span class="row-sub">${customerRowSub(i)}</span></span>
    ${amountCell(i.b)}
  </a></li>`);
}

export async function render() {
  const [items, business] = await Promise.all([loadCustomerItems(), db.getMeta('business')]);
  items.sort((a, b) => (b.b.last_activity_at || b.c.created_at || '').localeCompare(a.b.last_activity_at || a.c.created_at || ''));

  const counts = {
    all: items.length,
    owing: items.filter((i) => owes(i.b)).length,
    overdue: items.filter((i) => i.overdue).length,
  };
  const chip = (key, label) => html`<button class="chip" data-filter="${key}" aria-pressed="${state.filter === key}">${label} (${counts[key]})</button>`;

  const content = html`
    ${topbar({ title: business?.name ?? 'Kanè Dijital' })}
    <main class="screen">
      <div class="section-head">
        <h2 class="section-title">Kliyan yo</h2>
        <a class="btn btn-ink btn-small" href="#/new">${raw(icons.plus)} Nouvo kliyan</a>
      </div>
      ${items.length ? html`
        <label class="search">
          <span class="visually-hidden">Chèche yon kliyan</span>
          ${raw(icons.search)}
          <input type="search" data-search placeholder="Chèche pa non oswa telefòn" value="${state.query}" autocomplete="off">
        </label>
        <div class="filters" role="group" aria-label="Filtre lis la">
          ${chip('all', 'Tout')}${chip('owing', 'Ki dwe')}${chip('overdue', 'An reta')}
        </div>` : ''}
      <div class="card"><ul class="list" data-list aria-label="Kliyan yo">${renderList(items)}</ul></div>
    </main>
    ${bottomNav('customers')}`;

  return {
    html: content,
    bind(root) {
      bindChrome(root);
      const list = root.querySelector('[data-list]');
      const refresh = () => { list.innerHTML = String(html`${renderList(items)}`); };
      root.querySelector('[data-search]')?.addEventListener('input', (e) => {
        state.query = e.target.value;
        refresh();
      });
      root.querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        refresh();
      }));
    },
  };
}
