// BartenderPro — Init loader
// Lines 3038–3136 of original bar_app.html
// ═══════════════════════════════════════════════════

function loadMasterIngredients() {
  if (!Array.isArray(state.ingredients)) state.ingredients = [];
  if (!Array.isArray(state.recipes)) state.recipes = [];
  if (!Array.isArray(state.homeMade)) state.homeMade = [];
  save();
}
