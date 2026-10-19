# Feature table without glue code

Four raw feeds from four systems (customers, transactions, an entity/attribute/value table of
custom attributes, and churn labels) go into the Lattice Grid data router, and one live grid of
customer features comes out. The router joins them, rolls transactions up into a count, a spend
and a last-purchase date, spreads the custom attributes into columns, and turns text dates,
decimal commas and Y/N flags into real dates, numbers and booleans. Press **New transactions**
and only the customers who bought something change, with a visible highlight.

| | |
| --- | --- |
| Grid on npm | [@toclocoinc/lattice-grid](https://www.npmjs.com/package/@toclocoinc/lattice-grid) |
| Product site | [latticegrid.dev](https://www.latticegrid.dev) |
| The data router | [latticegrid.dev/data-router](https://www.latticegrid.dev/data-router/) |

## What it shows

- **Four feeds in `data/`.** 36 customers, 143 transactions, 144 custom-attribute rows and 36
  churn labels, all seeded and invented. Dates are `dd/MM/yyyy` text, amounts are `"1.234,56"`,
  attributes are one row per value.
- **One grid out.** One row per customer: orders, spend and last purchase from a rollup join;
  plan, NPS, newsletter and loyalty date from a spread join; the churn label from a lookup join.
- **The declaration is the running code.** The panel beside the grid prints the `DECLARATION`
  object in `main.js`, the same object handed to the router, so it cannot drift from what runs.
- **Only what changed moves.** "New transactions" streams three rows into the transaction feed.
  The router re-emits only those three customers, and their changed cells flash.

## The setup

Plain JavaScript: `index.html`, `main.js` and a stylesheet. The grid and the data router module
load from the published package, so there is nothing to install and no build step. The wiring
is under 70 lines. The part that matters:

```js
router.addSource('customer', {
  fields: { joined: { type: 'date', format: 'dd/MM/yyyy' } },
  join: [
    { from: 'transaction', foreignKey: 'customerId', many: true,
      aggregate: { orders: { fn: 'count' }, spend: { field: 'amount', fn: 'sum' },
                   lastPurchase: { field: 'date', fn: 'last', orderBy: 'date' } } },
    { from: 'attribute', foreignKey: 'customerId', spread: { name: 'attribute', value: 'value', prefix: 'cf_' } },
    { from: 'churn', localKey: 'id', foreignKey: 'customerId', fields: ['churned'] },
  ],
});
```

## Run it

    npm install        # only needed for the check script
    npm run serve      # then open http://localhost:8000/

Add `?theme=dark` for the dark theme. `node tools/build-data.mjs` rewrites the feeds (same
seed, same files).

## Check it

    node tools/verify.mjs [--shots dir]     # Node 22+, real headless Chrome

It loads the page at 1440 and 390 wide, checks the rollups and typed columns, presses
**New transactions**, and checks only three customers changed, with the console clean.

## Licence

Demo code: MIT, see `LICENSE`. Lattice Grid is loaded from the package CDN under its own
licence; the page carries the public-demo licence for `toclocoinc.github.io`, so no watermark
shows there. Keyless, no analytics.

Built with [the Lattice Grid data router](https://www.latticegrid.dev/data-router/).
