// BartenderPro — Stock in Hand
// Stock in Hand = current counted Inventory value + value of purchases already
// placed but not yet marked Received in the Received tab (pending/in-transit stock).
// ═══════════════════════════════════════════════════════

// Returns { [ingId]: { qty, value, orderUnit } } for every ingredient with an
// outstanding (not yet fully received) quantity across all placed orders.
function getPendingPurchases() {
  const map = {};
  (state.placedOrders||[]).forEach(order => {
    (order.items||[]).forEach(item => {
      if (item.status === 'received') return;
      const outstanding = Math.max(0, (item.qtyOrdered||0) - (item.receivedQty||0));
      if (outstanding <= 0) return;
      const orderUnit = item.orderUnit || 'btl';
      const unitPrice = orderUnit === 'btl' ? (item.unitCost||0) : (item.costPerGram||0);
      if (!map[item.ingId]) map[item.ingId] = { qty:0, value:0, orderUnit };
      map[item.ingId].qty   += outstanding;
      map[item.ingId].value += outstanding * unitPrice;
    });
  });
  return map;
}

function renderStockInHand() {
  if (!state.sihFilter) state.sihFilter = 'all';
  document.getElementById('sih-chips').innerHTML = INV_CATS.map(c =>
    `<div class="chip${state.sihFilter===c?' active':''}" onclick="state.sihFilter='${c}';renderStockInHand()">
      ${CAT_LABELS[c]||c}</div>`).join('');

  const pending = getPendingPurchases();

  // Totals reflect ALL ingredients regardless of the active filter/search.
  let invValueTotal = 0;
  state.ingredients.forEach(ing => { invValueTotal += calcTotalValue(ing, getInvEntry(ing.id)); });
  let pendingValueTotal = 0, pendingItemCount = 0;
  Object.values(pending).forEach(p => { pendingValueTotal += p.value; pendingItemCount++; });

  document.getElementById('sih-summary-bar').innerHTML = `
    <div class="order-summary-item"><div class="order-summary-label">Inventory Value</div><div class="order-summary-val" style="color:var(--gold)">${fmt(invValueTotal)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Pending Purchases</div><div class="order-summary-val" style="color:var(--info)">${fmt(pendingValueTotal)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Items On Order</div><div class="order-summary-val">${pendingItemCount}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Stock in Hand</div><div class="order-summary-val" style="color:var(--success);font-size:20px">${fmt(invValueTotal + pendingValueTotal)}</div></div>
  `;

  const q = (document.getElementById('sih-search')||{}).value?.toLowerCase()||'';
  const rows = state.ingredients.filter(ing => {
    const catMatch    = state.sihFilter==='all' || ing.cat===state.sihFilter;
    const relevant    = ing.inInventory || !!pending[ing.id];
    const searchMatch = !q || ing.desc.toLowerCase().includes(q);
    return catMatch && relevant && searchMatch;
  });

  const listEl = document.getElementById('sih-list');
  if (!rows.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:48px 24px;color:var(--smoke)">
      <i class="fa-solid fa-warehouse" style="font-size:32px;display:block;margin-bottom:12px;color:var(--surface2)"></i>
      <div style="font-size:15px;font-weight:600;color:var(--ice);margin-bottom:8px">No matching items</div>
      <div style="font-size:13px">Items marked "Inventory" (in Ingredients) or currently on order will appear here.</div>
    </div>`;
    return;
  }

  const groups = {};
  rows.forEach(ing => { (groups[ing.cat] = groups[ing.cat]||[]).push(ing); });

  let html = '';
  Object.entries(groups).forEach(([cat, items]) => {
    html += `<div class="inv-section-header">${CAT_LABELS[cat]||cat}</div>`;
    items.forEach(ing => {
      const entry    = getInvEntry(ing.id);
      const isAnyLiq = isAnyLiquidCat(ing.cat);
      const unitMl   = isAnyLiq ? ing.unitSize : 1;
      const invUnit  = getIngUnit(ing);
      const totalMl  = calcTotalMl(ing, entry);
      const invQty   = isAnyLiq ? (unitMl>0 ? totalMl/unitMl : 0) : totalMl;
      const invValue = calcTotalValue(ing, entry);

      const p         = pending[ing.id];
      const pendQty   = p ? p.qty   : 0;
      const pendValue = p ? p.value : 0;

      const sihQty   = invQty + pendQty;
      const sihValue = invValue + pendValue;

      const qtyDisp = qv => isAnyLiq ? `${fmtBtl(qv)} ${invUnit}` : `${qv.toFixed(qv<10?1:0)} ${invUnit}`;

      html += `<div class="inv-row">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="inv-name">${escHtml(ing.desc)}</span>
            ${categoryBadge(ing.cat)}
          </div>
          ${!ing.inInventory ? `<div style="font-size:10px;color:var(--info);margin-top:2px"><i class="fa-solid fa-truck"></i> On order only — not tracked in Inventory</div>` : ''}
        </div>
        <div class="inv-total-row" style="min-width:80px">
          <div style="font-size:9px;color:var(--smoke);text-transform:uppercase;letter-spacing:.04em">In Inventory</div>
          <div class="inv-total-btl" style="font-size:15px">${qtyDisp(invQty)}</div>
          <div class="inv-total-ml">${fmt(invValue)}</div>
        </div>
        <div class="inv-total-row" style="min-width:80px">
          <div style="font-size:9px;color:var(--smoke);text-transform:uppercase;letter-spacing:.04em">Pending</div>
          <div class="inv-total-btl" style="font-size:15px;color:${pendQty>0?'var(--info)':'var(--surface2)'}">${pendQty>0?qtyDisp(pendQty):'—'}</div>
          <div class="inv-total-ml">${pendQty>0?fmt(pendValue):''}</div>
        </div>
        <div class="inv-total-row" style="min-width:90px">
          <div style="font-size:9px;color:var(--smoke);text-transform:uppercase;letter-spacing:.04em">Stock in Hand</div>
          <div class="inv-total-btl" style="font-size:18px">${qtyDisp(sihQty)}</div>
          <div class="inv-total-ml" style="color:var(--gold);font-weight:600">${fmt(sihValue)}</div>
        </div>
      </div>`;
    });
  });
  listEl.innerHTML = html;
}
