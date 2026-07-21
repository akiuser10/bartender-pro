# Bartender Pro — Bar Management PWA

A comprehensive single-file Progressive Web App for professional bar management.

## Files

| File | Description |
|------|-------------|
| `BartenderPro.html` | **Production file** — open this in your browser. Self-contained. |
| `index.html` | Reference/review version with external CSS & JS |
| `css/styles.css` | All app styles (extracted from BartenderPro.html) |
| `js/01_state.js` | State object, constants, master ingredient/recipe data |
| `js/02_persistence.js` | LocalStorage save/load, cloud sync (JSONBin.io) |
| `js/03_utils.js` | Formatters, badges, category helpers, utility functions |
| `js/04_navigation.js` | Screen navigation, currency switcher |
| `js/05_dashboard.js` | Dashboard KPIs, low-stock alerts, N/A items panel |
| `js/06_ingredients.js` | Ingredients CRUD, search/filter, modal, N/A toggle |
| `js/07_orders.js` | Order list, gap calculation, place order modal |
| `js/08_received.js` | Goods received, delivery tracking |
| `js/09_ai_creator.js` | AI-powered recipe creator (Claude API) |
| `js/10_settings.js` | Settings, company profile, team, suppliers |
| `js/11_sample_data.js` | Master data loader (603 ingredients, 90 recipes, 30 HM) |
| `js/12_init.js` | App initialisation & bootstrap |
| `js/13_wastage.js` | Wastage log |
| `js/14_homemade.js` | Home-made ingredients & HM inventory |
| `js/15_batch.js` | Batch calculator |
| `build_bar_costing.py` | Python script — original costing spreadsheet builder |
| `recalc.py` | Python script — ingredient cost recalculator |

## Stack

- **Vanilla JS** — no framework, no build step
- **Single HTML file** (BartenderPro.html) — everything inlined
- **LocalStorage** for offline persistence
- **JSONBin.io** for optional cloud sync across devices
- **Claude API** for AI recipe creation & N/A ingredient alternatives
- **Font Awesome 6.5** + **Google Fonts (Inter)**

## Running

Just open `BartenderPro.html` in any modern browser. No server needed.

## Key Features

| Tab | What it does |
|-----|-------------|
| Dashboard | KPIs, low stock alerts, N/A ingredient warnings |
| Ingredients | 603-item master list, category badges, cost/ml |
| Inventory | Stock count with bottle/keg/gram measurement |
| Order List | Auto gap-calc, supplier grouping, reason modal |
| Received | Goods receiving, partial delivery tracking |
| Wastage | Wastage log with cost impact |
| Recipes | 90 pre-loaded recipes, cost%, GP, tax calc |
| Batching | Scale recipes for batch production |
| Home-Made | 30 pre-loaded HM syrups & infusions |
| AI Creator | Claude-powered recipe generator |
| Suppliers | Full supplier directory with bank & payment terms |
| Settings | Bar details, team, cloud sync, house pours |

## Data Model

All data lives in `state` (localStorage key: `barmanager_v1`):

```
state = {
  currency, barName, apiKey, targetCostPct,
  company: { name, email, phone, address, logo },
  users: [{ name, position, role }],
  suppliers: [{ name, contact, email, phone, address, bank,
                paymentTerms, paymentDue, creditLimit }],
  ingredients: [{ id, supplier, desc, cat, tahweel,
                  unitSize, abv, density, tare, cost,
                  costPerGram, maxPar, minPar }],
  inventory: { [ingId]: { sealedBtls, openBtls, openGrams } },
  recipes: [{ id, name, type, price, lines: [{ ingId, qty, unit }] }],
  homeMade: [{ id, hmId, name, lines, totalCost, trackInv }],
  hmInventory: { [hmId]: { sealedBtls, openBtls, openGrams, qty } },
  batchLog: [...],
  wastageLog: [...],
  placedOrders: [...],
}
```

## Category System

**Liquids** (3-input: sealed / open / gross wt):
`spirits, liqueur, amaro, bitters, wine_*, sparkling, fortified_wine, aromatised_wine, beer_keg, juice_fresh, juice_canned, syrup, puree, milk`

**Sealed-only** (count bottles, no open partial):
`beer, water, soft_drink`

**Solids** (grams or nos):
`fruit, citrus, berry, vegetable, herb, spice, dry_fruit, nut, seed, coffee, other`

## Cloud Sync

Set JSONBin.io credentials in Settings → Cloud Sync.
State is pushed on every save (5s debounce) and polled every 30s.
