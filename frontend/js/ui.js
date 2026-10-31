// Ti zouti pou ekran yo: HTML ki echape otomatikman, toast, ak fèy anba (sheet).

class Safe {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export function escape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toHtml(value) {
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(toHtml).join('');
  if (value === false || value === null || value === undefined) return '';
  return escape(value);
}

/** html`<p>${userText}</p>` — tout valè echape, eksepte lòt html`` yo. */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += toHtml(values[i]);
  });
  return new Safe(out);
}

export const raw = (s) => new Safe(String(s));

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

let toastTimer = null;
export function toast(message, tone = 'neutral') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = message;
  el.dataset.tone = tone;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/**
 * Louvri yon fèy anba ekran an. `render(close)` retounen html,
 * `bind(root, close)` mete aksyon yo. Retounen yon fonksyon pou fèmen l.
 */
export function sheet({ title, body, bind }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = html`
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
      <header class="sheet-head">
        <h2>${title}</h2>
        <button class="icon-btn" data-close aria-label="Fèmen">${raw(icons.close)}</button>
      </header>
      <div class="sheet-body">${body}</div>
    </section>`.value;

  const previousFocus = document.activeElement;
  const close = () => {
    backdrop.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => backdrop.remove(), 180);
    previousFocus?.focus?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));

  bind?.(backdrop.querySelector('.sheet'), close);
  const first = backdrop.querySelector('[autofocus], input, button:not([data-close])');
  first?.focus();
  return close;
}

/** Konfimasyon nan yon fèy (pa window.confirm). */
export function confirmSheet({ title, message, confirmLabel, tone = 'danger' }) {
  return new Promise((resolve) => {
    let answered = false;
    const close = sheet({
      title,
      body: html`
        <p class="sheet-text">${message}</p>
        <div class="sheet-actions">
          <button class="btn btn-quiet" data-answer="no">Anile</button>
          <button class="btn btn-${tone}" data-answer="yes">${confirmLabel}</button>
        </div>`,
      bind(root, closeSheet) {
        root.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-answer]');
          if (!btn) return;
          answered = true;
          resolve(btn.dataset.answer === 'yes');
          closeSheet();
        });
      },
    });
    // Si moun nan fèmen fèy la san reponn.
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.sheet-backdrop')) {
        observer.disconnect();
        if (!answered) resolve(false);
      }
    });
    observer.observe(document.body, { childList: true });
    void close;
  });
}

export const icons = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  credit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  cash: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.8-.9-.8.8a4 4 0 0 1-2.3-2.3l.8-.8-.9-1.8z"/></svg>',
  sms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  sync: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/></svg>',
};
