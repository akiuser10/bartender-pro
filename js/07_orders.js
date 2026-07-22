// BartenderPro — Order list, gap calc, place order
// Lines 1496–1774 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// ORDER LIST
// ═══════════════════════════════════════════════════════
// state.orders = { [ingId]: { qtyToOrder: 2, included: true } }
// state.placedOrders = [ { id, date, placedBy, items: [{ingId,qty,cost}] } ]

function getOrderItems() {
  return state.ingredients.filter(ing => {
    const entry    = getInvEntry(ing.id);
    const totalMl  = calcTotalMl(ing, entry);
    const isAnyLiq = isAnyLiquidCat(ing.cat);
    const unitMl   = isAnyLiq ? ing.unitSize : 1; // food par is already in grams
    const minMl    = (ing.minPar||0) * unitMl;
    const belowPar = (ing.minPar||0) > 0 && totalMl < minMl;
    // Out-of-stock/manually-flagged items need ordering too, even with no par level
    // configured — same criteria the Dashboard's "Not Available Items" list uses.
    const outOfStock = ing.inInventory && (totalMl <= 0 || ing.notAvailable);
    return belowPar || outOfStock;
  }).map(ing => {
    const entry    = getInvEntry(ing.id);
    const isAnyLiq = isAnyLiquidCat(ing.cat);
    const unitMl   = isAnyLiq ? ing.unitSize : 1; // food: par in grams, unitMl=1
    const totalMl  = calcTotalMl(ing, entry);
    const minMl    = (ing.minPar||0) * unitMl;  // liquid: btl×ml; food: grams
    const maxMl    = (ing.maxPar||0) * unitMl;
    const gapMl    = Math.max(0, maxMl - totalMl);
    const orderUnit = getIngUnit(ing); // 'btl', 'keg', 'g', or 'nos'
    // How many units to order:
    // liquid → ceil(gap ml / ml-per-unit) = number of bottles/kegs
    // food   → gap is already in grams; order in grams
    let btlsNeeded = isAnyLiq
      ? (unitMl > 0 ? Math.ceil(gapMl / unitMl) : 0)
      : Math.round(gapMl); // grams
    // No par level configured (maxPar 0) means the gap calc above comes out to 0 —
    // still suggest at least 1 unit for an out-of-stock item so it's actually
    // orderable by default instead of silently sitting at a 0 quantity.
    if (btlsNeeded <= 0 && totalMl <= 0) btlsNeeded = 1;
    const saved = state.orders?.[ing.id];
    return {
      ing, totalMl, minMl, maxMl, gapMl, unitMl,
      btlsNeeded, orderUnit,
      qtyToOrder: saved?.qtyToOrder ?? btlsNeeded,
      included:   saved?.included   ?? true,
    };
  });
}

function updateOrderBadge() {
  const n = getOrderItems().length;
  const b = document.getElementById('order-badge');
  if (b) { b.textContent = n; b.style.display = n>0?'inline-block':'none'; }
}

function renderOrders() {
  const items = getOrderItems();
  if (!state.orders) state.orders = {};

  const included = items.filter(x=>x.included);
  const totalEst = included.reduce((s,x) => {
    if (x.orderUnit==='btl') return s + x.qtyToOrder * x.ing.cost;
    return s + x.qtyToOrder * x.ing.costPerGram;
  }, 0);
  document.getElementById('order-summary-bar').innerHTML = `
    <div class="order-summary-item"><div class="order-summary-label">Items to order</div><div class="order-summary-val" style="color:var(--danger)">${items.length}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Selected</div><div class="order-summary-val">${included.length}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Est. order value</div><div class="order-summary-val" style="color:var(--gold)">${fmt(totalEst)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Last order</div><div class="order-summary-val" style="font-size:13px;color:var(--smoke)">${state.lastOrderDate||'—'}</div></div>
  `;

  if (!items.length) {
    document.getElementById('order-supplier-groups').innerHTML =
      `<div style="text-align:center;padding:40px;color:var(--success)">
        <i class="fa-solid fa-circle-check" style="font-size:24px;display:block;margin-bottom:8px"></i>
        All items are above minimum par. No orders needed.
      </div>`;
    return;
  }

  // Group by supplier
  const bySupplier = {};
  items.forEach(x => {
    const sup = x.ing.supplier || 'Unknown Supplier';
    if (!bySupplier[sup]) bySupplier[sup] = [];
    bySupplier[sup].push(x);
  });

  let html = '';
  Object.entries(bySupplier).sort(([a],[b])=>a.localeCompare(b)).forEach(([supplier, supItems]) => {
    const supTotal = supItems.filter(x=>x.included).reduce((s,x) => {
      if (x.orderUnit==='btl') return s + x.qtyToOrder * x.ing.cost;
      return s + x.qtyToOrder * x.ing.costPerGram;
    }, 0);
    html += `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:var(--surface);border-radius:var(--radius-sm) var(--radius-sm) 0 0;border:1px solid rgba(255,255,255,0.06);border-bottom:none">
        <div style="font-weight:600;color:var(--gold);font-size:13px"><i class="fa-solid fa-truck" style="margin-right:6px"></i>${escHtml(supplier)}</div>
        <div style="font-size:12px;color:var(--smoke)">${supItems.length} item${supItems.length>1?'s':''} · Est. ${fmt(supTotal)}</div>
      </div>
      <div class="table-wrap" style="margin-top:0;border-radius:0 0 var(--radius-sm) var(--radius-sm)">
        <table>
          <thead><tr>
            <th style="width:32px"></th>
            <th>Item</th>
            <th>Supplier Code</th>
            <th>Stock</th>
            <th>Par Level</th>
            <th>Gap</th>
            <th>Order Qty</th>
            <th>Est. Cost</th>
          </tr></thead>
          <tbody>
            ${supItems.map(x => {
              const id = x.ing.id;
              const isLiq = isAnyLiquidCat(x.ing.cat);
              const unitMl = x.unitMl || (isLiq ? x.ing.unitSize : 1);
              const _u = x.orderUnit; // 'btl','keg','g','nos'
              const stockBtls  = isLiq
                ? fmtBtl(x.totalMl / unitMl) + ' ' + _u
                : x.totalMl.toFixed(1) + ' g';
              const minBtls = isLiq
                ? (x.ing.minPar||0) + ' ' + _u + ' min'
                : Math.round(x.minMl) + ' g min';
              const maxBtls = isLiq
                ? (x.ing.maxPar||0) + ' ' + _u + ' max'
                : Math.round(x.maxMl) + ' g max';
              const gapBtls = isLiq
                ? fmtBtl(Math.max(0, x.gapMl) / unitMl)
                : Math.round(Math.max(0, x.gapMl));
              const stockMlDisp = isLiq
                ? fmtBtl(x.totalMl / unitMl) + ' ' + _u
                : x.totalMl.toFixed(1) + ' g';
              const estCost = isLiq
                ? x.qtyToOrder * x.ing.cost
                : x.qtyToOrder * x.ing.costPerGram;
              return `<tr style="${x.included?'':'opacity:0.45'}">
                <td><input type="checkbox" ${x.included?'checked':''} style="accent-color:var(--gold);width:16px;height:16px;cursor:pointer"
                  onchange="toggleOrderItem('${id}',this.checked)"></td>
                <td>
                  <div class="td-name">${escHtml(x.ing.desc)}</div>
                </td>
                <td style="font-size:11px;color:var(--smoke)">${escHtml(x.ing.tahweel||'—')}</td>
                <td>
                  <span style="color:var(--danger);font-weight:600;font-variant-numeric:tabular-nums">${stockBtls} ${isLiq?'btl':'g'}</span>
                  <div style="font-size:10px;color:var(--smoke)">${stockMlDisp}</div>
                </td>
                <td>
                  <span style="font-variant-numeric:tabular-nums;color:var(--smoke)">${minBtls} ${isLiq?'btl':x.orderUnit} min</span>
                  <div style="font-size:10px;color:var(--smoke)">${maxBtls} ${isLiq?'btl':x.orderUnit} max</div>
                </td>
                <td style="font-variant-numeric:tabular-nums;color:var(--warning)">${gapBtls} ${x.orderUnit}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <input class="order-input" type="number" min="0" step="1" value="${x.qtyToOrder}"
                      oninput="updateOrderQty('${id}',this.value)">
                    <span style="font-size:11px;color:var(--smoke)">${x.orderUnit}</span>
                  </div>
                </td>
                <td style="font-variant-numeric:tabular-nums;color:var(--gold);font-weight:600">${fmt(estCost)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  });

  document.getElementById('order-supplier-groups').innerHTML = html;
  updateOrderBadge();
}

function toggleOrderItem(id, checked) {
  if (!state.orders) state.orders = {};
  if (!state.orders[id]) state.orders[id] = {};
  state.orders[id].included = checked;
  renderOrders();
}

function updateOrderQty(id, val) {
  if (!state.orders) state.orders = {};
  if (!state.orders[id]) state.orders[id] = {};
  state.orders[id].qtyToOrder = parseFloat(val)||0;
  // update est cost in row without full re-render
  const ing = ingById(id);
  if (!ing) return;
  renderOrders();
}

function placeOrder() {
  const items = getOrderItems().filter(x=>x.included && x.qtyToOrder>0);
  if (!items.length) { toast('No items selected to order'); return; }
  const REASON_LABELS = { routine:'Routine Restock', fast_moving:'Fast Moving Item',
    upcoming_event:'Upcoming Event', seasonal:'Seasonal Demand',
    low_stock:'Low Stock Alert', new_listing:'New Listing / First Order', other:'Other' };
  // Show confirmation modal with reason selector
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'place-order-modal';
  const suppliers = [...new Set(items.map(x=>x.ing.supplier).filter(Boolean))];
  modal.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <h2 class="modal-title"><i class="fa-solid fa-paper-plane"></i> Confirm Order</h2>
        <button class="modal-close" onclick="document.getElementById('place-order-modal').remove()">×</button>
      </div>
      <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px">
        <div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:13px;color:var(--smoke)">
          <strong style="color:var(--ice)">${items.length} items</strong> across
          <strong style="color:var(--ice)">${suppliers.length} suppliers</strong> ready to place.
        </div>
        <div>
          <label style="font-size:12px;color:var(--smoke);display:block;margin-bottom:6px">Order Reason *</label>
          <select id="confirm-order-reason" style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:var(--ice);font-size:13px">
            <option value="routine">Routine Restock</option>
            <option value="fast_moving">Fast Moving Item</option>
            <option value="upcoming_event">Upcoming Event</option>
            <option value="seasonal">Seasonal Demand</option>
            <option value="low_stock">Low Stock Alert</option>
            <option value="new_listing">New Listing / First Order</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:var(--smoke);display:block;margin-bottom:6px">Notes (optional)</label>
          <input id="confirm-order-notes" type="text" placeholder="Any special instructions…"
            style="width:100%;background:var(--surface2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:var(--ice);font-size:13px;box-sizing:border-box">
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
          <button class="btn btn-ghost" onclick="document.getElementById('place-order-modal').remove()">Cancel</button>
          <button class="btn btn-gold" onclick="confirmPlaceOrder()">
            <i class="fa-solid fa-check"></i> Place Order & Go to Receiving
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function confirmPlaceOrder() {
  const items = getOrderItems().filter(x=>x.included && x.qtyToOrder>0);
  if (!items.length) { toast('No items to order'); return; }
  const REASON_LABELS = { routine:'Routine Restock', fast_moving:'Fast Moving Item',
    upcoming_event:'Upcoming Event', seasonal:'Seasonal Demand',
    low_stock:'Low Stock Alert', new_listing:'New Listing / First Order', other:'Other' };
  const reason = document.getElementById('confirm-order-reason')?.value || 'routine';
  const notes  = document.getElementById('confirm-order-notes')?.value || '';
  document.getElementById('place-order-modal')?.remove();
  const order = {
    id: uid(), reason, reasonLabel: REASON_LABELS[reason]||reason,
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
    placedBy: currentUser?.name || state.invUsername || 'Unknown',
    notes,
    items: items.map(x=>({
      ingId: x.ing.id, desc: x.ing.desc, supplier: x.ing.supplier||'',
      tahweel: x.ing.tahweel||'', qtyOrdered: x.qtyToOrder,
      orderUnit: x.orderUnit||'btl',
      unitCost: x.ing.cost, costPerGram: x.ing.costPerGram,
      status:'ordered', receivedQty:0, notes:''
    }))
  };
  if (!state.placedOrders) state.placedOrders = [];
  state.placedOrders.unshift(order);
  state.lastOrderDate = order.date;
  state.orders = {};
  save();
  toast(`\u2713 Order placed \u2014 ${items.length} items \u00b7 ${REASON_LABELS[reason]}`);
  updateRecvBadge();
  setTimeout(() => emailOrderToSuppliers(), 300);
  // Navigate straight to received tab
  const recvNav = document.querySelector('.nav-item[onclick*="received"]') ||
                  document.querySelector('.mobile-nav-item[onclick*="received"]');
  showScreen('received', recvNav);
  renderReceived();
}


function exportOrder() {
  const items = getOrderItems().filter(x=>x.included);
  if (!items.length) { toast('Nothing to export'); return; }
  const rows = [['Supplier Code','Description','Supplier','Qty to Order','Unit Cost','Est. Total']];
  items.forEach(x => rows.push([x.ing.tahweel||'',x.ing.desc,x.ing.supplier||'',x.qtyToOrder,x.ing.cost,(x.qtyToOrder*x.ing.cost).toFixed(2)]));
  const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  downloadFile(URL.createObjectURL(blob), `order-${new Date().toISOString().slice(0,10)}.csv`);
  toast('Order exported');
}
