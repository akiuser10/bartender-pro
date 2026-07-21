// BartenderPro — Utility helpers, formatters, badges
// Lines 93–214 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════
function fmt(val) {
  const c = CURRENCIES[state.currency] || CURRENCIES.AED;
  return c.sym + Number(val).toFixed(c.dec);
}
function pct(val) { return (val*100).toFixed(1) + '%'; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function toast(msg, ms=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function abvToDensity(abv) {
  // Formula: (ABV% × 0.789) + ((1 − ABV%) × 1.0)
  const a = parseFloat(abv) || 0;
  const frac = a / 100;
  return Math.round(((frac * 0.789) + ((1 - frac) * 1.0)) * 1000) / 1000;
}
function brixToDensity(brix) {
  return Math.round((1 + (parseFloat(brix) || 0) * 0.004) * 1000) / 1000;
}
function categoryBadge(cat) {
  const map = {
    spirits:        'badge-spirits Spirits',
    liqueur:        'badge-liqueur Liqueur',
    amaro:          'badge-amaro Amaro',
    bitters:        'badge-bitters Bitters',
    wine_red:       'badge-wine-red Red Wine',
    wine_white:     'badge-wine-white White Wine',
    wine_rose:      'badge-wine-rose Rosé Wine',
    wine_sweet:     'badge-wine-sweet Sweet Wine',
    sparkling:      'badge-sparkling Sparkling',
    fortified_wine: 'badge-fortified Fortified Wine',
    aromatised_wine:'badge-aromatised Aromatised Wine',
    beer:           'badge-beer Beer',
    beer_keg:       'badge-beer Beer Keg',
    juice_fresh:    'badge-juice Fresh Juice',
    juice_canned:   'badge-juice Canned Juice',
    soft_drink:     'badge-softdrink Soft Drink',
    water:          'badge-water Water',
    fruit:          'badge-fruit Fruit',
    citrus:         'badge-citrus Citrus',
    berry:          'badge-berry Berry',
    vegetable:      'badge-vegetable Vegetable',
    herb:           'badge-herb Herb',
    spice:          'badge-spice Spice',
    dry_fruit:      'badge-dryfruit Dry Fruit',
    nut:            'badge-nut Nut',
    seed:           'badge-seed Seed',
    syrup:          'badge-syrup Syrup',
    puree:          'badge-puree Puree',
    milk:           'badge-milk Milk/Cream',
    coffee:         'badge-coffee Coffee & Tea',
    other:          'badge-other Other',
  };
  const parts = (map[cat]||'badge-other Other').split(' ');
  const cls = parts[0];
  const lbl = parts.slice(1).join(' ');
  return `<span class="badge ${cls}">${lbl}</span>`;
}
function typeBadge(t) {
  const m = {
    signature: 'badge-cocktail Signature Cocktail',
    classic:   'badge-cocktail Classic Cocktail',
    cocktail:  'badge-cocktail Cocktail',       // legacy
    mocktail:  'badge-mocktail Mocktail',
    coffee:    'badge-coffee Coffee & Tea',
    beer:      'badge-beer Beer & Wine'
  };
  const parts = (m[t]||'badge-other Unknown').split(' ');
  const cls = parts[0];
  const lbl = parts.slice(1).join(' ');
  // signature gets a ★ prefix
  const icon = t === 'signature' ? '★ ' : '';
  return `<span class="badge ${cls}">${icon}${lbl}</span>`;
}
function costClass(pctVal) {
  if (pctVal <= state.targetCostPct/100) return 'good';
  if (pctVal <= state.targetCostPct/100 * 1.4) return 'ok';
  return 'high';
}
function ingById(id) { return state.ingredients.find(x=>x.id===id); }
// Liquid categories use ml for unit size; food/garnish categories use grams
function isLiquidCat(cat) {
  // Only genuinely pourable liquid categories get the 3-input bottle system
  return ['spirits','liqueur','amaro','bitters',
          'wine_red','wine_white','wine_rose','wine_sweet',
          'sparkling','fortified_wine','aromatised_wine',
          'beer','beer_keg','juice_fresh','juice_canned',
          'syrup','puree','milk'].includes(cat);
}
// Water & soft drinks: sealed bottles only (no open partial measurement needed)
function isSealedOnlyCat(cat) {
  // These are always counted as sealed units — no open-bottle gross-weight measurement
  return ['water','soft_drink','beer'].includes(cat);
}
// Solid/unit items: measured in grams or nos
function isSolidCat(cat) {
  return ['fruit','citrus','berry','vegetable','herb','spice',
          'dry_fruit','nut','seed','coffee','other'].includes(cat);
}
// Ice blocks and unit items (unitSize <= 1 in 'other' cat)
function isNosCat(ing) {
  return !isLiquidCat(ing.cat) && !isSealedOnlyCat(ing.cat) && ing.unitSize <= 1;
}
// Display unit for order list / received tab
function getIngUnit(ing) {
  if (ing.cat === 'beer_keg') return 'keg';
  if (isLiquidCat(ing.cat) || isSealedOnlyCat(ing.cat)) return 'btl';
  if (isNosCat(ing)) return 'nos';
  return 'g';
}
// Combined liquid check for calcs (includes water/softdrink for ml math)
function isAnyLiquidCat(cat) {
  return isLiquidCat(cat) || isSealedOnlyCat(cat);
}
