/**
 * Writes the four raw feeds in data/ from a fixed seed: the same files every run.
 *   node tools/build-data.mjs
 * The feeds are deliberately untidy, the way exported systems are: dates as dd/MM/yyyy text (and ISO inside the attributes),
 * amounts with a decimal comma and thousands dots, custom attributes as one row per value,
 * churn as Y/N. Every figure is invented; no real person or shop is described.
 */
import { writeFileSync } from 'node:fs';

let seed = 20261019;
const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const pad = (n, w = 2) => String(n).padStart(w, '0');
const dmy = (d) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
const comma = (n) => n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const day = (offset) => new Date(Date.UTC(2026, 0, 1) + offset * 864e5);

const FIRST = ['Amara', 'Ben', 'Chloe', 'Dev', 'Elif', 'Farid', 'Grace', 'Hana', 'Ivo', 'Jun', 'Kofi', 'Lena', 'Mateo', 'Noor', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tara'];
const LAST = ['Adler', 'Brook', 'Chen', 'Dalton', 'Evans', 'Fox', 'Gill', 'Hart', 'Iyer', 'Jones', 'Khan', 'Lowe', 'Moss', 'Nash', 'Okoro', 'Park'];
const REGIONS = ['North', 'South', 'East', 'West'];
const CUSTOMERS = 36;

const customers = []; const transactions = []; const attributes = []; const churn = [];
for (let i = 1; i <= CUSTOMERS; i++) {
  const id = `C${pad(i, 3)}`;
  customers.push({ id, kind: 'customer', name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(rand() * LAST.length)]}`, region: pick(REGIONS), joined: dmy(day(-Math.floor(rand() * 700))) });
  const plan = pick(['Free', 'Plus', 'Plus', 'Pro']);
  const values = { plan, nps: String(Math.floor(rand() * 11)), newsletter: pick(['yes', 'no']), loyalty_since: day(-Math.floor(rand() * 500)).toISOString().slice(0, 10) };
  for (const [attribute, value] of Object.entries(values)) attributes.push({ id: `A${pad(attributes.length + 1, 4)}`, kind: 'attribute', customerId: id, attribute, value });
  const orders = Math.floor(rand() * 9);
  for (let k = 0; k < orders; k++) {
    const amount = Math.round((8 + rand() * rand() * 2400) * 100) / 100;
    transactions.push({ id: `T${pad(transactions.length + 1, 4)}`, kind: 'transaction', customerId: id, amount: comma(amount), date: dmy(day(Math.floor(rand() * 290))) });
  }
  churn.push({ id: `L${pad(i, 3)}`, kind: 'churn', customerId: id, churned: orders < 2 && rand() < 0.7 ? 'Y' : 'N' });
}
// Mix the transaction rows so the feed is not grouped by customer.
for (let i = transactions.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [transactions[i], transactions[j]] = [transactions[j], transactions[i]]; }
transactions.forEach((t, i) => { t.id = `T${pad(i + 1, 4)}`; });

const write = (name, rows) => writeFileSync(new URL(`../data/${name}.json`, import.meta.url), JSON.stringify(rows, null, 0).replace(/},/g, '},\n') + '\n');
write('customers', customers); write('transactions', transactions); write('attributes', attributes); write('churn', churn);
console.log(`${customers.length} customers, ${transactions.length} transactions, ${attributes.length} attributes, ${churn.length} churn labels`);
