import * as db from './db.js';
import { getToken, setToken } from './api.js';
import * as store from './store.js';
import { startAutoSync, scheduleSync, onStatus } from './sync.js';
import { updateSyncPills } from './views/shared.js';
import * as home from './views/home.js';
import * as customer from './views/customer.js';
import * as customers from './views/customers.js';
import * as reports from './views/reports.js';
import * as customerForm from './views/customer-form.js';
import * as settings from './views/settings.js';
import { renderLogin, renderRegister } from './views/auth.js';

const root = document.getElementById('app');

const routes = [
  { re: /^#\/login$/, view: renderLogin, public: true },
  { re: /^#\/register$/, view: renderRegister, public: true },
  { re: /^(#\/?)?$/, view: home.render },
  { re: /^#\/customers$/, view: customers.render },
  { re: /^#\/reports$/, view: reports.render },
  { re: /^#\/new$/, view: customerForm.render },
  { re: /^#\/c\/([\w-]+)\/edit$/, view: customerForm.render, keys: ['uuid'] },
  { re: /^#\/c\/([\w-]+)$/, view: customer.render, keys: ['uuid'] },
  { re: /^#\/settings$/, view: settings.render },
];

export function navigate(hash, { replace = false } = {}) {
  if (replace) location.replace(hash);
  else location.hash = hash;
}

let renderSeq = 0;
let currentHash = null;

async function render() {
  const hash = location.hash || '#/';
  const route = routes.find((r) => r.re.test(hash)) ?? routes[2];
  const loggedIn = Boolean(getToken());

  if (!route.public && !loggedIn) return navigate('#/login', { replace: true });
  if (route.public && loggedIn) return navigate('#/', { replace: true });
  if (!route.public) startAutoSync();

  const match = hash.match(route.re) ?? [];
  const params = Object.fromEntries((route.keys ?? []).map((k, i) => [k, match[i + 1]]));
  const sameRoute = hash === currentHash;

  // Kenbe pozisyon ak fokis lè se menm ekran an ki re-afiche (apre yon sync).
  const scrollY = window.scrollY;
  const active = document.activeElement;
  const activeSelector = active?.matches?.('[data-search]') ? '[data-search]' : null;
  const selection = activeSelector ? [active.selectionStart, active.selectionEnd] : null;

  const seq = ++renderSeq;
  const view = await route.view({ params, navigate });
  if (seq !== renderSeq) return; // yon lòt render te kòmanse

  root.innerHTML = String(view.html);
  view.bind?.(root);
  currentHash = hash;

  if (sameRoute) {
    window.scrollTo(0, scrollY);
    if (activeSelector) {
      const el = root.querySelector(activeSelector);
      el?.focus();
      if (selection) el?.setSelectionRange(...selection);
    }
  } else {
    window.scrollTo(0, 0);
    root.querySelector('[autofocus]')?.focus();
  }
}

let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    render();
  });
}

window.addEventListener('hashchange', render);
window.addEventListener('kane:unauthorized', () => {
  setToken(null);
  navigate('#/login', { replace: true });
});

db.onChange(() => {
  // Pa re-afiche ekran koneksyon yo pandan moun nan ap tape.
  const hash = location.hash;
  if (hash === '#/login' || hash === '#/register') return;
  scheduleRender();
});

store.onLocalWrite(() => scheduleSync());
onStatus(updateSyncPills);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
