// BartenderPro — Screen navigation & currency
// Lines 215–249 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
function showScreen(name, el) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  // sidebar
  document.querySelectorAll('#sidebar .nav-item').forEach(n=>n.classList.remove('active'));
  // mobile nav
  document.querySelectorAll('.mobile-nav-item').forEach(n=>n.classList.remove('active'));
  if (el) el.classList.add('active');
  // refresh
  const fns = {dashboard:renderDashboard, ingredients:renderIngredients,
    inventory:renderInventory, stockinhand:renderStockInHand, orders:renderOrders, received:renderReceived,
    wastage:renderWastage, batch:renderBatch, homemade:renderHomeMade,
    recipes:renderRecipes, suppliers:renderSuppliersScreen, settings:renderSettings};
  if (fns[name]) fns[name]();
}

// ═══════════════════════════════════════════════════════
// CURRENCY
// ═══════════════════════════════════════════════════════
function setCurrency(v) {
  state.currency = v;
  const _settCur = document.getElementById('setting-currency'); if(_settCur) _settCur.value = v;
  const _cd = document.getElementById('currency-display'); if(_cd) _cd.textContent = v;
  save(); renderDashboard(); renderRecipes();
}
function setCurrencyFromSettings(v) {
  state.currency = v;
  const _cd2 = document.getElementById('currency-display'); if (_cd2) _cd2.textContent = v;
  const _sc2 = document.getElementById('setting-currency'); if (_sc2) _sc2.value = v;
  save(); renderDashboard(); renderRecipes();
}
