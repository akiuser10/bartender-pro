// BartenderPro — Wastage log
// Lines 3339–3492 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// WASTAGE
// state.wastageLog = [ { id, date, time, ingId, qty, unit, reason, cost, loggedBy, notes } ]
// ═══════════════════════════════════════════════════════
const WASTE_REASONS = {
  spillage:'Spillage', breakage:'Breakage', expired:'Expired',
  overpour:'Over-pour', trial:'Trial/Testing', comp:'Complimentary', other:'Other'
};

function updateWasteUnit() {
  const ingId = document.getElementById('waste-ing').value;
  const ing = ingById(ingId);
  if (!ing) { document.getElementById('waste-cost-preview').textContent = ''; return; }
  // suggest unit
  const unitEl = document.getElementById('waste-unit');
  if (isAnyLiquidCat(ing.cat)) unitEl.value = 'ml';
  else unitEl.value = 'g';
}

function updateWasteCostPreview() {
  const ingId = document.getElementById('waste-ing').value;
  const qty   = parseFloat(document.getElementById('waste-qty').value) || 0;
  const unit  = document.getElementById('waste-unit').value;
  const ing   = ingById(ingId);
  if (!ing || !qty) { document.getElementById('waste-cost-preview').textContent = ''; return; }
  let cost = 0;
  if (unit === 'btl') cost = ing.cost;
  else if (unit === 'ml') cost = qty * (ing.costPerGram / (ing.density||1));
  else cost = qty * ing.costPerGram;
  const _wcp=document.getElementById('waste-cost-preview'); if(_wcp) _wcp.innerHTML =
    `<span style="color:var(--danger)">Cost lost: <strong>${fmt(cost)}</strong></span>`;
}

// wire live preview
document.addEventListener('input', e => {
  if (['waste-qty','waste-unit','waste-ing'].includes(e.target.id)) updateWasteCostPreview();
});

function logWastage() {
  const ingId  = document.getElementById('waste-ing').value;
  const qty    = parseFloat(document.getElementById('waste-qty').value) || 0;
  const unit   = document.getElementById('waste-unit').value;
  const reason = document.getElementById('waste-reason').value;
  const user   = document.getElementById('waste-user').value.trim();
  const notes  = document.getElementById('waste-notes').value.trim();
  const ing    = ingById(ingId);
  if (!ing) { toast('Select an ingredient'); return; }
  if (!qty)  { toast('Enter a quantity');    return; }

  let cost = 0;
  let qtyMl = 0, qtyG = 0;
  if (unit === 'btl') {
    cost = ing.cost;
    qtyMl = isAnyLiquidCat(ing.cat) ? ing.unitSize : 0;
    qtyG  = ing.unitSize * (ing.density||1);
  } else if (unit === 'ml') {
    cost = qty * (ing.costPerGram / (ing.density||1));
    qtyMl = qty; qtyG = qty * (ing.density||1);
  } else {
    cost = qty * ing.costPerGram;
    qtyG = qty;
  }

  const entry = {
    id: uid(),
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
    ingId, ingName: ing.desc, qty, unit, reason, cost, loggedBy: user, notes
  };

  if (!state.wastageLog) state.wastageLog = [];
  state.wastageLog.unshift(entry);

  // Deduct from inventory
  const inv = state.inventory[ingId];
  if (inv && typeof inv === 'object') {
    if (isAnyLiquidCat(ing.cat)) {
      // deduct from open grams first
      const deductG = qtyG;
      const openG = inv.openGrams || 0;
      if (deductG <= openG) {
        state.inventory[ingId].openGrams = Math.max(0, openG - deductG);
      } else {
        const remainder = deductG - openG;
        state.inventory[ingId].openGrams = 0;
        const btlsToDeduct = Math.ceil(remainder / (ing.unitSize * (ing.density||1)));
        state.inventory[ingId].sealedBtls = Math.max(0, (inv.sealedBtls||0) - btlsToDeduct);
      }
    } else {
      state.inventory[ingId].openGrams = Math.max(0, (inv.openGrams||0) - qtyG);
    }
  }

  save();
  renderWastage();
  renderDashboard();

  // clear form
  const _wq=document.getElementById('waste-qty'); if(_wq) _wq.value='';
  const _wn=document.getElementById('waste-notes'); if(_wn) _wn.value='';
  const _wcp2=document.getElementById('waste-cost-preview'); if(_wcp2) _wcp2.textContent='';
  toast(`Wastage logged — ${fmt(cost)} cost deducted`);
}

function deleteWastage(id) {
  if (!confirm('Remove this wastage entry?')) return;
  state.wastageLog = (state.wastageLog||[]).filter(w=>w.id!==id);
  saveAndSync(); renderWastage(); toast('Entry removed — syncing…');
}

function renderWastage() {
  // populate ingredient dropdown
  const ingEl = document.getElementById('waste-ing');
  if (ingEl) {
    ingEl.innerHTML = '<option value="">— Select ingredient —</option>' +
      state.ingredients.map(i=>`<option value="${i.id}">${escHtml(i.desc)}</option>`).join('');
  }

  const log = state.wastageLog || [];

  // summary
  const today = new Date().toLocaleDateString('en-GB');
  const todayLoss = log.filter(w=>w.date===today).reduce((s,w)=>s+w.cost,0);
  const monthLoss = log.reduce((s,w)=>s+w.cost,0);
  const byReason  = {};
  log.forEach(w=>{ byReason[w.reason]=(byReason[w.reason]||0)+w.cost; });
  const topReason = Object.entries(byReason).sort((a,b)=>b[1]-a[1])[0];

  const summaryEl = document.getElementById('waste-summary-bar');
  if (summaryEl) summaryEl.innerHTML = `
    <div class="order-summary-item"><div class="order-summary-label">Today's Loss</div><div class="order-summary-val" style="color:var(--danger)">${fmt(todayLoss)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Total Logged</div><div class="order-summary-val">${fmt(monthLoss)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Entries</div><div class="order-summary-val">${log.length}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Top Reason</div><div class="order-summary-val" style="font-size:13px;color:var(--warning)">${topReason?WASTE_REASONS[topReason[0]]||topReason[0]:'—'}</div></div>
  `;

  const tbody = document.getElementById('waste-tbody');
  if (!tbody) return;
  if (!log.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--smoke)">No wastage entries yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = log.map(w => `<tr>
    <td style="font-size:12px;color:var(--smoke);white-space:nowrap">${w.date}<br>${w.time}</td>
    <td class="td-name">${escHtml(w.ingName||'')}</td>
    <td style="font-variant-numeric:tabular-nums;font-weight:600">${w.qty} ${w.unit}</td>
    <td><span class="badge badge-other">${WASTE_REASONS[w.reason]||w.reason}</span></td>
    <td style="color:var(--danger);font-weight:600;font-variant-numeric:tabular-nums">${fmt(w.cost)}</td>
    <td style="font-size:12px">${w.loggedBy?`<span class="user-tag"><i class="fa-solid fa-user"></i>${escHtml(w.loggedBy)}</span>`:''}</td>
    <td style="font-size:12px;color:var(--smoke)">${escHtml(w.notes||'')}</td>
    <td><button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteWastage('${w.id}')"><i class="fa-solid fa-trash"></i></button></td>
  </tr>`).join('');
}
