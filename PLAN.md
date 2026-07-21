# Bar Management PWA — Design Plan

## Subject
Professional bar management tool for a UAE-based bar. Audience: bar manager + team of 2-10.
Single job: manage ingredients, take inventory in grams (auto-convert to ml), cost recipes, run AI recipe generator.

## Palette
- Obsidian: #0F0F1A (deepest bg — bar at night)
- Slate: #1C1C2E (sidebar, panels)
- Surface: #242438 (cards)
- Gold: #C9A84C (accent — premium spirits label feel)
- Gold dim: #8B6914 (secondary gold)
- Smoke: #9898B0 (secondary text)
- Ice: #E8E8F0 (primary text)
- Success: #4CAF82
- Warning: #F5A623
- Danger: #E05252

## Typography
- Display: 'Playfair Display' — used ONLY for screen titles (evokes premium spirits labels)
- Body/UI: 'Inter' — clean utility at all sizes
- Monospace numbers: tabular-nums for all financial figures

## Layout
- Mac/iPad: fixed left sidebar (220px) + main content area
- Mobile: bottom tab bar + full-width content
- Signature: gold hairline left border on active sidebar item + subtle gold glow on key metrics

## Screens (tabs)
1. Dashboard — KPI cards + low stock alerts + quick actions
2. Ingredients — master list with ABV→density auto-calc
3. Inventory — daily stock entry in grams, live ml conversion
4. Recipes — recipe library with cost%, method cards
5. AI Creator — Claude-powered recipe generation
6. Settings — currency, bar name, API key, density presets

## Key interactions
- Gram input → live ml conversion shown below as you type
- ABV input → density auto-calculated
- Ingredient price change → all recipe costs update live
- Currency switcher in header (AED, USD, EUR, GBP, INR, SAR, QAR)

## Signature element
Gold animated shimmer on the stock value KPI card — like light catching a bottle label.
