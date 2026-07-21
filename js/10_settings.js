// BartenderPro — Settings, company, team, suppliers
// Lines 2403–3037 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// COMPANY PROFILE
// ═══════════════════════════════════════════════════════
function saveCompanyProfile() {
  const c = state.company || {};
  state.company = {
    name:    document.getElementById('co-name')?.value||c.name||'',
    email:   document.getElementById('co-email')?.value||c.email||'',
    phone:   document.getElementById('co-phone')?.value||c.phone||'',
    city:    document.getElementById('co-city')?.value||c.city||'',
    address: document.getElementById('co-address')?.value||c.address||'',
    country: document.getElementById('co-country')?.value||c.country||'',
    logo:    c.logo||'',
  };
  if (state.company.name) {
    state.barName = state.company.name;
    const hbn=document.getElementById('header-bar-name'); if(hbn) hbn.textContent=state.company.name;
  }
  save();
}
function uploadCompanyLogo(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    if (!state.company) state.company = {};
    state.company.logo = e.target.result;
    renderCompanyLogoPreview(); save(); toast('✓ Logo uploaded');
  };
  reader.readAsDataURL(file);
}
function renderCompanyLogoPreview() {
  const el = document.getElementById('company-logo-preview'); if (!el) return;
  if (state.company?.logo) {
    el.innerHTML = `<img src="${state.company.logo}" style="width:100%;height:100%;object-fit:contain">`;
  } else {
    el.innerHTML = `<span style="font-size:10px;color:var(--smoke);text-align:center"><i class="fa-solid fa-image" style="font-size:24px;display:block;margin-bottom:4px"></i>Upload Logo</span>`;
  }
}
function loadCompanyProfile() {
  const c = state.company||{};
  const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  sv('co-name',c.name); sv('co-email',c.email); sv('co-phone',c.phone);
  sv('co-city',c.city); sv('co-address',c.address); sv('co-country',c.country);
  renderCompanyLogoPreview();
}

// ═══════════════════════════════════════════════════════
// TEAM MEMBERS
// ═══════════════════════════════════════════════════════
function renderUsersList() {
  const el = document.getElementById('users-list'); if (!el) return;
  const users = state.users||[];
  if (!users.length) { el.innerHTML=`<div style="font-size:12px;color:var(--smoke)">No team members added yet.</div>`; return; }
  el.innerHTML = users.map((u,i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px;flex-wrap:wrap">
      <div style="width:34px;height:34px;border-radius:50%;background:rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--gold);flex-shrink:0">${(u.name||'?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:120px">
        <div style="font-size:13px;font-weight:600;color:var(--ice)">${escHtml(u.name||'—')}</div>
        <div style="font-size:11px;color:var(--smoke)">${escHtml(u.position||'')} &nbsp;·&nbsp; <span style="color:${u.role==='manager'?'var(--gold)':'var(--smoke)'}">${u.role==='manager'?'Manager':'Bartender'}</span></div>
        <div style="font-size:11px;color:var(--smoke)">${escHtml(u.email||'')} ${u.mobile?`· ${escHtml(u.mobile)}`:''}</div>
      </div>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="editUser(${i})"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="removeUser(${i})"><i class="fa-solid fa-trash"></i></button>
    </div>`).join('');
}
function addUser() {
  const name=prompt('Full Name:'); if(!name?.trim()) return;
  const position=prompt('Position (e.g. Head Bartender):')||'';
  const email=prompt('Email:')||'';
  const mobile=prompt('Mobile:')||'';
  const r=prompt('Role:\n1 = Manager\n2 = Bartender','2')||'2';
  if (!state.users) state.users=[];
  state.users.push({name:name.trim(),position,email,mobile,role:r.trim()==='1'?'manager':'bartender'});
  save(); renderUsersList(); toast(`✓ ${name} added to team`);
}
function editUser(idx) {
  const u=(state.users||[])[idx]; if(!u) return;
  u.name=prompt('Full Name:',u.name)||u.name;
  u.position=prompt('Position:',u.position)||u.position;
  u.email=prompt('Email:',u.email)||u.email;
  u.mobile=prompt('Mobile:',u.mobile)||u.mobile;
  const r=prompt('Role (1=Manager, 2=Bartender):',u.role==='manager'?'1':'2')||'2';
  u.role=r.trim()==='1'?'manager':'bartender';
  save(); renderUsersList();
}
function removeUser(idx) {
  if (!confirm('Remove this team member?')) return;
  (state.users||[]).splice(idx,1); save(); renderUsersList();
}

// ═══════════════════════════════════════════════════════
// SUPPLIERS (managed on the separate Suppliers tab — see renderSuppliersScreen below)
// ═══════════════════════════════════════════════════════
function showSupplierModal(idx, fromIngredient) {
  const sups = state.suppliers || [];
  const s = idx != null ? sups[idx] : {};
  const isEdit = idx != null;

  // Remove any existing modal
  document.getElementById('supplier-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'supplier-modal';
  if (fromIngredient) modal.dataset.fromIngredient = '1';

  // Build modal using createElement to avoid template literal quote issues
  const modalBox = document.createElement('div');
  modalBox.className = 'modal';
  modalBox.style.maxWidth = '520px';

  modalBox.innerHTML = [
    '<div class="modal-header">',
      '<h2 class="modal-title"><i class="fa-solid fa-truck"></i> ' + (isEdit ? 'Edit' : 'Add') + ' Supplier</h2>',
      '<button class="modal-close" id="sup-modal-close">×</button>',
    '</div>',
    '<div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow-y:auto">',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">',
        '<div style="grid-column:1/-1">',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Supplier Name *</label>',
          '<input id="sup-name" placeholder="e.g. BARAKAT"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div>',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Contact Person</label>',
          '<input id="sup-contact" placeholder="Name"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div>',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Phone</label>',
          '<input id="sup-phone" placeholder="+971 xx xxx xxxx"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div style="grid-column:1/-1">',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Order Email</label>',
          '<input id="sup-email" type="email" placeholder="orders@supplier.com"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div style="grid-column:1/-1">',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Address</label>',
          '<input id="sup-address" placeholder="Street, City, Country"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
      '</div>',
      '<div style="font-size:11px;color:var(--gold);font-weight:600;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06)">BANKING & PAYMENT</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">',
        '<div style="grid-column:1/-1">',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Bank & Account Details</label>',
          '<input id="sup-bank" placeholder="Bank name, IBAN / Account No."',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div>',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Payment Terms</label>',
          '<input id="sup-terms" placeholder="e.g. Net 30, COD"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div>',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Payment Due (days)</label>',
          '<input id="sup-due" placeholder="e.g. 30"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
        '<div style="grid-column:1/-1">',
          '<label style="font-size:11px;color:var(--smoke);display:block;margin-bottom:4px">Credit Limit</label>',
          '<input id="sup-credit" placeholder="e.g. AED 50,000"',
          ' style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">',
        '</div>',
      '</div>',
      '<div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">',
        '<button class="btn btn-ghost" id="sup-modal-cancel">Cancel</button>',
        '<button class="btn btn-gold" id="sup-modal-save">',
          '<i class="fa-solid fa-check"></i> ' + (isEdit ? 'Save Changes' : (fromIngredient ? 'Add & Return' : 'Add Supplier')),
        '</button>',
      '</div>',
    '</div>'
  ].join('');

  modal.appendChild(modalBox);
  document.body.appendChild(modal);

  // Populate values after DOM insertion
  const G = id => document.getElementById(id);
  if (s.name)         G('sup-name').value    = s.name;
  if (s.contact)      G('sup-contact').value = s.contact;
  if (s.phone)        G('sup-phone').value   = s.phone;
  if (s.email)        G('sup-email').value   = s.email;
  if (s.address)      G('sup-address').value = s.address;
  if (s.bank)         G('sup-bank').value    = s.bank;
  if (s.paymentTerms) G('sup-terms').value   = s.paymentTerms;
  if (s.paymentDue)   G('sup-due').value     = s.paymentDue;
  if (s.creditLimit)  G('sup-credit').value  = s.creditLimit;
  G('sup-name').focus();

  // Wire up buttons
  G('sup-modal-close').onclick  = () => modal.remove();
  G('sup-modal-cancel').onclick = () => modal.remove();
  G('sup-modal-save').onclick   = () => saveSupplierModal(idx, fromIngredient);
}

function saveSupplierModal(idx, returnToIngredient) {
  const G = id => document.getElementById(id);
  const name = G('sup-name')?.value?.trim();
  if (!name) { toast('Supplier name is required'); G('sup-name')?.focus(); return; }
  const sup = {
    name,
    contact:      G('sup-contact')?.value?.trim() || '',
    email:        G('sup-email')?.value?.trim()   || '',
    phone:        G('sup-phone')?.value?.trim()   || '',
    address:      G('sup-address')?.value?.trim() || '',
    bank:         G('sup-bank')?.value?.trim()    || '',
    paymentTerms: G('sup-terms')?.value?.trim()   || '',
    paymentDue:   G('sup-due')?.value?.trim()     || '',
    creditLimit:  G('sup-credit')?.value?.trim()  || '',
  };
  if (!state.suppliers) state.suppliers = [];
  if (idx != null) {
    state.suppliers[idx] = sup;
    toast('\u2713 ' + name + ' updated');
  } else {
    state.suppliers.push(sup);
    toast('\u2713 ' + name + ' added');
  }
  document.getElementById('supplier-modal')?.remove();
  save();
  renderSuppliersScreen();

  if (returnToIngredient && _returnAfterSupplier?.ingModalOpen) {
    const modal = document.getElementById('ing-modal');
    if (modal) {
      modal.classList.add('open');
      populateSupplierDropdown(name);
      const d = _returnAfterSupplier.data;
      if (d.desc) document.getElementById('ing-desc').value = d.desc;
      if (d.cat)  document.getElementById('ing-cat').value  = d.cat;
    }
    _returnAfterSupplier = null;
    toast('\u2713 ' + name + ' created — now select it as the supplier');
  }
}


function addSupplier() { showSupplierModal(null); }
function editSupplier(idx) { showSupplierModal(idx); }

function removeSupplier(idx) {
  const name = (state.suppliers||[])[idx]?.name||'supplier';
  if (!confirm(`Remove "${name}"?`)) return;
  (state.suppliers||[]).splice(idx,1); save(); renderSuppliersScreen();
  toast(`Removed ${name}`);
}

function importSuppliersFromMaster() {
  // Collect unique supplier names from master ingredient list
  const existing = new Set((state.suppliers||[]).map(s=>s.name.toLowerCase()));
  const masterNames = [...new Set(state.ingredients.map(i=>i.supplier).filter(Boolean))];
  const toAdd = masterNames.filter(n => !existing.has(n.toLowerCase()));
  if (!toAdd.length) { toast('All master list suppliers already in contacts'); return; }
  if (!state.suppliers) state.suppliers = [];
  toAdd.forEach(name => state.suppliers.push({
    name, contact:'', email:'', phone:'', address:'',
    bank:'', paymentTerms:'', paymentDue:'', creditLimit:''
  }));
  save(); renderSuppliersScreen();
  toast(`✓ ${toAdd.length} suppliers imported — add contact details`);
}

// ─── SUPPLIERS SCREEN ─────────────────────────────────
function renderSuppliersScreen() {
  const el = document.getElementById('suppliers-screen-list'); if (!el) return;
  const sups = state.suppliers||[];
  if (!sups.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--smoke)">
      <i class="fa-solid fa-truck" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block"></i>
      <div style="font-size:15px;margin-bottom:8px">No suppliers yet</div>
      <div style="font-size:13px;margin-bottom:20px">Import from your ingredient master list or add manually</div>
      <button class="btn btn-gold btn-sm" onclick="importSuppliersFromMaster()">
        <i class="fa-solid fa-file-import"></i> Import from Master List
      </button>
    </div>`;
    return;
  }
  // Group A-Z
  const sorted = [...sups].map((s,i)=>({...s,_idx:i})).sort((a,b)=>a.name.localeCompare(b.name));
  el.innerHTML = sorted.map(s => `
    <div style="background:var(--surface);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius);padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:16px;font-weight:700;color:var(--ice);margin-bottom:8px">
            <i class="fa-solid fa-truck" style="color:var(--gold);margin-right:8px;font-size:13px"></i>${escHtml(s.name)}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
            ${s.contact?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">CONTACT</span>${escHtml(s.contact)}</div>`:''}
            ${s.phone?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">PHONE</span><a href="tel:${escHtml(s.phone)}" style="color:var(--smoke)">${escHtml(s.phone)}</a></div>`:''}
            ${s.email?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">EMAIL</span><a href="mailto:${escHtml(s.email)}" style="color:var(--gold)">${escHtml(s.email)}</a></div>`:''}
            ${s.address?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">ADDRESS</span>${escHtml(s.address)}</div>`:''}
            ${s.bank?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">BANK</span>${escHtml(s.bank)}</div>`:''}
            ${s.paymentTerms?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">TERMS</span>${escHtml(s.paymentTerms)}</div>`:''}
            ${s.paymentDue?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">PAYMENT DUE</span>${escHtml(s.paymentDue)} days</div>`:''}
            ${s.creditLimit?`<div style="font-size:12px;color:var(--smoke)"><span style="color:var(--gold);font-size:10px;font-weight:600;display:block;margin-bottom:1px">CREDIT LIMIT</span>${escHtml(s.creditLimit)}</div>`:''}
          </div>
          ${!s.email && !s.phone && !s.contact?`<div style="font-size:11px;color:var(--danger);margin-top:6px"><i class="fa-solid fa-triangle-exclamation" style="margin-right:4px"></i>No contact details — add email to enable order emails</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="showSupplierModal(${s._idx})">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="removeSupplier(${s._idx})" title="Remove">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>`).join('');
}

// Populate the supplier dropdown in the ingredient modal
function populateSupplierDropdown(selectedName) {
  const sel = document.getElementById('ing-supplier'); if (!sel) return;
  const sups = state.suppliers||[];
  const prev = selectedName || sel.value;
  sel.innerHTML = '<option value="">— Select supplier —</option>';
  // Also collect supplier names from existing ingredients (in case not in contacts)
  const fromIngs = [...new Set(state.ingredients.map(i=>i.supplier).filter(Boolean))];
  const supNames = [...new Set([...sups.map(s=>s.name), ...fromIngs])].sort();
  supNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    if (name === prev) opt.selected = true;
    sel.appendChild(opt);
  });
  if (prev && !supNames.includes(prev)) {
    // Value from saved ingredient not in list — add it
    const opt = document.createElement('option');
    opt.value = prev; opt.textContent = prev; opt.selected = true;
    sel.appendChild(opt);
  }
}

// Called from ingredient modal when user clicks + next to supplier dropdown
let _returnAfterSupplier = null; // tracks where to return after creating supplier
function openAddSupplierFromIngredient() {
  // Save current ingredient modal state
  _returnAfterSupplier = {
    screen: 'ingredients',
    ingModalOpen: true,
    data: {
      id:       document.getElementById('ing-modal')?.dataset?.editId || null,
      supplier: document.getElementById('ing-supplier')?.value || '',
      desc:     document.getElementById('ing-desc')?.value || '',
      cat:      document.getElementById('ing-cat')?.value || '',
    }
  };
  // Close ingredient modal temporarily
  document.getElementById('ing-modal')?.classList.remove('active');
  // Open supplier modal with a callback flag
  showSupplierModal(null, /*fromIngredient=*/true);
}




// Send order email to each supplier via mailto
function emailOrderToSuppliers() {
  const order=(state.placedOrders||[])[0];
  if (!order) { toast('Place an order first'); return; }
  const sups=state.suppliers||[];
  const bySupplier={};
  order.items.forEach(item=>{
    const sup=item.supplier||'Unknown';
    if (!bySupplier[sup]) bySupplier[sup]=[];
    bySupplier[sup].push(item);
  });
  let count=0;
  const co=state.company||{};
  Object.entries(bySupplier).forEach(([supName,items])=>{
    const supInfo=sups.find(s=>s.name.toLowerCase()===supName.toLowerCase());
    const to=supInfo?.email||'';
    const subj=encodeURIComponent(`Purchase Order — ${co.name||state.barName||'Bar'} — ${order.date}`);
    const body=encodeURIComponent(
      `Dear ${supInfo?.contact||supName},\n\nPlease process the following order.\n\n`+
      `Date: ${order.date}\nReason: ${order.reasonLabel||'Routine Restock'}\n\n`+
      items.map(it=>`• ${it.desc}  (Code: ${it.tahweel||'—'})\n  Qty: ${it.qtyOrdered} unit(s)  ·  Unit: ${fmt(it.unitCost)}`).join('\n\n')+
      `\n\nBest regards,\n${state.invUsername||co.name||'Bar Team'}\n${co.phone||''}\n${co.email||''}`
    );
    window.open(`mailto:${to}?subject=${subj}&body=${body}`,'_blank');
    count++;
  });
  toast(`✓ ${count} email draft${count!==1?'s':''} opened — review and send`);
}

// ═══════════════════════════════════════════════════════
// INVENTORY — REMOVE FROM INVENTORY
// ═══════════════════════════════════════════════════════
function removeFromInventory(id) {
  const ing=state.ingredients.find(x=>x.id===id); if(!ing) return;
  if (!confirm(`Remove "${ing.desc}" from inventory?\n\nClears stock data. Ingredient stays in master list.`)) return;
  ing.inInventory=false;
  delete state.inventory[id];
  saveAndSync(); renderInventory(); renderIngredients();
  toast(`Removed from inventory`);
}

// ═══════════════════════════════════════════════════════
// N/A TOGGLE
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// AI ALTERNATIVE FINDER
// ═══════════════════════════════════════════════════════
async function findAlternativeAI(ingId, ingName) {
  if (!state.apiKey) { toast('Add Claude API key in Settings → Claude AI'); return; }
  toast(`🤖 Finding alternatives for ${ingName}...`);
  const affected=state.recipes.filter(r=>(r.lines||[]).some(l=>l.ingId===ingId));
  const recipeList=affected.slice(0,6).map(r=>r.name).join(', ');
  const promptText=`I'm a bartender. "${ingName}" is currently unavailable. It's used in: ${recipeList||'several cocktails'}. Suggest the best substitute(s) and briefly how to adjust each drink. Be specific and practical.`;
  try {
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':state.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:600,messages:[{role:'user',content:promptText}]})
    });
    const data=await resp.json();
    const text=data.content?.[0]?.text||'No response';
    showAIOverlay(`Alternative for ${ingName}`,text);
  } catch(e) { toast('AI request failed — check API key'); }
}
function showAIOverlay(title, text) {
  let overlay=document.getElementById('ai-result-overlay');
  if (!overlay) {
    overlay=document.createElement('div');
    overlay.id='ai-result-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
    document.body.appendChild(overlay);
  }
  overlay.innerHTML=`<div style="background:var(--surface);border-radius:var(--radius);border:1px solid rgba(201,168,76,0.3);padding:24px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:15px;font-weight:700;color:var(--gold)"><i class="fa-solid fa-wand-magic-sparkles"></i> ${escHtml(title)}</div>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="document.getElementById('ai-result-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div style="font-size:13px;line-height:1.7;color:var(--ice);white-space:pre-wrap">${escHtml(text)}</div>
  </div>`;
}

function renderSettings() {
  const _sc = document.getElementById('setting-currency'); if(_sc) _sc.value = state.currency;
  const _sak = document.getElementById('setting-api-key'); if(_sak) _sak.value = state.apiKey;
  const _stc = document.getElementById('setting-target-cost'); if(_stc) _stc.value = state.targetCostPct;
  const binEl  = document.getElementById('setting-binid');
  const keyEl  = document.getElementById('setting-binkey');
  if (binEl)  binEl.value  = state.jsonbinId  || '';
  if (keyEl)  keyEl.value  = state.jsonbinKey || '';
  loadCompanyProfile();
  renderUsersList();

  // density presets
  document.getElementById('density-presets-list').innerHTML =
    Object.entries(DENSITY_PRESETS).map(([name, val]) => `
      <div class="density-preset-row">
        <span class="density-preset-name">${name}</span>
        <div class="density-val-wrap">
          <span class="density-val">${val.toFixed(3)}</span>
          <span style="font-size:11px;color:var(--smoke)">g/ml</span>
        </div>
      </div>`).join('');

  // house pour dropdowns
  const ingOpts = state.ingredients.map(i =>
    `<option value="${i.id}">${escHtml(i.desc)}</option>`).join('');
  const fromEl = document.getElementById('pour-from');
  const toEl   = document.getElementById('pour-to');
  if (fromEl) fromEl.innerHTML = '<option value="">— Select ingredient to replace —</option>' + ingOpts;
  if (toEl)   toEl.innerHTML   = '<option value="">— Select replacement ingredient —</option>' + ingOpts;

  // wire preview
  const preview = () => {
    const fromId = document.getElementById('pour-from')?.value;
    const toId   = document.getElementById('pour-to')?.value;
    const fromIng = ingById(fromId);
    const toIng   = ingById(toId);
    const previewEl = document.getElementById('pour-preview');
    if (!previewEl) return;
    if (!fromId || !toId) { previewEl.textContent = ''; return; }
    if (fromId === toId) { previewEl.innerHTML = '<span style="color:var(--danger)">Cannot replace an ingredient with itself.</span>'; return; }
    const affected = state.recipes.filter(r => r.lines?.some(l=>l.ingId===fromId));
    previewEl.innerHTML = affected.length
      ? `<span style="color:var(--warning)">⚠ This will update <strong style="color:var(--ice)">${affected.length} recipe${affected.length>1?'s':''}</strong>: ${affected.map(r=>`<em>${escHtml(r.name)}</em>`).join(', ')}</span>`
      : `<span style="color:var(--smoke)">No recipes currently use <strong style="color:var(--ice)">${escHtml(fromIng?.desc||'')}</strong>.</span>`;
  };
  if (fromEl) fromEl.onchange = preview;
  if (toEl)   toEl.onchange   = preview;

  // pour history
  const histEl = document.getElementById('pour-history');
  if (histEl) {
    const hist = state.pourHistory || [];
    histEl.innerHTML = hist.length
      ? hist.slice(0,5).map(h =>
          `<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">
            <span style="color:var(--danger)">${escHtml(h.from)}</span>
            <i class="fa-solid fa-arrow-right" style="margin:0 6px;color:var(--smoke)"></i>
            <span style="color:var(--success)">${escHtml(h.to)}</span>
            <span style="color:var(--smoke);margin-left:8px">${h.date} · ${h.recipesAffected} recipe${h.recipesAffected!==1?'s':''}</span>
          </div>`).join('')
      : '<span style="color:var(--smoke);font-size:12px">No substitutions yet.</span>';
  }
}

function applyHousePour() {
  const fromId = document.getElementById('pour-from')?.value;
  const toId   = document.getElementById('pour-to')?.value;
  if (!fromId || !toId) { toast('Select both ingredients'); return; }
  if (fromId === toId)  { toast('Cannot replace with the same ingredient'); return; }

  const fromIng = ingById(fromId);
  const toIng   = ingById(toId);
  if (!fromIng || !toIng) { toast('Ingredient not found'); return; }

  const affected = state.recipes.filter(r => r.lines?.some(l=>l.ingId===fromId));
  if (!affected.length) {
    toast(`No recipes use "${fromIng.desc}" — nothing changed`);
    return;
  }

  if (!confirm(
    `Replace "${fromIng.desc}" with "${toIng.desc}" in ${affected.length} recipe${affected.length>1?'s':''}?\n\n` +
    `Affected: ${affected.map(r=>r.name).join(', ')}\n\nThis cannot be undone.`
  )) return;

  // Apply substitution
  let count = 0;
  state.recipes.forEach(recipe => {
    if (!recipe.lines) return;
    recipe.lines.forEach(line => {
      if (line.ingId === fromId) {
        line.ingId = toId;
        count++;
      }
    });
  });

  // Log to history
  if (!state.pourHistory) state.pourHistory = [];
  state.pourHistory.unshift({
    from: fromIng.desc,
    to: toIng.desc,
    date: new Date().toLocaleDateString('en-GB'),
    recipesAffected: affected.length,
    linesChanged: count,
  });

  save();
  renderSettings();
  renderRecipes();
  toast(`✓ Substitution complete — ${fromIng.desc} → ${toIng.desc} in ${affected.length} recipe${affected.length>1?'s':''} (${count} line${count>1?'s':''})`);
}

function saveSettings() {
  state.apiKey = document.getElementById('setting-api-key')?.value || '';
  state.targetCostPct = parseFloat(document.getElementById('setting-target-cost')?.value)||22;
  const _hbn2=document.getElementById('header-bar-name'); if(_hbn2) _hbn2.textContent=state.barName;
  save();
}

function exportData() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  downloadFile(URL.createObjectURL(blob), `barmanager-backup-${new Date().toISOString().slice(0,10)}.json`);
  toast('Backup exported');
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      Object.assign(state, data);
      save(); renderDashboard(); renderSettings();
      toast('Data imported successfully');
    } catch { toast('Invalid backup file'); }
  };
  reader.readAsText(file);
}

function resetData() {
  state.ingredients = [];
  state.inventory = {};
  state.recipes = {};
  save(); renderDashboard(); renderIngredients(); renderInventory(); renderRecipes();
  toast('All data reset');
}
