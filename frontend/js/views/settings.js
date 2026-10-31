import * as db from '../db.js';
import { api, setToken } from '../api.js';
import { html, confirmSheet, toast } from '../ui.js';
import { displayPhone, relativeDate, isValidPhone, normalizePhone } from '../format.js';
import { syncNow, getStatus } from '../sync.js';
import { pendingCount } from '../store.js';
import { topbar, bindTopbar, bottomNav } from './shared.js';

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});

export async function logout(navigate) {
  try { await api.post('/api/auth/logout'); } catch { /* token an ka deja pa bon */ }
  setToken(null);
  await db.clearAll();
  navigate('#/login', { replace: true });
}

export async function render({ navigate }) {
  const [business, user, lastSync, pending] = await Promise.all([
    db.getMeta('business'),
    db.getMeta('user'),
    db.getMeta('last_sync'),
    pendingCount(),
  ]);

  const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const plan = user?.plan === 'pro'
    ? 'Plan Pro'
    : trialEnd && trialEnd > new Date()
      ? `Esè gratis jiska ${relativeDate(user.trial_ends_at)}`
      : 'Plan gratis (30 kliyan maksimòm)';

  const content = html`
    ${topbar({ title: 'Paramèt' })}
    <main class="screen">
    <form class="form card form-card" data-business novalidate>
      <h2 class="section-title">Biznis ou</h2>
      <div class="field">
        <label for="b-name">Non biznis la</label>
        <input id="b-name" name="name" maxlength="120" value="${business?.name ?? ''}">
      </div>
      <div class="field">
        <label for="b-address">Adrès</label>
        <input id="b-address" name="address" maxlength="255" value="${business?.address ?? ''}" placeholder="Egzanp: Ri Gabriel, Okap">
      </div>
      <div class="field">
        <label for="b-phone">Telefòn biznis la</label>
        <input id="b-phone" name="phone" type="tel" inputmode="tel" value="${business?.phone ? displayPhone(business.phone) : ''}">
        <span class="error" data-error="phone" role="alert"></span>
      </div>
      <p class="form-error" data-form-error role="alert"></p>
      <button class="btn btn-ink btn-block" type="submit">Sove biznis la</button>
    </form>

    <div class="settings-list">
      <section class="card">
      <h2>Senkronizasyon</h2>
      <p>${lastSync ? `Dènye sync: ${relativeDate(lastSync)}.` : 'Poko janm senkronize.'}
        ${pending ? `${pending} chanjman ap tann entènèt.` : 'Tout chanjman yo sou sèvè a.'}</p>
      <button class="btn btn-quiet btn-block" data-sync-now>Senkronize kounye a</button>
      </section>

      ${installPrompt ? html`<section class="card">
        <h2>Aplikasyon an</h2>
        <p>Mete Kanè Dijital sou ekran telefòn ou pou w louvri l tankou yon aplikasyon.</p>
        <button class="btn btn-quiet btn-block" data-install>Enstale aplikasyon an</button></section>` : ''}

      <section class="card">
      <h2>Kont ou</h2>
      <p>${user?.name ?? ''}, ${displayPhone(user?.phone)}<br><span class="muted">${plan}</span></p>
      <button class="btn btn-quiet btn-block debt" data-logout>Dekonekte</button>
      </section>
    </div>
    </main>
    ${bottomNav('settings')}`;

  return {
    html: content,
    bind(root) {
      bindTopbar(root);

      root.querySelector('[data-sync-now]').addEventListener('click', async () => {
        await syncNow();
        const s = getStatus();
        toast(s.state === 'idle' ? 'Senkronizasyon fini' : 'Pa gen entènèt: n ap eseye ankò pita');
      });

      root.querySelector('[data-install]')?.addEventListener('click', async () => {
        installPrompt.prompt();
        installPrompt = null;
      });

      const form = root.querySelector('[data-business]');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = form.querySelector('[data-form-error]');
        const phoneErr = form.querySelector('[data-error="phone"]');
        err.textContent = '';
        phoneErr.textContent = '';
        const phone = form.elements.namedItem('phone').value.trim();
        if (phone && !isValidPhone(phone)) { phoneErr.textContent = 'Nimewo a pa bon. Egzanp: 3700-1234.'; return; }
        if (!navigator.onLine) { err.textContent = 'Ou bezwen entènèt pou chanje enfòmasyon biznis la.'; return; }
        try {
          const res = await api.put('/api/business', {
            name: form.elements.namedItem('name').value.trim(),
            address: form.elements.namedItem('address').value.trim() || null,
            phone: normalizePhone(phone),
          });
          await db.setMeta('business', res.data ?? res);
          toast('Biznis la sove');
          db.notify(['meta']);
        } catch (ex) {
          err.textContent = ex.field?.('name') ?? ex.message;
        }
      });

      root.querySelector('[data-logout]').addEventListener('click', async () => {
        const waiting = await pendingCount();
        const ok = await confirmSheet({
          title: 'Dekonekte?',
          message: waiting
            ? `Gen ${waiting} chanjman ki poko rive sou sèvè a. Si w dekonekte kounye a, w ap pèdi yo. Pito konekte sou entènèt anvan.`
            : 'Done yo ap efase nan telefòn sa a. Yo rete an sekirite sou sèvè a.',
          confirmLabel: 'Dekonekte',
        });
        if (ok) await logout(navigate);
      });
    },
  };
}
