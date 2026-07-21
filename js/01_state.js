// BartenderPro — State, constants & master data
// Lines 1–60 of original bar_app.html
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
const CURRENCIES = {
  AED:{sym:'AED ',dec:2}, USD:{sym:'$',dec:2}, EUR:{sym:'€',dec:2},
  GBP:{sym:'£',dec:2}, SAR:{sym:'SAR ',dec:2}, QAR:{sym:'QAR ',dec:2},
  INR:{sym:'₹',dec:2}, JPY:{sym:'¥',dec:0}, CAD:{sym:'CA$',dec:2},
  AUD:{sym:'A$',dec:2}
};

const DENSITY_PRESETS = {
  'Water / Sparkling': 1.000,
  'Fresh Juice': 1.040,
  'Simple Syrup (1:1)': 1.200,
  'Rich Syrup (2:1)': 1.264,
  'Agave Syrup': 1.290,
  'Honey Syrup': 1.270,
  'Fruit Puree': 1.100,
  'Cream (dairy)': 1.005,
  'Coconut Cream': 0.980,
  'Milk': 1.030,
  'Spirits (generic)': 0.916,
  'Wine (dry)': 0.991,
  'Beer': 1.005,
};

// ── HOME-MADE constants (must be before init calls) ──
const HM_TYPES = { syrup:'Syrup', infusion:'Infused Spirit', cordial:'Cordial',
  shrub:'Shrub', puree:'Puree', bitters:'Bitters', mix:'Pre-mix', other:'Other' };
const HM_CATS = ['all','alcoholic','non_alcoholic','infusion','syrup','mix','shrub','cordial','puree','bitters','other'];
const HM_TYPE_BADGE_CLASS = {
  syrup:'badge-syrup', infusion:'badge-infusion', cordial:'badge-cordial',
  shrub:'badge-shrub', puree:'badge-puree', bitters:'badge-bitters',
  mix:'badge-premix', other:'badge-other'
};
function hmTypeBadge(type) {
  const cls = HM_TYPE_BADGE_CLASS[type] || 'badge-other';
  return `<span class="badge ${cls}">${HM_TYPES[type]||type}</span>`;
}
let hmIngRows = [];
let editHMId  = null;
let hmFilter  = 'all';

// ── BATCH constants ──
const BATCH_ALCOHOL_CATS = ['spirits','liqueur','amaro','bitters','wine_red','wine_white','wine_rose','wine_sweet','sparkling','fortified_wine','aromatised_wine','beer','beer_keg',
  'hm_alcoholic']; // home-made infused spirits, shrubs, bitters
const BATCH_SYRUP_CATS   = ['syrup','hm_syrup']; // home-made syrups go with syrup in alcohol table
const BATCH_JUICE_CATS   = ['juice_fresh','juice_canned','soft_drink','water','milk','puree','coffee','other',
  'hm_nonalc']; // home-made non-alc mixes, cordials

let state = {
  currency: 'AED',
  barName: 'My Bar',
  apiKey: '',
  targetCostPct: 22,
  ingredients: [],
  inventory: {},
  recipes: [],
  ingFilter: 'all',
  invFilter: 'all',
  recFilter: 'all',
  editIngId: null,
  editRecId: null,
  currentRecipeId: null,
};
let lastFromInventory = false;
let lastAiRaw = '';
