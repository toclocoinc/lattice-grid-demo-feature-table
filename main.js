// Wiring only. The router declaration below is plain data. It is what the router is given
// and what the panel prints, so the panel cannot drift from what is running.
import { createGrid, setLicence } from '@toclocoinc/lattice-grid';
import { createDataRouter } from '@toclocoinc/lattice-grid/modules/data-router';

// Bound to toclocoinc.github.io; does nothing anywhere else. localhost never needs a key.
setLicence('LG1.eyJ2IjoxLCJwIjoibGF0dGljZS1ncmlkIiwidCI6IlRPQ0xPQ08gSW5jIC0gcHVibGljIGRlbW9zIiwiZSI6IjIwMzAtMDEtMDEiLCJkIjpbInRvY2xvY29pbmMuZ2l0aHViLmlvIl19.9De42ua3aCGpiMB6EVRP7Tv-upUlDI-0T07rlSPzvCrsqg8t4YJi7SRnStEpAg48uzmcG7il1fR_TfwkUE7iCA');

const el = (id) => document.getElementById(id);
const feed = async (name) => (await fetch(`data/${name}.json`)).json();

export const DECLARATION = {
  transaction: { fields: { amount: { type: 'number', decimal: ',' }, date: { type: 'date', format: 'dd/MM/yyyy' } } },
  attribute: {},
  churn: { fields: { churned: { type: 'boolean', true: ['Y'], false: ['N'] } } },
  customer: {
    fields: { joined: { type: 'date', format: 'dd/MM/yyyy' } },
    join: [
      { from: 'transaction', foreignKey: 'customerId', many: true, aggregate: {
        orders: { fn: 'count' }, spend: { field: 'amount', fn: 'sum' }, lastPurchase: { field: 'date', fn: 'last', orderBy: 'date' } } },
      { from: 'attribute', foreignKey: 'customerId', spread: { name: 'attribute', value: 'value', prefix: 'cf_',
        type: { nps: 'number', newsletter: 'boolean', loyalty_since: 'date' } } },
      { from: 'churn', localKey: 'id', foreignKey: 'customerId', fields: ['churned'] },
    ],
  },
};

const router = createDataRouter({ key: 'kind', rowKey: 'id' });
const sources = Object.fromEntries(Object.entries(DECLARATION).map(([name, spec]) => [name, router.addSource(name, spec)]));

const col = (field, title, width, extra = {}) => ({ field, title, layout: { width }, ...extra });
const grid = createGrid(el('grid'), {
  rowKey: 'id', source: { mode: 'memory' }, highlightOnChange: { duration: 4000 },
  columns: [
    col('name', 'Customer', 118), col('region', 'Region', 68), col('joined', 'Joined', 104, { type: 'date' }),
    col('orders', 'Orders', 64, { type: 'number' }),
    col('spend', 'Spend', 84, { type: 'number', format: { decimals: 2 } }),
    col('lastPurchase', 'Last purchase', 106, { type: 'date' }),
    col('cf_plan', 'Plan', 60), col('cf_nps', 'NPS', 52, { type: 'number' }),
    col('cf_newsletter', 'Newsletter', 100, { type: 'boolean' }),
    col('cf_loyalty_since', 'Loyal since', 100, { type: 'date' }), col('churned', 'Churned', 76, { type: 'boolean' }),
  ],
});
router.attach(grid, 'customer');

const FILES = { transaction: 'transactions', attribute: 'attributes', churn: 'churn', customer: 'customers' };
const feeds = {};
for (const [name, file] of Object.entries(FILES)) sources[name].load(feeds[name] = await feed(file));

// The panel prints the declaration the router was given, not a copy of it.
// Five levels spread over lines, the rest inline, so the whole declaration fits the panel.
const show = (v, depth = 0) => (depth > 4 || typeof v !== 'object' || !Object.keys(v).length ? JSON.stringify(v)
  : `${Array.isArray(v) ? '[' : '{'}\n${Object.entries(v).map(([k, x]) => '  '.repeat(depth + 1) + (Array.isArray(v) ? '' : `${k}: `) + show(x, depth + 1)).join(',\n')}\n${'  '.repeat(depth)}${Array.isArray(v) ? ']' : '}'}`);
el('decl').textContent = show(DECLARATION);
el('feeds').textContent = Object.entries(feeds).map(([name, rows]) => `${rows.length} ${name} rows`).join(' + ') + ' in, one row per customer out.';

// "New transactions": three more rows on the transaction feed. Only their customers' rows change.
let sent = 0;
el('stream').onclick = () => {
  const ids = [3, 11, 17, 23, 29, 35].map((n) => `C${String(n + sent % 3 * 2).padStart(3, '0')}`).slice(0, 3);
  sources.transaction.apply(ids.map((customerId, i) => ({ op: 'upsert', row: {
    id: `T${9000 + sent * 3 + i}`, kind: 'transaction', customerId, amount: `${(40 + i * 215 + sent * 7).toLocaleString('de-DE')},50`, date: '19/10/2026' } })));
  sent += 1;
  el('summary').textContent = `${sent * 3} streamed: ${ids.map((id) => feeds.customer.find((c) => c.id === id).name).join(', ')} updated, 33 untouched`;
};
el('summary').textContent = `${grid.rows.count()} customers`;
window.__demo = { grid, router, DECLARATION };
