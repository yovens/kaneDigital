// Kalkil lokal yo. Balans yo kalkile apati tranzaksyon ki nan telefòn nan,
// konsa yo kòrèk menm lè pa gen entènèt.

export const OVERDUE_DAYS = 14;

export function visible(rows) {
  return rows.filter((r) => !r.deleted_at);
}

/** Map customer_uuid -> { HTG, USD, last_activity_at, last_payment_at, oldest_credit_at } */
export function balancesByCustomer(transactions) {
  const map = new Map();
  for (const t of visible(transactions)) {
    let b = map.get(t.customer_uuid);
    if (!b) {
      b = { HTG: 0, USD: 0, last_activity_at: null, last_payment_at: null, credits: [] };
      map.set(t.customer_uuid, b);
    }
    const amount = Number(t.amount) || 0;
    const currency = t.currency === 'USD' ? 'USD' : 'HTG';
    b[currency] += t.type === 'credit' ? amount : -amount;
    if (!b.last_activity_at || t.occurred_at > b.last_activity_at) b.last_activity_at = t.occurred_at;
    if (t.type === 'payment' && (!b.last_payment_at || t.occurred_at > b.last_payment_at)) {
      b.last_payment_at = t.occurred_at;
    }
    if (t.type === 'credit') b.credits.push(t.occurred_at);
  }
  for (const b of map.values()) {
    b.HTG = Math.round(b.HTG * 100) / 100;
    b.USD = Math.round(b.USD * 100) / 100;
  }
  return map;
}

export function emptyBalance() {
  return { HTG: 0, USD: 0, last_activity_at: null, last_payment_at: null, credits: [] };
}

export function owes(b) {
  return b.HTG > 0 || b.USD > 0;
}

/** Menm règ ak backend la: gen yon kredi ki pi ansyen pase limit la, epi pa peye depi lè sa a. */
export function isOverdue(b, now = new Date()) {
  if (!owes(b)) return false;
  const cutoff = new Date(now.getTime() - OVERDUE_DAYS * 86400000).toISOString();
  const hasOldCredit = b.credits.some((at) => new Date(at).toISOString() < cutoff);
  const paidRecently = b.last_payment_at && new Date(b.last_payment_at).toISOString() >= cutoff;
  return hasOldCredit && !paidRecently;
}

/** Done tablodbò a. */
export function summary(customers, transactions, now = new Date()) {
  const live = visible(customers);
  const balances = balancesByCustomer(transactions);
  const totalOwed = { HTG: 0, USD: 0 };
  let debtors = 0;
  let overdue = 0;

  for (const c of live) {
    const b = balances.get(c.uuid) ?? emptyBalance();
    if (b.HTG > 0) totalOwed.HTG += b.HTG;
    if (b.USD > 0) totalOwed.USD += b.USD;
    if (owes(b)) debtors++;
    if (isOverdue(b, now)) overdue++;
  }

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const today = { credits: { HTG: 0, USD: 0 }, payments: { HTG: 0, USD: 0 } };
  const liveUuids = new Set(live.map((c) => c.uuid));

  for (const t of visible(transactions)) {
    if (!liveUuids.has(t.customer_uuid) || new Date(t.occurred_at) < startOfDay) continue;
    const bucket = t.type === 'credit' ? today.credits : today.payments;
    bucket[t.currency === 'USD' ? 'USD' : 'HTG'] += Number(t.amount) || 0;
  }

  return { totalOwed, debtors, overdue, today, balances };
}
