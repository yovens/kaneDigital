// Fèy "Bay kredi" / "Resevwa peman". Se aksyon moun nan ap fè plis la,
// kidonk li dwe vit: montan an gen fokis touswit, gen montan rapid, 1 klik pou sove.

import { html, sheet, toast } from '../ui.js';
import { money, parseAmount } from '../format.js';
import * as store from '../store.js';

const QUICK = { HTG: [100, 250, 500, 1000, 2500], USD: [5, 10, 20, 50] };

export function openEntry({ customer, type, balance, defaultCurrency = 'HTG' }) {
  const isCredit = type === 'credit';
  let currency = defaultCurrency;

  const quick = (cur) => QUICK[cur].map((v) => html`<button type="button" data-quick="${v}">${money(v, cur).replace(/[,.]00(?= HTG|$)/, '')}</button>`);

  sheet({
    title: isCredit ? `Kredi pou ${customer.name}` : `Peman ${customer.name}`,
    body: html`
      <form class="${isCredit ? 'entry-credit' : 'entry-payment'}" data-entry novalidate style="display:grid;gap:16px">
        <div class="field">
          <label for="amount">Montan</label>
          <input id="amount" name="amount" class="amount-input num" inputmode="decimal" autocomplete="off" placeholder="0" autofocus>
          <span class="error" data-error role="alert"></span>
        </div>
        <div class="quick-amounts" data-quick-list>${quick(currency)}</div>
        <div class="segmented" role="group" aria-label="Lajan">
          <button type="button" data-currency="HTG" aria-pressed="${currency === 'HTG'}">Goud (HTG)</button>
          <button type="button" data-currency="USD" aria-pressed="${currency === 'USD'}">Dola (USD)</button>
        </div>
        <div class="field">
          <label for="note">${isCredit ? 'Sa l pran' : 'Nòt'} <span class="muted">(si w vle)</span></label>
          <input id="note" name="note" maxlength="255" autocomplete="off" placeholder="${isCredit ? 'Egzanp: 2 sak diri' : 'Egzanp: MonCash'}">
        </div>
        <p class="muted" data-hint style="margin:0"></p>
        <button class="btn btn-block ${isCredit ? 'btn-credit' : 'btn-payment'}" type="submit">
          ${isCredit ? 'Anrejistre kredi' : 'Anrejistre peman'}
        </button>
      </form>`,
    bind(root, close) {
      const form = root.querySelector('[data-entry]');
      const input = form.amount;
      const error = form.querySelector('[data-error]');
      const hint = form.querySelector('[data-hint]');

      const updateHint = () => {
        const value = parseAmount(input.value);
        const current = balance[currency] || 0;
        if (!Number.isFinite(value) || value <= 0) { hint.textContent = ''; return; }
        const after = isCredit ? current + value : current - value;
        hint.textContent = after < 0
          ? `Apre sa, ${customer.name} ap gen yon avans ${money(-after, currency)}.`
          : `Apre sa, ${customer.name} ap dwe ${money(after, currency)}.`;
      };

      input.addEventListener('input', () => {
        error.textContent = '';
        input.removeAttribute('aria-invalid');
        updateHint();
      });

      form.querySelector('[data-quick-list]').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-quick]');
        if (!btn) return;
        input.value = btn.dataset.quick;
        input.dispatchEvent(new Event('input'));
        input.focus();
      });

      form.querySelectorAll('[data-currency]').forEach((btn) => btn.addEventListener('click', () => {
        currency = btn.dataset.currency;
        form.querySelectorAll('[data-currency]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        form.querySelector('[data-quick-list]').innerHTML = String(html`${quick(currency)}`);
        updateHint();
      }));

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseAmount(input.value);
        if (!Number.isFinite(amount) || amount <= 0) {
          error.textContent = 'Mete yon montan ki plis pase 0.';
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        if (amount > 999999999) {
          error.textContent = 'Montan sa a twò gwo.';
          input.setAttribute('aria-invalid', 'true');
          return;
        }
        form.querySelector('[type=submit]').disabled = true;
        await store.addTransaction({
          customer_uuid: customer.uuid,
          type,
          amount,
          currency,
          note: form.note.value,
        });
        close();
        toast(`${isCredit ? 'Kredi anrejistre' : 'Peman anrejistre'}: ${money(amount, currency)}`, isCredit ? 'credit' : 'payment');
      });
    },
  });
}
