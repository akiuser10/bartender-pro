// BartenderPro — Login / auth
// Each team member (state.users[]) has an email + hashed password. The app is
// gated behind #login-screen until a valid session exists for this device.
// ═══════════════════════════════════════════════════

const SESSION_KEY = 'bartenderpro_session';
let currentUser = null;

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function findUserByEmail(email) {
  const e = (email || '').trim().toLowerCase();
  if (!e) return null;
  return (state.users || []).find(u => (u.email || '').trim().toLowerCase() === e);
}

// Called once on load — restores a persisted session or shows the login screen
function initAuthGate() {
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) {}
  if (session?.email) {
    const u = findUserByEmail(session.email);
    if (u) { loginAs(u, false); return; }
  }
  renderLoginScreen();
}

function renderLoginScreen() {
  const hasUsers = (state.users || []).length > 0;
  const loginWrap = document.getElementById('login-form-wrap');
  const firstRunWrap = document.getElementById('login-firstrun-wrap');
  if (loginWrap) loginWrap.style.display = hasUsers ? 'block' : 'none';
  if (firstRunWrap) firstRunWrap.style.display = hasUsers ? 'none' : 'block';
}

function loginAs(user, persist = true) {
  currentUser = user;
  state.invUsername = user.name;
  if (!state.recvUsername) state.recvUsername = user.name;
  if (persist) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, ts: Date.now() })); } catch (e) {}
  }
  const screen = document.getElementById('login-screen');
  if (screen) screen.classList.add('hidden');
  const el1 = document.getElementById('inv-username'); if (el1) el1.value = user.name;
  const el2 = document.getElementById('recv-username'); if (el2) el2.value = state.recvUsername;
  const nameEl = document.getElementById('current-user-name'); if (nameEl) nameEl.textContent = user.name;
  save();
}

function showLoginError(msg) {
  const errEl = document.getElementById('login-error');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}

async function attemptLogin() {
  const email = document.getElementById('login-email')?.value || '';
  const pw = document.getElementById('login-password')?.value || '';
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.style.display = 'none';
  if (!email || !pw) { showLoginError('Enter your email and password'); return; }
  const user = findUserByEmail(email);
  if (!user) { showLoginError('Invalid email or password'); return; }
  const hash = await sha256Hex(pw);
  if (user.password !== hash) { showLoginError('Invalid email or password'); return; }
  loginAs(user, true);
  toast(`Welcome back, ${user.name}`);
}

async function createFirstAccount() {
  const company = document.getElementById('login-new-company')?.value.trim();
  const name = document.getElementById('login-new-name')?.value.trim();
  const email = document.getElementById('login-new-email')?.value.trim();
  const pw = document.getElementById('login-new-password')?.value || '';
  const errEl = document.getElementById('login-firstrun-error');
  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
  if (errEl) errEl.style.display = 'none';
  if (!company || !name || !email || !pw) { showErr('Fill in all fields'); return; }
  if (pw.length < 4) { showErr('Password must be at least 4 characters'); return; }
  const hash = await sha256Hex(pw);
  const user = { name, position: 'Admin', email, mobile: '', role: 'manager', password: hash };
  if (!state.users) state.users = [];
  state.users.push(user);
  // All accounts made from here share this state, so they belong to one company —
  // the same JSONBin cloud sync (Settings) is what lets teammates on other
  // devices see this same company's users/data instead of starting a new one.
  state.company = { ...(state.company || {}), name: company };
  state.barName = company;
  const hbn = document.getElementById('header-bar-name'); if (hbn) hbn.textContent = company;
  loginAs(user, true);
  saveAndSync();
  renderUsersList();
  toast(`✓ ${company} account created — welcome, ${name}`);
}

// Re-check login after a cloud pull merges in remote users (e.g. a teammate's
// device already had a jsonbinId/Key configured before anyone logged in here)
function refreshAuthAfterSync() {
  if (currentUser) return;
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) {}
  if (session?.email) {
    const u = findUserByEmail(session.email);
    if (u) { loginAs(u, false); return; }
  }
  renderLoginScreen();
}

function logout() {
  if (!confirm('Log out?')) return;
  currentUser = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  const screen = document.getElementById('login-screen');
  if (screen) screen.classList.remove('hidden');
  renderLoginScreen();
  const emailEl = document.getElementById('login-email'); if (emailEl) emailEl.value = '';
  const pwEl = document.getElementById('login-password'); if (pwEl) pwEl.value = '';
}
