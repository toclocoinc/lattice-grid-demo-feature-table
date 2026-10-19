// Real-Chrome check of the page: the four feeds land as one row per customer, rollups and
// spread attributes are typed, "New transactions" changes only the affected customers, no console errors.
//   node tools/serve.mjs 8000      (in another terminal)
//   CHROME=/usr/bin/google-chrome node tools/verify.mjs [http://localhost:8000/] [--shots dir]
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : '';
const url = args[0] || 'http://localhost:8000/';
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
let failed = 0;
const check = (ok, what) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const rows = () => { const g = window.__demo.grid; const o = {}; for (let i = 0; i < g.rows.count(); i++) { const r = g.rows.get(i); o[r.key] = r.data; } return o; };

try {
  for (const [name, width] of [['desktop', 1440], ['mobile', 390]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('[lattice]')) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction('window.__demo', { timeout: 60000 });
    await sleep(1500);
    const before = await page.evaluate(rows);
    const list = Object.values(before);
    check(list.length === 36, `${name}: 36 customers from four feeds`);
    check(list.every((r) => typeof r.spend === 'number' && typeof r.orders === 'number'), `${name}: rollups are numbers`);
    check(list.some((r) => /^\d{4}-\d\d-\d\d$/.test(r.lastPurchase)), `${name}: last purchase is a typed date`);
    check(list.every((r) => typeof r.cf_nps === 'number' && typeof r.churned === 'boolean'), `${name}: spread attributes and churn label are typed`);
    await page.click('#stream');
    await sleep(800);
    const after = await page.evaluate(rows);
    const changed = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    check(changed.length === 3, `${name}: New transactions changes only ${changed.join(', ')}`);
    check(await page.evaluate(() => document.querySelectorAll('.lat-cell--highlight').length >= 3), `${name}: changed cells are highlighted`);
    check(errors.length === 0, `${name}: console clean ${errors.join(' / ')}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no sideways scroll`);
    if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
    await page.close();
  }
} finally { await browser.close(); }
process.exit(failed ? 1 : 0);
