// Rapèl WhatsApp / SMS. Mesaj la bati sou telefòn nan (menm tèks ak backend
// la), konsa li mache menm san entènèt. Si gen entènèt, nou anrejistre rapèl
// la sou sèvè a tou, san nou pa fè moun nan tann.

import { api } from './api.js';
import { money } from './format.js';

export function reminderMessage(customer, balance, businessName) {
  const amounts = [];
  if (balance.HTG > 0) amounts.push(money(balance.HTG, 'HTG'));
  if (balance.USD > 0) amounts.push(money(balance.USD, 'USD'));
  let text = `Bonjou ${customer.name}, se ${businessName} ki ap ekri w. Ti rapèl: ou dwe ${amounts.join(' ak ')}.`;
  if (customer.public_url) text += `\nOu ka wè tout detay yo la: ${customer.public_url}`;
  return `${text}\nMèsi anpil!`;
}

export function reminderUrl(channel, phone, message) {
  const text = encodeURIComponent(message);
  return channel === 'sms' ? `sms:+${phone}?body=${text}` : `https://wa.me/${phone}?text=${text}`;
}

export function sendReminder({ customer, balance, businessName, channel }) {
  const message = reminderMessage(customer, balance, businessName);
  const url = reminderUrl(channel, customer.phone, message);

  if (channel === 'sms') {
    window.location.href = url;
  } else {
    // Yon lyen _blank: sou Android sa louvri WhatsApp dirèkteman.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  }

  // Istorik rapèl sou sèvè a (si kliyan an deja senkronize). Erè yo pa grav.
  if (navigator.onLine && !customer._dirty) {
    api.post(`/api/customers/${customer.uuid}/reminders`, { channel }).catch(() => {});
  }
}
