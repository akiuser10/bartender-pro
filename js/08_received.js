// BartenderPro — Goods received & receiving flow
// Lines 1775–2251 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// RECEIVED
// ═══════════════════════════════════════════════════════
const ORDER_STATUSES = [
  { val:'ordered',  label:'Ordered',      cls:'s-ordered'  },
  { val:'on-way',   label:'On the way',   cls:'s-onway'    },
  { val:'delay',    label:'Delay',        cls:'s-delay'    },
  { val:'out',      label:'Out of stock', cls:'s-out'      },
  { val:'delisted', label:'Delisted',     cls:'s-delisted' },
  { val:'partial',  label:'Partial recv', cls:'s-partial'  },
  { val:'received', label:'Received ✓',   cls:'s-received' },
];

function updateRecvBadge() {
  if (!state.placedOrders?.length) { document.getElementById('recv-badge').style.display='none'; return; }
  const latest = state.placedOrders[0];
  const pending = latest.items.filter(i=>i.status!=='received').length;
  const b = document.getElementById('recv-badge');
  b.textContent = pending; b.style.display = pending>0?'inline-block':'none';
}

function renderReceived() {
  // set today's date default
  const dateEl = document.getElementById('recv-date');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0,10);
  const recvUser = document.getElementById('recv-username');
  if (recvUser && state.recvUsername) recvUser.value = state.recvUsername;

  if (!state.placedOrders?.length) {
    document.getElementById('recv-summary-bar').innerHTML = '';
    document.getElementById('recv-tbody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--smoke)">
        No orders placed yet. Go to <strong style="color:var(--gold)">Order List</strong> to place an order first.
      </td></tr>`;
    return;
  }

  const order = state.placedOrders[0]; // most recent order
  const items  = order.items || [];
  const received = items.filter(i=>i.status==='received').length;
  const partial  = items.filter(i=>i.status==='partial').length;
  const pending  = items.filter(i=>!['received','partial'].includes(i.status)).length;
  const needFollowup = items.filter(i=>['delay','out','delisted'].includes(i.status)).length;
  const totalOrdered  = items.reduce((s,i)=>s+i.qtyOrdered,0);
  const totalReceived = items.reduce((s,i)=>s+(i.receivedQty||0),0);

  document.getElementById('recv-summary-bar').innerHTML = `
    <div class="order-summary-item"><div class="order-summary-label">Order date</div><div class="order-summary-val" style="font-size:14px">${order.date}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Placed by</div><div class="order-summary-val" style="font-size:14px;color:var(--smoke)">${escHtml(order.placedBy)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Received</div><div class="order-summary-val" style="color:var(--success)">${received}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Partial</div><div class="order-summary-val" style="color:var(--warning)">${partial}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Pending</div><div class="order-summary-val" style="color:var(--danger)">${pending}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Follow up</div><div class="order-summary-val" style="color:var(--danger)">${needFollowup}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Qty ordered / recvd</div><div class="order-summary-val" style="font-size:14px">${totalOrdered} / ${totalReceived} btl</div></div>
  `;

  const statusOpts = ORDER_STATUSES.map(s=>`<option value="${s.val}">${s.label}</option>`).join('');

  document.getElementById('recv-tbody').innerHTML = items.map((item,idx) => {
    const diff = (item.receivedQty||0) - item.qtyOrdered;
    const diffCls = diff === 0 ? 'recv-match' : diff < 0 ? 'recv-short' : 'recv-match';
    const diffText = diff === 0 ? `✓ ${item.receivedQty||0}` : diff < 0 ? `${diff} short` : `+${diff}`;
    const needsFollowup = ['delay','out','delisted'].includes(item.status);
    const statusInfo = ORDER_STATUSES.find(s=>s.val===item.status) || ORDER_STATUSES[0];
    const opts = ORDER_STATUSES.map(s=>`<option value="${s.val}"${item.status===s.val?' selected':''}>${s.label}</option>`).join('');
    return `<tr style="${needsFollowup?'background:rgba(224,82,82,0.04)':''}">
      <td>
        <div class="td-name">${escHtml(item.desc)}</div>
        <div style="font-size:11px;color:var(--smoke)">${escHtml(item.tahweel||'')} · ${escHtml(item.supplier||'')}</div>
      </td>
      <td style="font-size:12px;color:var(--smoke)">${escHtml(item.supplier||'—')}</td>
      <td style="font-variant-numeric:tabular-nums;font-weight:600;color:var(--ice)">${item.qtyOrdered} ${item.orderUnit||'btl'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <input class="order-input" type="number" min="0" step="1"
            value="${item.receivedQty||''}" placeholder="0"
            oninput="updateReceivedQty(${idx},this.value)">
          <span style="font-size:11px;color:var(--smoke)">btl</span>
        </div>
      </td>
      <td><span class="${diffCls}">${diffText}</span></td>
      <td>
        <select class="status-select" onchange="updateItemStatus(${idx},this.value)">
          ${opts}
        </select>
        ${needsFollowup ? '<div style="font-size:10px;color:var(--danger);margin-top:3px;font-weight:600">⚠ FOLLOW UP</div>':
          item.status==='received'?'<div style="font-size:10px;color:var(--success);margin-top:3px">✓ Complete</div>':''}
      </td>
      <td>
        <input type="text" value="${escHtml(item.notes||'')}" placeholder="Add note…"
          style="background:var(--surface2);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:5px 8px;font-size:12px;color:var(--ice);font-family:'Inter',sans-serif;outline:none;width:100%;min-width:120px"
          onchange="updateItemNote(${idx},this.value)">
      </td>
    </tr>`;
  }).join('');
  updateRecvBadge();
}

function updateReceivedQty(idx, val) {
  if (!state.placedOrders?.[0]) return;
  const item = state.placedOrders[0].items[idx];
  item.receivedQty = parseFloat(val)||0;
  // auto-set status
  if (item.receivedQty === item.qtyOrdered) item.status = 'received';
  else if (item.receivedQty > 0 && item.receivedQty < item.qtyOrdered) item.status = 'partial';
  save(); renderReceived();
}

function updateItemStatus(idx, val) {
  if (!state.placedOrders?.[0]) return;
  state.placedOrders[0].items[idx].status = val;
  const recvUser = (document.getElementById('recv-username')||{}).value?.trim()||'';
  if (recvUser) {
    state.placedOrders[0].items[idx].receivedBy = recvUser;
    state.recvUsername = recvUser;
  }
  save(); renderReceived();
}

function updateItemNote(idx, val) {
  if (!state.placedOrders?.[0]) return;
  state.placedOrders[0].items[idx].notes = val;
  save();
}

function saveReceived() {
  const recvUser = (document.getElementById('recv-username')||{}).value?.trim()||'';
  if (recvUser) state.recvUsername = recvUser;
  const now = new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});

  // Add received quantities to inventory
  let addedCount = 0;
  if (state.placedOrders?.[0]) {
    state.placedOrders[0].items.forEach(item => {
      const qty = item.receivedQty||0;
      if (qty <= 0) return;
      if (!state.inventory[item.ingId] || typeof state.inventory[item.ingId] !== 'object') {
        state.inventory[item.ingId] = { sealedBtls:0, openBtls:1, openGrams:0, measuredBy:'', measuredAt:'' };
      }
      state.inventory[item.ingId].sealedBtls = (state.inventory[item.ingId].sealedBtls||0) + qty;
      state.inventory[item.ingId].measuredBy = recvUser || 'Delivery';
      state.inventory[item.ingId].measuredAt = now;
      if (item.status !== 'received' && item.status !== 'partial') item.status = 'received';
      addedCount++;
    });
  }
  save(); renderDashboard(); renderReceived(); renderInventory(); updateOrderBadge(); updateRecvBadge();
  toast(`✓ Saved${recvUser?' by '+recvUser:''} — ${addedCount} item${addedCount!==1?'s':''} added to inventory`);
}

function exportReceived() {
  if (!state.placedOrders?.[0]) { toast('No order data'); return; }
  const order = state.placedOrders[0];
  const rows = [['Item','Supplier','Supplier Code','Qty Ordered','Qty Received','Difference','Status','Notes']];
  order.items.forEach(i => {
    const diff = (i.receivedQty||0) - i.qtyOrdered;
    rows.push([i.desc,i.supplier||'',i.tahweel||'',i.qtyOrdered,i.receivedQty||0,diff,i.status,i.notes||'']);
  });
  const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  downloadFile(URL.createObjectURL(blob), `received-${new Date().toISOString().slice(0,10)}.csv`);
  toast('Received list exported');
}

// ═══════════════════════════════════════════════════════
const REC_CATS = ['all','signature','classic','mocktail','coffee','beer'];
const REC_CAT_LABELS = {
  all:'All', signature:'★ Signature', classic:'Classic Cocktail',
  mocktail:'Mocktail', coffee:'Coffee & Tea', beer:'Beer & Wine'
};

function recipeCost(recipe) {
  return (recipe.lines||[]).reduce((s, line) => {
    const ing = allIngredients().find(x=>x.id===line.ingId);
    if (!ing) return s;
    if (line.unit === 'ml') return s + line.qty * (ing.costPerGram / (ing.density||1));
    return s + line.qty * ing.costPerGram;
  }, 0);
}
function recipeCostPct(recipe) {
  const cost = recipeCost(recipe);
  // Use preTaxPrice if stored, otherwise back-calculate from price+taxes
  const preTax = recipe.preTaxPrice || (() => {
    const totalTaxPct = (recipe.vat||0)+(recipe.otherTax||0)+(recipe.service||0);
    const divisor = 1 + totalTaxPct/100;
    return divisor > 0 ? (recipe.price||0) / divisor : (recipe.price||0);
  })();
  return preTax > 0 ? cost / preTax : 0;
}

function renderRecipes() {
  document.getElementById('rec-chips').innerHTML = REC_CATS.map(c =>
    `<div class="chip${state.recFilter===c?' active':''}" onclick="state.recFilter='${c}';renderRecipes()">
      ${REC_CAT_LABELS[c]||c}</div>`
  ).join('');

  const q = (document.getElementById('rec-search')||{}).value?.toLowerCase()||'';
  const recs = state.recipes.filter(r => {
    const typeMatch = state.recFilter === 'all'
      || r.type === state.recFilter
      // legacy 'cocktail' type counts under both signature and classic filters
      || (state.recFilter === 'classic'   && r.type === 'cocktail')
      || (state.recFilter === 'signature' && r.type === 'cocktail');
    return typeMatch && r.name.toLowerCase().includes(q);
  });

  if (!recs.length) {
    document.getElementById('recipe-grid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--smoke)">
        No recipes yet. Click "+ New Recipe" to add one, or use the AI Creator.
      </div>`;
    return;
  }

  document.getElementById('recipe-grid').innerHTML = recs.map(r => {
    const cost = recipeCost(r);
    const cp = recipeCostPct(r);
    const cls = costClass(cp);
    const totalTaxPct = (r.vat||0) + (r.otherTax||0) + (r.service||0);
    const hasTax = totalTaxPct > 0;
    // r.price is inclusive — back-calculate net
    const divisor = 1 + totalTaxPct/100;
    const preTax = hasTax && divisor > 0 ? r.price / divisor : r.price;
    const ingPreview = (r.lines||[]).slice(0,4).map(l => {
      const ing = hmIngById(l.ingId);
      return ing ? `<span class="ing-chip">${escHtml(ing.desc.split(' ')[0])}</span>` : '';
    }).join('');
    return `<div class="recipe-card" onclick="openRecipeDetail('${r.id}')">
      <div class="recipe-card-name">${escHtml(r.name)}</div>
      <div class="recipe-card-type">${typeBadge(r.type)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="cost-pct ${cls}"><i class="fa-solid fa-chart-pie"></i> ${pct(cp)}</div>
        <div>
          <div class="recipe-price" style="text-align:right;font-size:15px;font-weight:700;color:var(--gold)">${fmt(r.price)}</div>
          ${hasTax ? `<div style="font-size:10px;color:var(--smoke);text-align:right">net: ${fmt(preTax)}</div>` : ''}
        </div>
      </div>
      <div style="font-size:11px;color:var(--smoke)">Cost: ${fmt(cost)} · GP: ${fmt(preTax - cost)}${hasTax?` · Tax: ${totalTaxPct}%`:''}</div>
      <div class="recipe-ings">${ingPreview}</div>
    </div>`;
  }).join('');
}

function openRecipeDetail(id) {
  const r = state.recipes.find(x=>x.id===id);
  if (!r) return;
  state.currentRecipeId = id;
  const cost = recipeCost(r);
  const cp = recipeCostPct(r);
  const _dn=document.getElementById('detail-name'); if(_dn) _dn.textContent=r.name;
  const _dtb=document.getElementById('detail-type-badge'); if(_dtb) _dtb.innerHTML=typeBadge(r.type);
  const _dkpis=document.getElementById('detail-kpis'); if(_dkpis) _dkpis.innerHTML = (() => {
    // r.price is the INCLUSIVE price (what guest pays)
    // Back-calculate net and individual tax amounts
    const totalTaxPct = (r.vat||0) + (r.otherTax||0) + (r.service||0);
    const hasTax  = totalTaxPct > 0;
    const divisor = 1 + totalTaxPct / 100;
    const preTax  = hasTax && divisor > 0 ? r.price / divisor : r.price;
    const vatAmt   = preTax * (r.vat||0)      / 100;
    const otherAmt = preTax * (r.otherTax||0) / 100;
    const svcAmt   = preTax * (r.service||0)  / 100;
    const totalTax = r.price - preTax;
    const taxDetail = [
      r.vat      ? `VAT ${r.vat}%: ${fmt(vatAmt)}`              : '',
      r.otherTax ? `Other Tax ${r.otherTax}%: ${fmt(otherAmt)}` : '',
      r.service  ? `Svc Chg ${r.service}%: ${fmt(svcAmt)}`      : '',
    ].filter(Boolean).join(' · ');
    return `
    <div class="detail-box"><div class="detail-box-label">Selling Price (incl. tax)</div><div class="detail-box-val" style="color:var(--gold);font-size:18px">${fmt(r.price)}</div></div>
    <div class="detail-box"><div class="detail-box-label">Net Price (ex-tax)</div><div class="detail-box-val" style="color:var(--smoke)">${hasTax?fmt(preTax):'—'}</div>${hasTax?`<div style="font-size:10px;color:var(--smoke);margin-top:2px">${taxDetail}</div>`:''}</div>
    <div class="detail-box"><div class="detail-box-label">Recipe Cost</div><div class="detail-box-val">${fmt(cost)}</div></div>
    <div class="detail-box"><div class="detail-box-label">Cost %</div><div class="detail-box-val" style="color:var(--${costClass(cp)==='good'?'success':costClass(cp)==='ok'?'warning':'danger'})">${pct(cp)}</div></div>
    <div class="detail-box"><div class="detail-box-label">Gross Profit</div><div class="detail-box-val" style="color:var(--success)">${fmt(preTax-cost)}</div></div>
    ${hasTax?`<div class="detail-box"><div class="detail-box-label">Total Tax</div><div class="detail-box-val" style="color:var(--smoke)">${fmt(totalTax)} <span style="font-size:11px">(${totalTaxPct.toFixed(1)}%)</span></div></div>`:''}
    `;
  })();
  const _dings=document.getElementById('detail-ings'); if(_dings) _dings.innerHTML = (r.lines||[]).map(line => {
    const ing = hmIngById(line.ingId);
    const lc = ing ? (line.unit==='ml' ? line.qty*(ing.costPerGram/(ing.density||1)) : line.qty*ing.costPerGram) : 0;
    return `<tr>
      <td class="td-name">${ing ? escHtml(ing.desc) : '<span style="color:var(--danger)">Missing ingredient</span>'}</td>
      <td style="font-variant-numeric:tabular-nums">${line.qty}</td>
      <td>${line.unit}</td>
      <td style="font-variant-numeric:tabular-nums">${fmt(lc)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" style="color:var(--smoke);padding:16px">No ingredients added</td></tr>';

  const boxes = [];
  if (r.method) boxes.push(`<div class="detail-box"><div class="detail-box-label">Method</div><div style="font-size:13px;color:var(--ice-dim);margin-top:4px">${escHtml(r.method)}</div></div>`);
  if (r.glass) boxes.push(`<div class="detail-box"><div class="detail-box-label">Glass</div><div class="detail-box-val">${escHtml(r.glass)}</div></div>`);
  if (r.garnish) boxes.push(`<div class="detail-box"><div class="detail-box-label">Garnish</div><div class="detail-box-val">${escHtml(r.garnish)}</div></div>`);
  if (r.ice) boxes.push(`<div class="detail-box"><div class="detail-box-label">Ice</div><div class="detail-box-val">${escHtml(r.ice)}</div></div>`);
  const _dmg=document.getElementById('detail-method-grid'); if(_dmg) _dmg.innerHTML=boxes.join('');

  document.getElementById('recipe-list-view').style.display = 'none';
  document.getElementById('recipe-detail-view').classList.add('open');
}

function closeRecipeDetail() {
  document.getElementById('recipe-list-view').style.display = '';
  document.getElementById('recipe-detail-view').classList.remove('open');
}
function editCurrentRecipe() {
  // Don't close detail — modal opens on top, after save detail re-renders with fresh data
  openRecipeModal(state.currentRecipeId);
}
function deleteCurrentRecipe() {
  if (!confirm('Delete this recipe?')) return;
  state.recipes = state.recipes.filter(x=>x.id!==state.currentRecipeId);
  saveAndSync(); closeRecipeDetail(); renderRecipes(); toast('Recipe deleted — syncing…');
}

// ── Recipe Modal ─────────────────────────────────────────
let ingRows = [];

function openRecipeModal(recipeId=null) {
  state.editRecId = recipeId;
  const r = recipeId ? state.recipes.find(x=>x.id===recipeId) : null;
  const _rmt=document.getElementById('rec-modal-title'); if(_rmt) _rmt.textContent=recipeId?'Edit Recipe':'New Recipe';
  const _rsv = (elId, v) => { const el=document.getElementById(elId); if(el) el.value=v; };
  _rsv('rec-name',     r?.name||'');
  _rsv('rec-type',     r?.type||'classic');
  _rsv('rec-price',    r?.price||'');
  _rsv('rec-vat',      r?.vat      !== undefined ? r.vat      : (state.defaultVat     ?? ''));
  _rsv('rec-othertax', r?.otherTax !== undefined ? r.otherTax : (state.defaultOtherTax ?? ''));
  _rsv('rec-service',  r?.service  !== undefined ? r.service  : (state.defaultService  ?? ''));
  _rsv('rec-glass',    r?.glass||'');
  _rsv('rec-garnish',  r?.garnish||'');
  _rsv('rec-ice',      r?.ice||'');
  _rsv('rec-method',   r?.method||'');
  ingRows = r?.lines ? r.lines.map(l=>({...l})) : [];
  renderIngRows();
  updateRecipeCostPreview();
  document.getElementById('rec-modal').classList.add('open');
}
function closeRecipeModal() { document.getElementById('rec-modal').classList.remove('open'); }

function addIngRow(ingId='', qty='', unit='ml') {
  ingRows.push({ id: uid(), ingId, qty: parseFloat(qty)||0, unit });
  renderIngRows();
}

function renderIngRows() {
  const base = state.ingredients.map(i =>
    `<option value="${i.id}">${escHtml(i.desc)}</option>`).join('');
  const hm   = (state.homeMade||[]).map(h=>
    `<option value="${h.id}">[HM] ${escHtml(h.name)} (${h.hmId})</option>`).join('');
  const ingOptions = base + (hm ? `<optgroup label="— Home-Made —">${hm}</optgroup>` : '');
  document.getElementById('rec-ing-rows').innerHTML = ingRows.map((row,idx) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <select style="flex:2" onchange="ingRows[${idx}].ingId=this.value;updateRecipeCostPreview()">
        <option value="">— Select ingredient —</option>${ingOptions.replace(`value="${row.ingId}"`,`value="${row.ingId}" selected`)}
      </select>
      <input type="number" style="width:80px" placeholder="qty" value="${row.qty||''}" min="0" step="0.5"
        oninput="ingRows[${idx}].qty=parseFloat(this.value)||0;updateRecipeCostPreview()">
      <select style="width:72px" onchange="ingRows[${idx}].unit=this.value;updateRecipeCostPreview()">
        <option value="ml"${row.unit==='ml'?' selected':''}>ml</option>
        <option value="g"${row.unit==='g'?' selected':''}>g</option>
        <option value="nos"${row.unit==='nos'?' selected':''}>nos</option>
        <option value="dash"${row.unit==='dash'?' selected':''}>dash</option>
        <option value="drop"${row.unit==='drop'?' selected':''}>drop</option>
      </select>
      <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="ingRows.splice(${idx},1);renderIngRows()"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
  updateRecipeCostPreview();
}

function updateRecipeCostPreview() {
  const inclPrice = parseFloat(document.getElementById('rec-price')?.value)||0;
  const vatPct    = parseFloat(document.getElementById('rec-vat')?.value)||0;
  const otherPct  = parseFloat(document.getElementById('rec-othertax')?.value)||0;
  const svcPct    = parseFloat(document.getElementById('rec-service')?.value)||0;

  const cost = ingRows.reduce((s,line) => {
    const ing = hmIngById(line.ingId);
    if (!ing || !line.qty) return s;
    return s + (line.unit==='ml' ? line.qty*(ing.costPerGram/(ing.density||1)) : line.qty*ing.costPerGram);
  }, 0);

  // Price entered is INCLUSIVE of all taxes.
  // Back-calculate the pre-tax (net) price and individual tax amounts.
  const totalTaxPct = vatPct + otherPct + svcPct;
  const divisor  = 1 + totalTaxPct / 100;
  const preTax   = inclPrice > 0 && divisor > 0 ? inclPrice / divisor : inclPrice;
  const totalTax = inclPrice - preTax;
  const vatAmt   = preTax * vatPct   / 100;
  const otherAmt = preTax * otherPct / 100;
  const svcAmt   = preTax * svcPct   / 100;

  // Cost % is against the pre-tax (net) selling price — what the business keeps
  const cp  = preTax > 0 ? cost / preTax : 0;
  const cls = costClass(cp);

  const _rcv = document.getElementById('rec-cost-val');   if(_rcv) _rcv.textContent = fmt(cost);

  // Tax breakdown lines
  const taxLines = [];
  if (vatPct   > 0) taxLines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--smoke)">VAT (${vatPct}%)</span><span style="color:var(--smoke)">${fmt(vatAmt)}</span></div>`);
  if (otherPct > 0) taxLines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--smoke)">Other Tax (${otherPct}%)</span><span style="color:var(--smoke)">${fmt(otherAmt)}</span></div>`);
  if (svcPct   > 0) taxLines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--smoke)">Service Charge (${svcPct}%)</span><span style="color:var(--smoke)">${fmt(svcAmt)}</span></div>`);
  if (totalTaxPct > 0) taxLines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06)"><span style="color:var(--smoke)">Total tax extracted</span><span style="color:var(--smoke)">${fmt(totalTax)}</span></div>`);
  const _rtl = document.getElementById('rec-tax-lines');  if(_rtl) _rtl.innerHTML = taxLines.join('');

  const _rpv = document.getElementById('rec-pretax-val'); if(_rpv) _rpv.textContent = inclPrice > 0 ? fmt(preTax) : '—';
  const _rtv = document.getElementById('rec-total-val');  if(_rtv) _rtv.textContent = inclPrice > 0 ? fmt(inclPrice) : '—';

  const pctEl = document.getElementById('rec-pct-val');
  if (pctEl) {
    pctEl.textContent = preTax > 0 ? pct(cp) : '—';
    pctEl.style.color = cls==='good'?'var(--success)':cls==='ok'?'var(--warning)':'var(--danger)';
  }

  const _rgv = document.getElementById('rec-gp-val'); if(_rgv) _rgv.textContent = preTax > 0 ? fmt(preTax - cost) : '—';
}

function saveRecipe() {
  const name = document.getElementById('rec-name')?.value?.trim();
  if (!name) { toast('Please enter a recipe name'); return; }
  const inclPrice = parseFloat(document.getElementById('rec-price')?.value)||0;
  const vat       = parseFloat(document.getElementById('rec-vat')?.value)||0;
  const otherTax  = parseFloat(document.getElementById('rec-othertax')?.value)||0;
  const service   = parseFloat(document.getElementById('rec-service')?.value)||0;
  const totalTaxPct = vat + otherTax + service;
  // Price entered is INCLUSIVE of all taxes — back-calculate pre-tax price
  const divisor  = 1 + totalTaxPct / 100;
  const preTax   = divisor > 0 ? inclPrice / divisor : inclPrice;

  const recipe = {
    id: state.editRecId || uid(),
    name,
    type:         document.getElementById('rec-type')?.value || 'classic',
    price:        inclPrice,        // stored as the inclusive price (what guest pays)
    preTaxPrice:  Math.round(preTax * 100) / 100,  // net price after extracting taxes
    vat, otherTax, service,
    priceInclTax: inclPrice,        // same field used elsewhere
    glass:        document.getElementById('rec-glass')?.value?.trim()   || '',
    garnish:      document.getElementById('rec-garnish')?.value?.trim() || '',
    ice:          document.getElementById('rec-ice')?.value?.trim()     || '',
    method:       document.getElementById('rec-method')?.value?.trim()  || '',
    lines:        ingRows.filter(r=>r.ingId&&r.qty>0),
  };

  const isEdit = !!state.editRecId;
  const savedId = recipe.id;

  if (isEdit) {
    const idx = state.recipes.findIndex(x=>x.id===state.editRecId);
    if (idx >= 0) state.recipes[idx] = recipe;
  } else {
    if (!state.recipes) state.recipes = [];
    state.recipes.push(recipe);
  }

  // 1. Close modal immediately
  const modal = document.getElementById('rec-modal');
  if (modal) modal.classList.remove('open');
  state.editRecId = null;

  // 2. Ensure list view is visible (in case detail was showing)
  const listView   = document.getElementById('recipe-list-view');
  const detailView = document.getElementById('recipe-detail-view');
  if (listView)   listView.style.display = '';
  if (detailView) detailView.classList.remove('open');

  // 3. Save & re-render list with updated data
  save();
  renderRecipes();

  // 4. If editing existing recipe, re-open detail view with fresh data
  if (isEdit) {
    openRecipeDetail(savedId);
    toast('Recipe updated ✓');
  } else {
    toast('Recipe saved ✓');
  }
}
