import * as db from '../db.js';
import { api, setToken } from '../api.js';
import { html, raw, icons } from '../ui.js';
import { normalizePhone } from '../format.js';

/** Apre login/register: sere sesyon an. Si se yon lòt kont, nou vide done lokal yo. */
export async function startSession({ token, user }, navigate) {
  const previous = await db.getMeta('user');
  if (previous && previous.id !== user.id) await db.clearAll();
  setToken(token);
  await db.setMeta('user', user);
  await db.setMeta('business', user.business);
  navigate('#/', { replace: true });
}

function fieldErrors(form, error) {
  let shown = false;
  for (const el of form.querySelectorAll('[data-error]')) {
    const msg = error.field?.(el.dataset.error);
    el.textContent = msg ?? '';
    if (msg) shown = true;
  }
  form.querySelector('[data-form-error]').textContent = shown ? '' : error.message;
}

function bindSubmit(form, handler) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = form.querySelector('[type=submit]');
    form.querySelectorAll('[data-error]').forEach((el) => { el.textContent = ''; });
    form.querySelector('[data-form-error]').textContent = '';
    if (!navigator.onLine) {
      form.querySelector('[data-form-error]').textContent = 'Ou bezwen entènèt pou konekte. Apre sa, aplikasyon an mache san entènèt.';
      return;
    }
    button.disabled = true;
    try {
      await handler(new FormData(form));
    } catch (err) {
      fieldErrors(form, err);
    } finally {
      button.disabled = false;
    }
  });
}

const brand = (subtitle) => html`
  <div class="auth-brand">
    <span class="auth-logo" aria-hidden="true">${raw(icons.book)}</span>
    <h1>Kanè Dijital</h1>
    <p>${subtitle}</p>
  </div>`;

export async function renderLogin({ navigate }) {
  return {
    html: html`<main class="auth">
      ${brand('Kaye kredi boutik ou, nan telefòn ou. Li mache menm lè pa gen entènèt.')}
      <form class="form card form-card" data-form novalidate>
        <div class="field">
          <label for="phone">Telefòn</label>
          <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="3700-1234" autofocus>
          <span class="error" data-error="phone" role="alert"></span>
        </div>
        <div class="field">
          <label for="pin">PIN</label>
          <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6">
          <span class="error" data-error="pin" role="alert"></span>
        </div>
        <p class="form-error" data-form-error role="alert"></p>
        <button class="btn btn-ink btn-block" type="submit">Konekte</button>
        <a class="link-btn" href="#/register">Mwen pa gen kont: kreye youn</a>
      </form>
    </main>`,
    bind(root) {
      bindSubmit(root.querySelector('[data-form]'), async (data) => {
        const res = await api.post('/api/auth/login', {
          phone: normalizePhone(data.get('phone')) ?? '',
          pin: data.get('pin'),
          device_name: navigator.userAgent.slice(0, 90),
        });
        await startSession(res, navigate);
      });
    },
  };
}

export async function renderRegister({ navigate }) {
  return {
    html: html`<main class="auth">
      ${brand('Kreye kont ou. Ou jwenn 30 jou gratis ak tout fonksyon yo.')}
      <form class="form card form-card" data-form novalidate>
        <div class="field">
          <label for="name">Non ou</label>
          <input id="name" name="name" autocomplete="name" maxlength="100" autofocus>
          <span class="error" data-error="name" role="alert"></span>
        </div>
        <div class="field">
          <label for="business_name">Non biznis ou</label>
          <input id="business_name" name="business_name" maxlength="120" placeholder="Egzanp: Boutik Manno">
          <span class="error" data-error="business_name" role="alert"></span>
        </div>
        <div class="field">
          <label for="phone">Telefòn</label>
          <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="3700-1234">
          <span class="error" data-error="phone" role="alert"></span>
        </div>
        <div class="field">
          <label for="pin">Chwazi yon PIN</label>
          <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6">
          <span class="hint">4 a 6 chif. W ap bezwen l pou konekte.</span>
          <span class="error" data-error="pin" role="alert"></span>
        </div>
        <div class="field">
          <label for="pin_confirmation">Tape PIN nan ankò</label>
          <input id="pin_confirmation" name="pin_confirmation" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6">
        </div>
        <div class="field">
          <label id="currency-label">Lajan w plis itilize</label>
          <div class="segmented" role="group" aria-labelledby="currency-label" data-currency-group>
            <button type="button" data-currency="HTG" aria-pressed="true">Goud (HTG)</button>
            <button type="button" data-currency="USD" aria-pressed="false">Dola (USD)</button>
          </div>
        </div>
        <p class="form-error" data-form-error role="alert"></p>
        <button class="btn btn-ink btn-block" type="submit">Kreye kont mwen</button>
        <a class="link-btn" href="#/login">Mwen gen yon kont deja: konekte</a>
      </form>
    </main>`,
    bind(root) {
      const form = root.querySelector('[data-form]');
      let currency = 'HTG';
      form.querySelectorAll('[data-currency]').forEach((btn) => btn.addEventListener('click', () => {
        currency = btn.dataset.currency;
        form.querySelectorAll('[data-currency]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      }));

      bindSubmit(form, async (data) => {
        const res = await api.post('/api/auth/register', {
          name: data.get('name'),
          business_name: data.get('business_name'),
          phone: normalizePhone(data.get('phone')) ?? '',
          pin: data.get('pin'),
          pin_confirmation: data.get('pin_confirmation'),
          currency_default: currency,
          device_name: navigator.userAgent.slice(0, 90),
        });
        await startSession(res, navigate);
      });
    },
  };
}
