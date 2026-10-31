// Fòma lajan, telefòn ak dat — menm règ ak backend Laravel la.

export const CURRENCIES = ['HTG', 'USD'];

function groupThousands(intPart, sep) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** 1250 -> "1 250,00 HTG" ; 20 -> "US$ 20.00" */
export function money(amount, currency = 'HTG') {
  const value = Math.abs(Number(amount) || 0);
  const [i, d] = value.toFixed(2).split('.');
  const sign = Number(amount) < 0 ? '−' : '';
  if (currency === 'USD') return `${sign}US$ ${groupThousands(i, ',')}.${d}`;
  return `${sign}${groupThousands(i, ' ')},${d} HTG`;
}

/** Montan kout pou lis yo: "1 250 HTG" (san santim si se 0). */
export function moneyShort(amount, currency = 'HTG') {
  const full = money(amount, currency);
  return full.replace(/[,.]00(?= HTG|$)/, '');
}

/** "3700-1234" / "+509 37 00 12 34" / "00509..." -> "50937001234" */
export function normalizePhone(phone) {
  if (phone == null) return null;
  let digits = String(phone).replace(/\D+/g, '');
  if (digits === '') return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) return '509' + digits;
  return digits;
}

export function isValidPhone(phone) {
  const d = normalizePhone(phone);
  if (!d || !/^\d{10,15}$/.test(d)) return false;
  if (d.startsWith('509')) return d.length === 11;
  return true;
}

export function displayPhone(phone) {
  const d = normalizePhone(phone);
  if (!d) return '';
  if (d.startsWith('509') && d.length === 11) return `+509 ${d.slice(3, 7)}-${d.slice(7)}`;
  return '+' + d;
}

const MONTHS = ['jan', 'fev', 'mas', 'avr', 'me', 'jen', 'jiy', 'out', 'sep', 'okt', 'nov', 'des'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Jodi a 14:05", "Yè 09:10", "12 okt", "12 okt 2025" */
export function relativeDate(iso, now = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Jodi a ${hhmm(d)}`;
  if (sameDay(d, yesterday)) return `Yè ${hhmm(d)}`;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function daysBetween(iso, now = new Date()) {
  return Math.floor((now - new Date(iso)) / 86400000);
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Aksepte "1 250,50", "1250.5", "1,250.50" -> 1250.5 */
export function parseAmount(input) {
  let s = String(input ?? '').trim().replace(/\s+/g, '');
  if (s === '') return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    // vigil = separatè desimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
