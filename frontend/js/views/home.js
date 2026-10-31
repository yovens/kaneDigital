// Akèy: rezime lajan an, gwo bouton aksyon yo, ak dènye operasyon yo.

import * as db from '../db.js';
import { html, raw, icons } from '../ui.js';
import { summary, visible } from '../stats.js';
import { money, moneyShort, relativeDate } from '../format.js';
import { topbar, bottomNav, bindChrome } from './shared.js';

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function todayValue(bucket) {
  const parts = [];
  if (bucket.HTG > 0 || bucket.USD === 0) parts.push(moneyShort(bucket.HTG, 'HTG'));
  if (bucket.USD > 0) parts.push(moneyShort(bucket.USD, 'USD'));
  return parts.map((p, i) => html`${i ? html`<br>` : ''}${p}`);
}

function recentRow(t, customer) {
  const credit = t.type === 'credit';
  return html`<li><a class="row" href="#/c/${customer.uuid}">
    <span class="sign ${credit ? 'sign-credit' : 'sign-pay'}" aria-hidden="true">${credit ? '+' : '−'}</span>
    <span class="row-main">
      <span class="row-name">${customer.name}</span>
      <span class="row-sub">${credit ? 'Kredi' : 'Peman'}${t.note ? `, ${t.note}` : ''}, ${relativeDate(t.occurred_at)}</span>
    </span>
    <span class="row-amount num ${credit ? 'debt' : 'paid'}">${moneyShort(t.amount, t.currency)}</span>
  </a></li>`;
}

export async function render() {
  const [customers, transactions, business, user] = await Promise.all([
    db.getAll('customers'),
    db.getAll('transactions'),
    db.getMeta('business'),
    db.getMeta('user'),
  ]);
  const s = summary(customers, transactions);
  const byUuid = new Map(visible(customers).map((c) => [c.uuid, c]));
  const recent = visible(transactions)
    .filter((t) => byUuid.has(t.customer_uuid))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 5);

  const content = html`
    ${topbar({ title: business?.name ?? 'Kanè Dijital' })}
    <main class="screen">
      <section class="hero">
        <p class="hero-greeting">Bonjou${user?.name ? `, ${firstName(user.name)}` : ''}</p>
        <div class="hero-card">
          <p class="hero-label">${s.debtors ? `${s.debtors} moun dwe w` : 'Pèsonn pa dwe w'}</p>
          <p class="hero-amount owed num ${s.totalOwed.HTG > 0 ? 'debt' : 'muted'}">${money(s.totalOwed.HTG, 'HTG')}</p>
          ${s.totalOwed.USD > 0 ? html`<p class="hero-usd num debt">${money(s.totalOwed.USD, 'USD')}</p>` : ''}
          <div class="hero-stats">
            <span class="stat"><span class="stat-label">Kredi jodi a</span><span class="stat-value num debt">${todayValue(s.today.credits)}</span></span>
            <span class="stat"><span class="stat-label">Peman jodi a</span><span class="stat-value num paid">${todayValue(s.today.payments)}</span></span>
          </div>
        </div>
      </section>

      <section class="tiles" aria-label="Aksyon">
        <a class="tile tile-brand" href="#/new"><span class="tile-icon">${raw(icons.userPlus)}</span>Nouvo kliyan</a>
        <button class="tile tile-credit" data-quick-action="credit"><span class="tile-icon">${raw(icons.credit)}</span>Bay kredi</button>
        <button class="tile tile-pay" data-quick-action="payment"><span class="tile-icon">${raw(icons.cash)}</span>Resevwa peman</button>
        <button class="tile tile-amber" data-quick-action="reminder"><span class="tile-icon">${raw(icons.bell)}</span>Voye rapèl${s.overdue ? html`<span class="row-sub" style="color:inherit">${s.overdue} an reta</span>` : ''}</button>
        <a class="tile tile-wide" href="#/reports"><span class="tile-icon">${raw(icons.chart)}</span>Wè rapò yo<span class="tile-arrow">${raw(icons.arrow)}</span></a>
      </section>

      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Dènye operasyon</h2>
          ${byUuid.size ? html`<a class="section-link" href="#/customers">Tout kliyan yo</a>` : ''}
        </div>
        <div class="card">
          ${recent.length
            ? html`<ul class="list">${recent.map((t) => recentRow(t, byUuid.get(t.customer_uuid)))}</ul>`
            : html`<p class="empty">${byUuid.size
              ? 'Poko gen operasyon. Peze “Bay kredi” lè yon kliyan pran yon bagay.'
              : html`<strong>Kanè w la vid.</strong>Kòmanse pa ajoute premye kliyan ki pran kredi nan men w.`}</p>`}
        </div>
      </section>
    </main>
    ${bottomNav('home')}`;

  return { html: content, bind: bindChrome };
}
