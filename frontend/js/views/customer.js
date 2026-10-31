import * as db from '../db.js';
import * as store from '../store.js';
import { html, raw, icons, sheet, confirmSheet, toast } from '../ui.js';
import { balancesByCustomer, emptyBalance, visible, owes } from '../stats.js';
import { money, displayPhone, relativeDate } from '../format.js';
import { topbar, bindTopbar, toneOf, avatar } from './shared.js';
import { openEntry } from './entry.js';
import { sendReminder } from '../reminder.js';

const REJECTED = {
  customer_limit: 'Kliyan sa a pa sove sou sèvè a: ou rive nan limit plan gratis la. Done yo rete nan telefòn ou.',
  customer_not_found: 'Operasyon sa a pa sove sou sèvè a paske kliyan an pa la.',
  uuid_conflict: 'Sèvè a refize chanjman sa a.',
};

function balanceBlock(b) {
  if (!owes(b) && b.HTG >= 0 && b.USD >= 0) {
    return html`<div class="balance"><span class="balance-label">Balans</span>
      <span class="balance-amount paid">Pa dwe anyen</span></div>`;
  }
  const lines = [];
  for (const cur of ['HTG', 'USD']) {
    if (b[cur] !== 0) lines.push(html`<span class="balance-amount num ${toneOf(b[cur])}">${b[cur] < 0 ? 'Avans ' : ''}${money(Math.abs(b[cur]), cur)}</span>`);
  }
  return html`<div class="balance"><span class="balance-label">${owes(b) ? 'Dwe w' : 'Balans'}</span>${lines}</div>`;
}

function historyRow(t) {
  const credit = t.type === 'credit';
  return html`<li><button class="row" data-tx="${t.uuid}">
    <span class="sign ${credit ? 'sign-credit' : 'sign-pay'}" aria-hidden="true">${credit ? '+' : '−'}</span>
    <span class="row-main">
      <span class="row-name">${credit ? 'Kredi' : 'Peman'}${t.note ? html`<span class="muted" style="font-weight:600">, ${t.note}</span>` : ''}</span>
      <span class="row-sub">${relativeDate(t.occurred_at)}${t._dirty ? ', ap tann sync' : ''}${t._rejected ? html`, <span class="flag">pa sove</span>` : ''}</span>
    </span>
    <span class="row-amount num ${credit ? 'debt' : 'paid'}">${money(t.amount, t.currency)}</span>
  </button></li>`;
}

export async function render({ params }) {
  const [{ customer, transactions }, business] = await Promise.all([
    store.customerWithTransactions(params.uuid),
    db.getMeta('business'),
  ]);

  if (!customer || customer.deleted_at) {
    return {
      html: html`${topbar({ title: 'Kliyan', back: '#/customers' })}
        <main class="screen screen-plain"><p class="card empty"><strong>Kliyan sa a pa la ankò.</strong>
        <a class="section-link" href="#/customers">Retounen nan lis kliyan yo</a></p></main>`,
      bind: bindTopbar,
    };
  }

  const live = visible(transactions).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const b = balancesByCustomer(live).get(customer.uuid) ?? emptyBalance();
  const canRemind = Boolean(customer.phone) && owes(b);
  const rejectedTx = live.some((t) => t._rejected);

  const content = html`
    ${topbar({ title: 'Kliyan', back: '#/customers' })}
    <main class="screen screen-plain">
      <section class="customer-hero">
        <div class="customer-card">
          <div class="customer-top">
            ${avatar(customer.name)}
            <div>
              <h2 class="customer-name">${customer.name}</h2>
              <p class="customer-phone">${customer.phone ? displayPhone(customer.phone) : 'Pa gen telefòn'}</p>
            </div>
          </div>
          ${balanceBlock(b)}
          <div class="quick-actions">
            ${canRemind ? html`
              <button class="btn btn-quiet btn-small" data-remind="whatsapp">${raw(icons.whatsapp)} Rapèl WhatsApp</button>
              <button class="btn btn-quiet btn-small" data-remind="sms">${raw(icons.sms)} SMS</button>` : ''}
            <a class="btn btn-quiet btn-small" href="#/c/${customer.uuid}/edit">${raw(icons.edit)} Modifye</a>
          </div>
        </div>
      </section>
      ${customer._rejected ? html`<p class="notice">${REJECTED[customer._rejected] ?? REJECTED.uuid_conflict}</p>` : ''}
      ${rejectedTx && !customer._rejected ? html`<p class="notice">${REJECTED.customer_not_found}</p>` : ''}
      <section class="section">
        <h3 class="section-title">Istorik</h3>
        <div class="card">
          ${live.length
            ? html`<ul class="list history" aria-label="Istorik">${live.map(historyRow)}</ul>`
            : html`<p class="empty history">Poko gen operasyon. Peze “Bay kredi” lè ${customer.name} pran yon bagay.</p>`}
        </div>
      </section>
    </main>
    <div class="action-bar">
      <button class="btn btn-credit" data-entry="credit">${raw(icons.credit)} Bay kredi</button>
      <button class="btn btn-payment" data-entry="payment">${raw(icons.cash)} Resevwa peman</button>
    </div>`;

  return {
    html: content,
    bind(root) {
      bindTopbar(root);

      root.querySelectorAll('[data-entry]').forEach((btn) => btn.addEventListener('click', () => {
        openEntry({
          customer,
          type: btn.dataset.entry,
          balance: b,
          defaultCurrency: business?.currency_default ?? 'HTG',
        });
      }));

      root.querySelectorAll('[data-remind]').forEach((btn) => btn.addEventListener('click', () => {
        sendReminder({ customer, balance: b, businessName: business?.name ?? 'boutik la', channel: btn.dataset.remind });
      }));

      root.querySelector('.history').addEventListener('click', (e) => {
        const row = e.target.closest('[data-tx]');
        if (!row) return;
        const t = live.find((x) => x.uuid === row.dataset.tx);
        if (t) openTransaction(t);
      });
    },
  };
}

function openTransaction(t) {
  const credit = t.type === 'credit';
  sheet({
    title: credit ? 'Kredi' : 'Peman',
    body: html`
      <p class="balance-amount num ${credit ? 'debt' : 'paid'}" style="margin:0">${money(t.amount, t.currency)}</p>
      <p class="sheet-text">${t.note || 'San nòt'}<br><span class="muted">${relativeDate(t.occurred_at)}</span></p>
      <p class="sheet-text muted">Si w te fè yon erè, efase operasyon sa a epi anrejistre l ankò.</p>
      <button class="btn btn-quiet btn-block debt" data-delete>Efase operasyon sa a</button>`,
    bind(root, close) {
      root.querySelector('[data-delete]').addEventListener('click', async () => {
        close();
        const ok = await confirmSheet({
          title: 'Efase operasyon an?',
          message: `${credit ? 'Kredi' : 'Peman'} ${money(t.amount, t.currency)} ap disparèt, epi balans lan ap chanje.`,
          confirmLabel: 'Efase',
        });
        if (!ok) return;
        await store.deleteTransaction(t.uuid);
        toast('Operasyon an efase');
      });
    },
  });
}
