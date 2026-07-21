// BartenderPro — Save / load / cloud sync
// Lines 61–92 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════

// Safe file download — appends anchor to body to prevent page navigation
function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function save() {
  try { localStorage.setItem('barmanager_v1', JSON.stringify(state)); } catch(e){}
  try { syncChannel?.postMessage({ type:'STATE_UPDATE', state }); } catch(e) {}
  // _cloudSyncReady stays false until an initial pull completes, so a fresh
  // device can't push its (empty) local state over real data still in the bin.
  if (state.jsonbinId && state.jsonbinKey && _cloudSyncReady) {
    schedulePush();
    if (!_pollTimer) startPolling(); // ensure polling is running
  }
}
function load() {
  try {
    const d = localStorage.getItem('barmanager_v1');
    if (d) {
      const parsed = JSON.parse(d);
      Object.assign(state, parsed);
    }
  } catch(e){}
  // Self-heal if an older broken sync ever left one of these as a non-array
  // (e.g. {}) — loadMasterIngredients() repopulates from master data below,
  // rather than every render crashing on state.recipes.filter() forever.
  if (!Array.isArray(state.ingredients)) state.ingredients = [];
  if (!Array.isArray(state.recipes)) state.recipes = [];
  if (!Array.isArray(state.homeMade)) state.homeMade = [];
}
