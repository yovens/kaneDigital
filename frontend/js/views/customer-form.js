import * as store from '../store.js';
import { html, confirmSheet, toast } from '../ui.js';
import { isValidPhone, displayPhone, money } from '../format.js';
import { balancesByCustomer, emptyBalance, owes } from '../stats.js';
import { topbar, bindTopbar } from './shared.js';

export async function render({ params, navigate }) {
  const editing = Boolean(params.uuid);
  const { customer, transactions } = editing
    ? await store.customerWithTransactions(params.uuid)
    : { customer: null, transactions: [] };

  if (editing && (!customer || customer.deleted_at)) {
    navigate('#/', { replace: true });
    return { html: html``, bind() {} };
  }

  const back = editing ? `#/c/${customer.uuid}` : '#/customers';

  const content = html`
    ${topbar({ title: editing ? 'Modifye kliyan' : 'Nouvo kliyan', back })}
    <main class="screen screen-plain">
    <form class="form card form-card" data-form novalidate>
      <div class="field">
        <label for="name">Non kliyan an</label>
        <input id="name" name="name" maxlength="120" autocomplete="off" value="${customer?.name ?? ''}" autofocus>
        <span class="error" data-error="name" role="alert"></span>
      </div>
      <div class="field">
        <label for="phone">Telefòn <span class="muted">(si w vle)</span></label>
        <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="3700-1234"
          value="${customer?.phone ? displayPhone(customer.phone) : ''}">
        <span class="hint">Ak telefòn nan, ou ka voye rapèl WhatsApp oswa SMS.</span>
        <span class="error" data-error="phone" role="alert"></span>
      </div>
      <button class="btn btn-ink btn-block" type="submit">${editing ? 'Sove chanjman yo' : 'Ajoute kliyan'}</button>
      ${editing ? html`<button class="btn btn-quiet btn-block debt" type="button" data-delete>Efase kliyan an</button>` : ''}
    </form>
    </main>`;

  return {
    html: content,
    bind(root) {
      bindTopbar(root);
      const form = root.querySelector('[data-form]');

      const showError = (field, message) => {
        form.querySelector(`[data-error="${field}"]`).textContent = message;
        form.elements.namedItem(field).setAttribute('aria-invalid', 'true');
      };

      form.addEventListener('input', (e) => {
        const err = form.querySelector(`[data-error="${e.target.name}"]`);
        if (err) err.textContent = '';
        e.target.removeAttribute('aria-invalid');
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.elements.namedItem('name').value.trim();
        const phone = form.elements.namedItem('phone').value.trim();
        let ok = true;
        if (!name) { showError('name', 'Mete non kliyan an.'); ok = false; }
        if (phone && !isValidPhone(phone)) { showError('phone', 'Nimewo a pa bon. Egzanp: 3700-1234.'); ok = false; }
        if (!ok) return;

        if (editing) {
          await store.updateCustomer(customer.uuid, { name, phone: phone || null });
          toast('Chanjman yo sove');
          navigate(`#/c/${customer.uuid}`, { replace: true });
        } else {
          const created = await store.addCustomer({ name, phone: phone || null });
          toast(`${created.name} ajoute`);
          navigate(`#/c/${created.uuid}`, { replace: true });
        }
      });

      form.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const b = balancesByCustomer(transactions).get(customer.uuid) ?? emptyBalance();
        const debt = owes(b)
          ? ` Atansyon: li dwe w toujou ${[b.HTG > 0 && money(b.HTG, 'HTG'), b.USD > 0 && money(b.USD, 'USD')].filter(Boolean).join(' ak ')}.`
          : '';
        const confirmed = await confirmSheet({
          title: `Efase ${customer.name}?`,
          message: `Kliyan an ak tout istorik li ap disparèt nan kanè a.${debt}`,
          confirmLabel: 'Efase kliyan an',
        });
        if (!confirmed) return;
        await store.deleteCustomer(customer.uuid);
        toast('Kliyan an efase');
        navigate('#/', { replace: true });
      });
    },
  };
}

