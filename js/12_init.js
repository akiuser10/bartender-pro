// BartenderPro — App init & bootstrap
// Lines 3137–3338 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// CLOUD SYNC state — declared before INIT below, since load()/save() run
// during init and reference these; a `let` referenced before its declaration
// line runs throws (temporal dead zone), so this block must come first.
// ═══════════════════════════════════════════════════════
const SYNC_KEY = 'bartenderpro_sync';
const POLL_INTERVAL_MS = 30000;  // check for remote changes every 30s
let syncChannel    = null;
let _syncDebounceTimer = null;
let _pollTimer     = null;
let _lastSyncTime  = 0;
let _lastPushedAt  = 0; // timestamp of our last push, so we don't re-apply our own update
const SYNC_MIN_INTERVAL_MS = 5000;

// Stays false until an initial pull completes for the configured bin, so a
// device can't push its local state over remote data it has never seen.
let _cloudSyncReady = false;

// Persisted "last synced" timestamp, shown when idle (i.e. no sync/push/pull in flight)
let _lastSyncedAt = null;
try { const s = localStorage.getItem('bartenderpro_last_synced'); if (s) _lastSyncedAt = parseInt(s, 10) || null; } catch(e) {}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
load();
loadMasterIngredients();
const _initCd = document.getElementById('currency-display'); if(_initCd) _initCd.textContent = state.currency;
const _hbn3=document.getElementById('header-bar-name'); if(_hbn3) _hbn3.textContent=state.barName;
if (state.invUsername) { const el=document.getElementById('inv-username'); if(el) el.value=state.invUsername; }
if (state.recvUsername) { const el=document.getElementById('recv-username'); if(el) el.value=state.recvUsername; }
renderDashboard();
renderIngredients();
renderInventory();
renderRecipes();
renderBatch();
renderHomeMade();
updateOrderBadge();
updateRecvBadge();
initCloudSync();
// ═══════════════════════════════════════════════════════
// CLOUD SYNC — uses localStorage broadcast + BroadcastChannel
// For full multi-device sync, user pastes a JSONBin.io bin ID in Settings.
// Free tier: 10k requests/month. Push is debounced to avoid rate limits.
// Auto-poll pulls every 30s so all devices stay in sync.
// ═══════════════════════════════════════════════════════

function recordSynced() {
  _lastSyncedAt = Date.now();
  try { localStorage.setItem('bartenderpro_last_synced', String(_lastSyncedAt)); } catch(e) {}
}

function showLastSynced() {
  if (!state.jsonbinId || !state.jsonbinKey) { setSyncStatus('', 'var(--smoke)'); return; }
  const label = _lastSyncedAt
    ? '☁ Last synced ' + new Date(_lastSyncedAt).toLocaleTimeString()
    : '☁ Not synced yet';
  setSyncStatus(label, 'var(--smoke)');
}

function updateSyncButtonVisibility() {
  const show = !!(state.jsonbinId && state.jsonbinKey);
  const btn = document.getElementById('sync-now-btn');
  if (btn) btn.style.display = show ? 'inline-flex' : 'none';
}

// JSONBin's free tier caps payloads at 100KB. state.ingredients alone runs
// ~140KB because it's the full 600+ item master catalog, baked into every
// device's copy of the app already — no need to push it wholesale. Instead
// we push only ingredients that differ from their fresh-loaded master
// default (e.g. inInventory toggled on, cost edited) plus any fully custom
// ingredient a user added that isn't in the master list at all.
function ingredientDiffersFromMaster(ing, master) {
  const keys = new Set([...Object.keys(ing), ...Object.keys(master)]);
  for (const k of keys) {
    if (JSON.stringify(ing[k]) !== JSON.stringify(master[k])) return true;
  }
  return false;
}

function buildSyncPayload() {
  const masterById = {};
  MASTER_LIST_DATA.forEach(d => { masterById[d.id] = d; });
  const ingredientOverrides = {};
  const customIngredients = [];
  (state.ingredients || []).forEach(ing => {
    const master = masterById[ing.id];
    if (!master) { customIngredients.push(ing); return; }
    const defaultRecord = { ...master, inInventory: false };
    if (ingredientDiffersFromMaster(ing, defaultRecord)) ingredientOverrides[ing.id] = ing;
  });

  const payload = { ...state };
  delete payload.ingredients;
  payload.ingredientOverrides = ingredientOverrides;
  payload.customIngredients = customIngredients;
  return payload;
}

// Reapply the lightweight ingredient sync fields onto the local (already
// master-loaded) ingredients array after a pull/poll.
function applyIngredientSync(pulled) {
  if (!pulled.ingredientOverrides && !pulled.customIngredients) return;
  const overrides = pulled.ingredientOverrides || {};
  const customs = pulled.customIngredients || [];
  if (!state.ingredients) state.ingredients = [];
  state.ingredients.forEach((ing, idx) => {
    if (overrides[ing.id]) state.ingredients[idx] = overrides[ing.id];
  });
  const existingIds = new Set(state.ingredients.map(i => i.id));
  customs.forEach(c => {
    if (existingIds.has(c.id)) {
      state.ingredients[state.ingredients.findIndex(i => i.id === c.id)] = c;
    } else {
      state.ingredients.push(c);
    }
  });
}

// Manual "Sync Now" — pulls any remote changes, then pushes current state
async function syncNow(btn) {
  if (!state.jsonbinId || !state.jsonbinKey) { toast('Add JSONBin Bin ID + Master Key in Settings first'); return; }
  const icon = btn?.querySelector('i');
  if (icon) icon.classList.add('fa-spin');
  if (btn) btn.disabled = true;
  try {
    // non-silent: on failure this sets its own specific status (auth error,
    // pull failed (status), or the real thrown-error message) instead of us
    // guessing. Only proceed to push if that pull actually succeeded.
    await cloudPull(false);
    if (_cloudSyncReady) await cloudPush();
  } finally {
    if (icon) icon.classList.remove('fa-spin');
    if (btn) btn.disabled = false;
  }
}

function initCloudSync() {
  // BroadcastChannel syncs across tabs on the same device instantly
  try {
    syncChannel = new BroadcastChannel(SYNC_KEY);
    syncChannel.onmessage = (e) => {
      if (e.data?.type === 'STATE_UPDATE' && e.data.state) {
        Object.assign(state, e.data.state);
        renderAll();
        showSyncBanner('↓ Updated from another tab');
      }
    };
  } catch(e) {}

  updateSyncButtonVisibility();
  showLastSynced();

  // Pull on startup, then auto-poll
  if (state.jsonbinId && state.jsonbinKey) {
    cloudPull(true);
    startPolling();
  }
}

function startPolling() {
  stopPolling();
  if (!state.jsonbinId || !state.jsonbinKey) return;
  _pollTimer = setInterval(() => cloudPoll(), POLL_INTERVAL_MS);
}

function stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

// Silent poll — checks if remote data is newer than what we last pushed
async function cloudPoll() {
  if (!state.jsonbinId || !state.jsonbinKey) return;
  try {
    const resp = await fetch(`https://api.jsonbin.io/v3/b/${state.jsonbinId}/latest`, {
      headers: { 'X-Master-Key': state.jsonbinKey, 'X-Bin-Meta': 'false' }
    });
    if (!resp.ok) return; // silent on poll errors
    _cloudSyncReady = true;
    const data = await resp.json();
    if (!data.record) return;
    const remote = data.record;
    // Only apply if remote is newer than our last push (uses _updatedAt timestamp)
    const remoteTs = remote._updatedAt || 0;
    recordSynced();
    if (remoteTs > _lastPushedAt) {
      // Remote has changes we don't have — apply them
      const before = JSON.stringify(state);
      Object.assign(state, remote);
      applyIngredientSync(remote);
      try { localStorage.setItem('barmanager_v1', JSON.stringify(state)); } catch(e) {}
      if (JSON.stringify(state) !== before) {
        renderAll();
        showSyncBanner('☁ Updated from another device');
        setSyncStatus('☁ Synced ' + new Date().toLocaleTimeString(), 'var(--success)');
        setTimeout(showLastSynced, 3000);
        return;
      }
    }
    showLastSynced();
  } catch(e) { console.error('[cloudPoll]', e); } // no UI noise, but still logged
}

function renderAll() {
  renderDashboard();
  renderIngredients();
  renderInventory();
  renderRecipes();
}

function broadcastState() {
  try { syncChannel?.postMessage({ type:'STATE_UPDATE', state }); } catch(e) {}
}

function schedulePush() {
  if (!state.jsonbinId || !state.jsonbinKey || !_cloudSyncReady) return;
  clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => cloudPush(), SYNC_MIN_INTERVAL_MS);
}

// Immediate push for destructive actions (delete, order placed etc.)
function saveAndSync() {
  try { localStorage.setItem('barmanager_v1', JSON.stringify(state)); } catch(e){}
  try { syncChannel?.postMessage({ type:'STATE_UPDATE', state }); } catch(e) {}
  if (state.jsonbinId && state.jsonbinKey && _cloudSyncReady) {
    clearTimeout(_syncDebounceTimer);
    _lastSyncTime = 0;
    cloudPush();
  }
}

function setSyncStatus(msg, color) {
  const el = document.getElementById('sync-status');
  if (el) { el.textContent = msg; el.style.color = color; }
  const el2 = document.getElementById('sync-status-settings');
  if (el2) el2.textContent = msg;
}

async function cloudPush() {
  if (!state.jsonbinId || !state.jsonbinKey || !_cloudSyncReady) return;
  const now = Date.now();
  if (now - _lastSyncTime < SYNC_MIN_INTERVAL_MS) {
    schedulePush(); return;
  }
  _lastSyncTime = now;
  _lastPushedAt = now;
  // Stamp our push time so other devices know this is newer
  state._updatedAt = now;
  try { localStorage.setItem('barmanager_v1', JSON.stringify(state)); } catch(e){}

  setSyncStatus('☁ Syncing…', 'var(--smoke)');
  try {
    const resp = await fetch(`https://api.jsonbin.io/v3/b/${state.jsonbinId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': state.jsonbinKey,
        'X-Bin-Versioning': 'true',
      },
      body: JSON.stringify(buildSyncPayload()),
    });
    if (resp.ok) {
      recordSynced();
      setSyncStatus('☁ Saved ' + new Date().toLocaleTimeString(), 'var(--success)');
      setTimeout(showLastSynced, 3000);
    } else if (resp.status === 429) {
      setSyncStatus('☁ Rate limited — retry in 1 min', 'var(--warning)');
      setTimeout(() => cloudPush(), 60000);
    } else if (resp.status === 401 || resp.status === 403) {
      setSyncStatus('☁ Auth error — check Master Key in Settings', 'var(--danger)');
    } else {
      setSyncStatus(`☁ Sync error (${resp.status})`, 'var(--warning)');
    }
  } catch(e) {
    console.error('[cloudPush]', e);
    // A thrown fetch error isn't necessarily "offline" — an invalid Bin ID/Master
    // Key (bad characters from a copy-paste) makes the browser reject the request
    // before it ever reaches the network, throwing the same way a real network
    // failure would. Surface the real message so this is diagnosable without devtools.
    setSyncStatus('☁ Sync failed — ' + (e?.message || 'offline') + ' (check Bin ID/Key)', 'var(--warning)');
    setTimeout(() => cloudPush(), 30000);
  }
}

async function cloudPull(silent=false) {
  if (!state.jsonbinId || !state.jsonbinKey) return;
  if (!silent) setSyncStatus('☁ Pulling…', 'var(--smoke)');
  try {
    const resp = await fetch(`https://api.jsonbin.io/v3/b/${state.jsonbinId}/latest`, {
      headers: { 'X-Master-Key': state.jsonbinKey }
    });
    if (!resp.ok) {
      if (!silent) {
        if (resp.status === 401 || resp.status === 403)
          setSyncStatus('☁ Auth error — check Master Key in Settings', 'var(--danger)');
        else setSyncStatus(`☁ Pull failed (${resp.status})`, 'var(--warning)');
      }
      return;
    }
    _cloudSyncReady = true;
    const data = await resp.json();
    if (data.record) {
      const pulled = data.record;
      _lastPushedAt = pulled._updatedAt || 0;
      Object.assign(state, pulled);
      applyIngredientSync(pulled);
      try { localStorage.setItem('barmanager_v1', JSON.stringify(state)); } catch(e) {}
      renderAll();
      recordSynced();
      showSyncBanner('☁ Synced from cloud');
      setSyncStatus('☁ Pulled ' + new Date().toLocaleTimeString(), 'var(--success)');
      setTimeout(showLastSynced, 3000);
    }
  } catch(e) {
    console.error('[cloudPull]', e);
    if (!silent) setSyncStatus('☁ Pull failed — ' + (e?.message || 'check connection'), 'var(--warning)');
  }
}

function showSyncBanner(msg) {
  const b = document.getElementById('sync-toast');
  if (!b) return;
  b.textContent = msg; b.style.opacity = '1';
  setTimeout(() => b.style.opacity = '0', 3000);
}
