// BartenderPro — Login / auth
// Each team member (state.users[]) has an email + hashed password. The app is
// gated behind #login-screen until a valid session exists for this device.
// The login screen always starts on a Register/Log In choice; Register is
// open to anyone at any time (not just the very first user).
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
  showLoginPanel('choice');
}

// panel: 'choice' | 'login' | 'register'
function showLoginPanel(panel) {
  const wraps = { choice:'login-choice-wrap', login:'login-form-wrap', register:'login-register-wrap' };
  Object.entries(wraps).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (key === panel) ? 'block' : 'none';
  });
  const loginErr = document.getElementById('login-error'); if (loginErr) loginErr.style.display = 'none';
  const regErr = document.getElementById('login-register-error'); if (regErr) regErr.style.display = 'none';
  if (panel === 'register') applyRegisterCompanyLock();
}

// This data store belongs to one company at a time — once it has one, lock
// the Company field to it so a typo or a second team can't spin up a rival
// company's data inside the same synced dataset. registerUser() re-checks
// this server-side-equivalent (state-side) too, in case the field is tampered with.
function applyRegisterCompanyLock() {
  const companyEl = document.getElementById('reg-company');
  const hintEl = document.getElementById('reg-company-hint');
  if (!companyEl) return;
  const existing = state.company?.name;
  if (existing) {
    companyEl.value = existing;
    companyEl.readOnly = true;
    companyEl.style.opacity = '0.7';
    if (hintEl) { hintEl.textContent = `This device is set up for ${existing} — registering will add you to this company's team.`; hintEl.style.display = 'block'; }
  } else {
    companyEl.readOnly = false;
    companyEl.style.opacity = '1';
    if (hintEl) hintEl.style.display = 'none';
  }
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
  if (!user) {
    showLoginError((state.users||[]).length ? 'Invalid email or password' : 'No account yet — tap Register below');
    return;
  }
  const hash = await sha256Hex(pw);
  if (user.password !== hash) { showLoginError('Invalid email or password'); return; }
  loginAs(user, true);
  toast(`Welcome back, ${user.name}`);
}

async function registerUser() {
  const val = (id) => document.getElementById(id)?.value.trim() || '';
  const firstName = val('reg-first-name');
  const lastName  = val('reg-last-name');
  const company   = val('reg-company');
  const barName   = val('reg-bar-name');
  const position  = val('reg-position');
  const email     = val('reg-email');
  const mobile    = val('reg-mobile');
  const pw  = document.getElementById('reg-password')?.value || '';
  const pw2 = document.getElementById('reg-password2')?.value || '';
  const errEl = document.getElementById('login-register-error');
  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
  if (errEl) errEl.style.display = 'none';
  if (!firstName || !lastName || !company || !barName || !position || !email || !mobile || !pw || !pw2) {
    showErr('Fill in all fields'); return;
  }
  if (pw.length < 4) { showErr('Password must be at least 4 characters'); return; }
  if (pw !== pw2) { showErr('Passwords do not match'); return; }
  if (findUserByEmail(email)) { showErr('An account with this email already exists — log in instead'); return; }
  const existingCompany = state.company?.name;
  if (existingCompany && company.toLowerCase() !== existingCompany.toLowerCase()) {
    showErr(`This device already belongs to "${existingCompany}". Contact a manager to be added, or reset app data (Settings) to start a new company.`);
    return;
  }

  const hash = await sha256Hex(pw);
  const isFirstUser = !(state.users||[]).length;
  const name = `${firstName} ${lastName}`.trim();
  const user = { name, firstName, lastName, position, email, mobile, role: isFirstUser ? 'manager' : 'bartender', password: hash };
  if (!state.users) state.users = [];
  state.users.push(user);
  // All accounts made from here share this state, so they belong to one company —
  // the same JSONBin cloud sync (Settings) is what lets teammates on other
  // devices see this same company's users/data instead of starting a new one.
  // Only the first registrant on a fresh install actually sets the company/bar
  // name; later registrants join whatever is already configured.
  if (!state.company?.name) {
    state.company = { ...(state.company || {}), name: company };
  }
  if (!state.barName || state.barName === 'My Bar') {
    state.barName = barName;
    const hbn = document.getElementById('header-bar-name'); if (hbn) hbn.textContent = barName;
  }
  loginAs(user, true);
  saveAndSync();
  renderUsersList();
  toast(`✓ Account created — welcome, ${name}`);
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
}

function logout() {
  if (!confirm('Log out?')) return;
  currentUser = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  const screen = document.getElementById('login-screen');
  if (screen) screen.classList.remove('hidden');
  showLoginPanel('choice');
  const emailEl = document.getElementById('login-email'); if (emailEl) emailEl.value = '';
  const pwEl = document.getElementById('login-password'); if (pwEl) pwEl.value = '';
}
