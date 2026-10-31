// Rapò: konbyen kòb deyò, kiyès ki pi an reta, ak sa ki antre/soti 7 dènye jou yo.

import * as db from '../db.js';
import { html } from '../ui.js';
import { summary, visible, owes } from '../stats.js';
import { money, moneyShort } from '../format.js';
import { topbar, bottomNav, bindChrome, avatar, amountCell, customerRowSub, loadCustomerItems } from './shared.js';

const DAYS = ['Dim', 'Len', 'Mad', 'Mèk', 'Jed', 'Van', 'Sam'];

/** 7 dènye jou yo (jodi a enkli), an goud. */
function lastSevenDays(transactions, liveUuids, now = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    days.push({ start, end, label: i === 0 ? 'Jodi a' : DAYS[start.getDay()], credit: 0, payment: 0 });
  }
  for (const t of visible(transactions)) {
    if (t.currency !== 'HTG' || !liveUuids.has(t.customer_uuid)) continue;
    const at = new Date(t.occurred_at);
    const day = days.find((d) => at >= d.start && at < d.end);
    if (day) day[t.type === 'credit' ? 'credit' : 'payment'] += Number(t.amount) || 0;
  }
  return days;
}

function chart(days) {
  const max = Math.max(1, ...days.flatMap((d) => [d.credit, d.payment]));
  const pct = (v) => (v > 0 ? Math.max(2, Math.round((v / max) * 100)) : 0);
  return html`
    <ul class="legend" aria-hidden="true">
      <li><span class="swatch swatch-credit"></span>Kredi bay</li>
      <li><span class="swatch swatch-pay"></span>Peman resevwa</li>
    </ul>
    <div class="chart" aria-hidden="true">
      ${days.map((d) => html`<button class="chart-day" type="button" tabindex="-1">
        <span class="bar bar-credit" style="height:${pct(d.credit)}%"></span>
        <span class="bar bar-pay" style="height:${pct(d.payment)}%"></span>
        <span class="chart-tip">${d.label}: ${moneyShort(d.credit)} kredi, ${moneyShort(d.payment)} peman</span>
      </button>`)}
    </div>
    <div class="chart-labels" aria-hidden="true">${days.map((d) => html`<span>${d.label}</span>`)}</div>
    <table class="visually-hidden">
      <caption>Kredi ak peman an goud, 7 dènye jou yo</caption>
      <thead><tr><th>Jou</th><th>Kredi</th><th>Peman</th></tr></thead>
      <tbody>${days.map((d) => html`<tr><td>${d.label}</td><td>${money(d.credit)}</td><td>${money(d.payment)}</td></tr>`)}</tbody>
    </table>`;
}

function customerList(items, emptyText) {
  if (!items.length) return html`<p class="empty">${emptyText}</p>`;
  return html`<ul class="list">${items.map((i) => html`<li><a class="row" href="#/c/${i.c.uuid}">
    ${avatar(i.c.name)}
    <span class="row-main"><span class="row-name">${i.c.name}</span><span class="row-sub">${customerRowSub(i)}</span></span>
    ${amountCell(i.b)}
  </a></li>`)}</ul>`;
}

export async function render() {
  const [customers, transactions, items, business] = await Promise.all([
    db.getAll('customers'),
    db.getAll('transactions'),
    loadCustomerItems(),
    db.getMeta('business'),
  ]);
  const s = summary(customers, transactions);
  const days = lastSevenDays(transactions, new Set(items.map((i) => i.c.uuid)));
  const week = days.reduce((acc, d) => ({ credit: acc.credit + d.credit, payment: acc.payment + d.payment }), { credit: 0, payment: 0 });

  const top = items.filter((i) => owes(i.b)).sort((a, b) => b.b.HTG - a.b.HTG || b.b.USD - a.b.USD).slice(0, 5);
  const late = items.filter((i) => i.overdue).sort((a, b) => b.b.HTG - a.b.HTG);

  const content = html`
    ${topbar({ title: business?.name ?? 'Kanè Dijital' })}
    <main class="screen">
      <h2 class="section-title">Rapò</h2>
      <div class="report-grid">
        <span class="stat"><span class="stat-label">Kòb ki deyò</span>
          <span class="stat-value num debt" data-report-owed>${moneyShort(s.totalOwed.HTG)}</span>
          ${s.totalOwed.USD > 0 ? html`<span class="stat-value num debt">${moneyShort(s.totalOwed.USD, 'USD')}</span>` : ''}</span>
        <span class="stat"><span class="stat-label">Moun ki dwe</span><span class="stat-value num">${s.debtors}</span></span>
        <span class="stat"><span class="stat-label">Antre 7 jou</span><span class="stat-value num paid">${moneyShort(week.payment)}</span></span>
        <span class="stat"><span class="stat-label">An reta (${14}+ jou)</span><span class="stat-value num ${late.length ? 'debt' : ''}">${late.length}</span></span>
      </div>

      <section class="card report-card" aria-label="Kredi ak peman 7 dènye jou yo">
        <h3 class="section-title">7 dènye jou yo <span class="muted" style="font-weight:700;font-size:15px">(an goud)</span></h3>
        ${chart(days)}
      </section>

      <section class="section">
        <h3 class="section-title">Moun ki dwe plis</h3>
        <div class="card">${customerList(top, 'Pèsonn pa dwe w kounye a.')}</div>
      </section>

      <section class="section">
        <h3 class="section-title">An reta</h3>
        <div class="card">${customerList(late, 'Pa gen kliyan an reta. Bon travay!')}</div>
      </section>
    </main>
    ${bottomNav('reports')}`;

  return { html: content, bind: bindChrome };
}
