// Tès E2E: tout flux la nan yon vrè navigatè Chromium, ak mock API a.
// Itilizasyon:  npm i -D playwright && npx playwright install chromium && node dev/e2e.mjs
// Opsyon:       SHOTS=./shots node dev/e2e.mjs   (sere kapti ekran yo)

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createMockServer } from './mock-api.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SHOTS = process.env.SHOTS || null;
let passed = 0;

function ok(condition, label) {
  if (!condition) throw new Error(`ECHWE: ${label}`);
  passed++;
  console.log(`  ✓ ${label}`);
}

async function eventually(fn, label, timeout = 8000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      last = await fn();
      if (last) return ok(true, label);
    } catch (e) { last = e; }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`ECHWE (timeout): ${label} — ${last?.message ?? last}`);
}

async function listen(options) {
  const mock = createMockServer(options);
  await new Promise((r) => mock.server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${mock.server.address().port}`;
  const state = async () => (await fetch(`${base}/__mock/state`)).json();
  return { ...mock, data: mock.state, base, state };
}

async function newContext(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-HT' });
  context.setDefaultTimeout(10000);
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return context;
}

let currentPage = null;
async function shot(page, name) {
  if (!SHOTS) return;
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function register(page, base, { name = 'Manno Joseph', business = 'Boutik Manno', phone = '3700-1234' } = {}) {
  await page.goto(`${base}/app/`);
  await page.waitForURL(/#\/login$/);
  await shot(page, '01-login');
  await page.getByRole('link', { name: /kreye youn/ }).click();
  await page.getByLabel('Non ou').fill(name);
  await page.getByLabel('Non biznis ou').fill(business);
  await page.getByLabel('Telefòn').fill(phone);
  await page.getByLabel('Chwazi yon PIN').fill('1234');
  await page.getByLabel('Tape PIN nan ankò').fill('1234');
  await page.getByRole('button', { name: 'Kreye kont mwen' }).click();
  await page.waitForURL(/#\/$/);
}

async function addCustomer(page, name, phone) {
  await page.getByRole('link', { name: 'Nouvo kliyan' }).click();
  await page.getByLabel('Non kliyan an').fill(name);
  if (phone) await page.getByLabel(/Telefòn/).fill(phone);
  await page.getByRole('button', { name: 'Ajoute kliyan' }).click();
  await page.waitForFunction(() => /^#\/c\/[\w-]+$/.test(location.hash));
  await page.waitForSelector('.customer-name');
}

async function addEntry(page, type, amount, { note, currency } = {}) {
  await page.getByRole('button', { name: type === 'credit' ? 'Bay kredi' : 'Resevwa peman' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Montan').fill(String(amount));
  if (currency === 'USD') await dialog.getByRole('button', { name: 'Dola (USD)' }).click();
  if (note) await dialog.getByLabel(/Sa l pran|Nòt/).fill(note);
  await dialog.getByRole('button', { name: type === 'credit' ? 'Anrejistre kredi' : 'Anrejistre peman' }).click();
  await dialog.waitFor({ state: 'detached' });
}

const serverCustomer = async (mock, name) => (await mock.state()).customers.find((c) => c.name === name);

async function mainScenario(browser) {
  console.log('\nSenaryo 1: kont, kliyan, kredi, offline, sync');
  const mock = await listen();
  const context = await newContext(browser);
  const page = await context.newPage();
  currentPage = page;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await register(page, mock.base);
  await eventually(() => page.getByRole('heading', { name: 'Boutik Manno' }).isVisible(), 'apre kont lan, non biznis la parèt');
  await eventually(() => page.getByText('Kanè w la vid.').isVisible(), 'lis vid la envite moun nan ajoute yon kliyan');

  // --- Kliyan + kredi ---
  await addCustomer(page, 'Jak Pierre', '3711-2233');
  await eventually(() => page.getByRole('heading', { name: 'Jak Pierre' }).isVisible(), 'paj kliyan an louvri');
  await eventually(() => page.getByText('+509 3711-2233').isVisible(), 'telefòn nan fòmate');

  await addEntry(page, 'credit', '1250', { note: 'Diri ak lwil' });
  await eventually(() => page.locator('.balance-amount', { hasText: '1 250,00 HTG' }).isVisible(), 'balans lan monte a 1 250,00 HTG');
  await eventually(() => page.getByText('Diri ak lwil').isVisible(), 'nòt la nan istorik la');

  await eventually(async () => (await serverCustomer(mock, 'Jak Pierre'))?.balance.HTG === 1250, 'sèvè a resevwa kliyan an ak kredi a');
  await eventually(async () => (await page.locator('[data-sync] .sync-text').textContent()) === 'Tout sove', 'endikatè a di "Tout sove"');

  // --- Dezyèm kliyan an USD ---
  await page.getByRole('link', { name: 'Retounen' }).click();
  await addCustomer(page, 'Mari Joseph', '4802-1122');
  await addEntry(page, 'credit', '20', { currency: 'USD', note: 'Kès Prestige' });
  await eventually(() => page.locator('.balance-amount', { hasText: 'US$ 20.00' }).isVisible(), 'kredi an USD');
  await page.getByRole('link', { name: 'Retounen' }).click();

  // --- Offline ---
  await page.evaluate(() => navigator.serviceWorker.ready);
  await eventually(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), 'service worker la ap kontwole paj la');
  await eventually(async () => (await mock.state()).transactions.length === 2, 'tou de tranzaksyon yo sou sèvè a');

  await context.setOffline(true);
  await page.getByRole('link', { name: /Jak Pierre/ }).click();
  await addEntry(page, 'payment', '500');
  await eventually(() => page.locator('.balance-amount', { hasText: '750,00 HTG' }).isVisible(), 'offline: peman an kalkile lokalman (750,00 HTG)');
  await eventually(async () => /Offline, 1 ap tann/.test(await page.locator('[data-sync] .sync-text').textContent()), 'endikatè a montre "Offline, 1 ap tann"');
  ok((await serverCustomer(mock, 'Jak Pierre')).balance.HTG === 1250, 'sèvè a poko resevwa peman an');

  await page.reload();
  await page.waitForSelector('.customer-name');
  await eventually(() => page.locator('.balance-amount', { hasText: '750,00 HTG' }).isVisible(), 'offline: aplikasyon an rechaje ak done yo');
  await shot(page, '04-customer-offline');

  // --- Tounen online ---
  await context.setOffline(false);
  await eventually(async () => (await serverCustomer(mock, 'Jak Pierre'))?.balance.HTG === 750, 'tounen online: sync otomatik, sèvè a = 750');

  // --- Chanjman ki soti sou yon lòt telefòn ---
  await fetch(`${mock.base}/__mock/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_uuid: (await serverCustomer(mock, 'Jak Pierre')).uuid, type: 'credit', amount: 300, note: 'Lòt telefòn' }),
  });
  await page.locator('[data-sync]').click();
  await eventually(() => page.locator('.balance-amount', { hasText: '1 050,00 HTG' }).isVisible(), 'pull: kredi lòt telefòn nan parèt (1 050,00 HTG)');

  // --- Efase yon erè ---
  await page.locator('[data-tx]', { hasText: 'Peman' }).click();
  await page.getByRole('button', { name: 'Efase operasyon sa a' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Efase', exact: true }).click();
  await eventually(() => page.locator('.balance-amount', { hasText: '1 550,00 HTG' }).isVisible(), 'efase peman an: balans = 1 550,00 HTG');
  await eventually(async () => (await serverCustomer(mock, 'Jak Pierre'))?.balance.HTG === 1550, 'efasman an rive sou sèvè a');

  // --- Rapèl WhatsApp ---
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Rapèl WhatsApp' }).click();
  const popup = await popupPromise;
  const waUrl = decodeURIComponent(popup.url());
  ok(waUrl.startsWith('https://wa.me/50937112233?text='), 'lyen WhatsApp gen bon nimewo a');
  ok(waUrl.includes('ou dwe 1 550,00 HTG') && waUrl.includes('/k/'), 'mesaj la gen montan an ak lyen piblik la');
  await popup.close();
  await eventually(async () => (await mock.state()).reminders.length === 1, 'rapèl la anrejistre sou sèvè a');
  await shot(page, '03-customer');

  // --- Akèy (paj kliyan an pa gen ba navigasyon: retounen anvan) ---
  await page.getByRole('link', { name: 'Retounen' }).click();
  await page.getByRole('link', { name: 'Akèy', exact: true }).click();
  await eventually(() => page.locator('.owed', { hasText: '1 550,00 HTG' }).isVisible(), 'akèy: total moun dwe a');
  await eventually(() => page.getByText('2 moun dwe w').isVisible(), 'akèy: 2 moun dwe');
  await eventually(() => page.getByText('Lòt telefòn').isVisible(), 'akèy: dènye operasyon yo parèt');

  // --- Aksyon rapid: gwo bouton "Resevwa peman" -> chwazi kliyan -> peman ---
  await page.getByRole('button', { name: 'Resevwa peman' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Jak Pierre/ }).click();
  const payDialog = page.getByRole('dialog', { name: 'Peman Jak Pierre' });
  await payDialog.getByLabel('Montan').fill('50');
  await payDialog.getByRole('button', { name: 'Anrejistre peman' }).click();
  await payDialog.waitFor({ state: 'detached' });
  await eventually(() => page.locator('.owed', { hasText: '1 500,00 HTG' }).isVisible(), 'aksyon rapid: peman 50 sou Jak, total = 1 500,00 HTG');

  // --- Bouton + nan ba navigasyon an ---
  await page.getByRole('button', { name: 'Nouvo operasyon' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bay kredi' }).click();
  await page.getByRole('dialog', { name: 'Kredi pou kiyès?' }).getByRole('button', { name: /Mari Joseph/ }).click();
  const creditDialog = page.getByRole('dialog', { name: 'Kredi pou Mari Joseph' });
  await creditDialog.getByLabel('Montan').fill('400');
  await creditDialog.getByRole('button', { name: 'Anrejistre kredi' }).click();
  await creditDialog.waitFor({ state: 'detached' });
  await eventually(() => page.locator('.owed', { hasText: '1 900,00 HTG' }).isVisible(), 'bouton +: kredi 400 pou Mari, total = 1 900,00 HTG');
  await eventually(async () => (await serverCustomer(mock, 'Mari Joseph'))?.balance.HTG === 400, 'aksyon rapid yo rive sou sèvè a');
  await shot(page, '02-home');

  // --- Rapò ---
  await page.getByRole('link', { name: 'Rapò', exact: true }).click();
  await eventually(() => page.locator('[data-report-owed]', { hasText: '1 900 HTG' }).isVisible(), 'rapò: kòb ki deyò');
  await eventually(async () => (await page.locator('.chart-day').count()) === 7, 'rapò: grafik 7 jou');
  await eventually(() => page.getByRole('cell', { name: '1 950,00 HTG' }).count().then((n) => n === 1), 'rapò: tab aksesib la gen kredi jodi a (1 250 + 300 + 400)');
  await shot(page, '06-reports');

  // --- Lis kliyan + rechèch ---
  await page.getByRole('link', { name: 'Kliyan', exact: true }).click();
  await page.getByPlaceholder('Chèche pa non oswa telefòn').fill('mari');
  ok((await page.locator('[data-list] .row').count()) === 1, 'rechèch "mari" jwenn 1 kliyan');
  await page.getByPlaceholder('Chèche pa non oswa telefòn').fill('3711');
  ok((await page.locator('[data-list] .row').count()) === 1 && await page.getByText('Jak Pierre').isVisible(), 'rechèch pa telefòn');
  await page.getByPlaceholder('Chèche pa non oswa telefòn').fill('');
  await shot(page, '07-customers');

  // --- Fèy kredi (pou kapti ekran) ---
  await page.getByRole('link', { name: /Mari Joseph/ }).click();
  await page.getByRole('button', { name: 'Bay kredi' }).click();
  await page.getByRole('dialog').getByLabel('Montan').fill('500');
  await shot(page, '05-entry');
  await page.keyboard.press('Escape');

  ok(errors.length === 0, `pa gen erè JavaScript (${errors.join(' | ') || 'okenn'})`);
  await context.close();
  mock.server.close();
}

async function limitScenario(browser) {
  console.log('\nSenaryo 2: limit plan gratis la ak validasyon');
  const mock = await listen({ freeCustomerLimit: 1 });
  const context = await newContext(browser);
  const page = await context.newPage();
  currentPage = page;

  await page.goto(`${mock.base}/app/#/register`);
  await page.getByLabel('Non ou').fill('Test');
  await page.getByLabel('Non biznis ou').fill('Depo Test');
  await page.getByLabel('Telefòn').fill('12');
  await page.getByLabel('Chwazi yon PIN').fill('1234');
  await page.getByLabel('Tape PIN nan ankò').fill('9999');
  await page.getByRole('button', { name: 'Kreye kont mwen' }).click();
  await eventually(() => page.getByText(/Nimewo telefòn nan pa bon/).isVisible(), 'erè telefòn sèvè a parèt anba chan an');
  await eventually(() => page.getByText('De PIN yo pa menm.').isVisible(), 'erè PIN parèt');

  await page.getByLabel('Telefòn').fill('3800-0001');
  await page.getByLabel('Tape PIN nan ankò').fill('1234');
  await page.getByRole('button', { name: 'Kreye kont mwen' }).click();
  await page.waitForURL(/#\/$/);

  await addCustomer(page, 'Premye', null);
  await page.getByRole('link', { name: 'Retounen' }).click();
  await addCustomer(page, 'Dezyèm', null);
  await eventually(() => page.getByText(/limit plan gratis/).isVisible(), 'kliyan ki depase limit la make "pa sove"');
  await eventually(async () => (await mock.state()).customers.map((c) => c.name).join() === 'Premye', 'se premye kliyan an ki sove, pa dezyèm lan');

  await page.getByRole('button', { name: 'Bay kredi' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Anrejistre kredi' }).click();
  await eventually(() => page.getByText('Mete yon montan ki plis pase 0.').isVisible(), 'montan vid refize');

  await context.close();
  mock.server.close();
}

async function loginScenario(browser) {
  console.log('\nSenaryo 3: login ak kont ki egziste, dekonekte');
  const mock = await listen();
  const { seed } = await import('./mock-api.mjs');
  seed(mock.data);
  const context = await newContext(browser);
  const page = await context.newPage();
  currentPage = page;

  await page.goto(`${mock.base}/app/`);
  await page.getByLabel('Telefòn').fill('37000000');
  await page.getByLabel('PIN').fill('0000');
  await page.getByRole('button', { name: 'Konekte' }).click();
  await eventually(() => page.getByText('Nimewo telefòn oswa PIN nan pa kòrèk.').isVisible(), 'move PIN refize');

  await page.getByLabel('PIN').fill('1234');
  await page.getByRole('button', { name: 'Konekte' }).click();
  await page.waitForURL(/#\/$/);
  await eventually(() => page.getByRole('heading', { name: 'Boutik Manno' }).isVisible(), 'login mache');

  await page.getByRole('link', { name: 'Paramèt' }).click();
  await page.getByRole('button', { name: 'Dekonekte' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dekonekte' }).click();
  await page.waitForURL(/#\/login$/);
  ok(true, 'dekonekte retounen nan ekran login');

  await context.close();
  mock.server.close();
}

const browser = await chromium.launch();
if (SHOTS) await mkdir(SHOTS, { recursive: true });
try {
  await mainScenario(browser);
  await limitScenario(browser);
  await loginScenario(browser);
  console.log(`\n${passed} verifikasyon pase.`);
} catch (e) {
  console.error(`\n${e.message}`);
  if (currentPage && SHOTS) await currentPage.screenshot({ path: `${SHOTS}/failure.png` }).catch(() => {});
  if (currentPage) {
    console.error('URL:', currentPage.url());
    console.error('Lokal:', JSON.stringify(await currentPage.evaluate(async () => {
      const db = await import('./js/db.js');
      return (await db.getAll('customers')).map((c) => ({ name: c.name, dirty: c._dirty, rejected: c._rejected }));
    }).catch((e) => e.message)));
  }
  process.exitCode = 1;
} finally {
  await browser.close();
  process.exit();
}
