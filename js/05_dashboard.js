// BartenderPro — Dashboard KPIs & low stock
// Lines 250–424 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function renderDashboard() {
  const totalStockVal = state.ingredients.reduce((s,ing) => {
    const entry = getInvEntry(ing.id);
    return s + calcTotalValue(ing, entry);
  }, 0);
  const lowItems = getLowStockItems();
  const avgCostPct = state.recipes.length
    ? state.recipes.reduce((s,r) => s + recipeCostPct(r), 0) / state.recipes.length : 0;

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card gold-card">
      <div class="kpi-label">Total Stock Value</div>
      <div class="kpi-value gold">${fmt(totalStockVal)}</div>
      <div class="kpi-sub">${state.ingredients.length} ingredients tracked</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Low Stock Items</div>
      <div class="kpi-value ${lowItems.length>0?'danger':'success'}">${lowItems.length}</div>
      <div class="kpi-sub">Below minimum par level</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active Recipes</div>
      <div class="kpi-value">${state.recipes.length}</div>
      <div class="kpi-sub">In recipe center</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Cost %</div>
      <div class="kpi-value ${costClass(avgCostPct)==='good'?'success':costClass(avgCostPct)==='ok'?'':  'danger'}">${pct(avgCostPct)}</div>
      <div class="kpi-sub">Target: ${state.targetCostPct}%</div>
    </div>
  `;
  // low stock alert list
  const list = document.getElementById('low-stock-list');
  if (lowItems.length === 0) {
    list.innerHTML = `<div style="font-size:13px;color:var(--smoke);padding:12px 0">✓ All items are above minimum par.</div>`;
  } else {
    list.innerHTML = lowItems.slice(0,6).map(item => {
      const isAnyLiqItem = isAnyLiquidCat(item.cat);
      const isKegItem    = item.cat === 'beer_keg';
      const isNosItem    = !isAnyLiqItem && item.unitMl <= 1;
      const dispU        = isKegItem ? 'keg' : isAnyLiqItem ? 'btl' : isNosItem ? 'nos' : 'g';
      const stockDisp = isAnyLiqItem
        ? `${fmtBtl(item.stockBtl)} btl`
        : item.totalMl.toFixed(0) + dispU;
      const minDisp = isAnyLiqItem
        ? `${fmtBtl(item.minBtl)} btl min`
        : item.minMl.toFixed(0) + dispU + ' min';
      // Colour indicator: red if < 25% of min, amber if < 50%
      const pct = item.minMl > 0 ? item.totalMl / item.minMl : 0;
      const valColor = pct < 0.25 ? 'var(--danger)' : 'var(--warning)';
      return `
      <div class="alert-item">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <div class="alert-item-name">${escHtml(item.desc)}</div>
          <div class="alert-item-detail">${stockDisp} in stock</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:700;color:${valColor}">${minDisp}</div>
          ${isAnyLiqItem && item.unitMl ? `<div style="font-size:10px;color:var(--smoke)">(${item.unitMl}ml/btl)</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  // badge
  const badge = document.getElementById('low-badge');
  if (badge) { badge.textContent = lowItems.length; badge.style.display = lowItems.length > 0 ? 'inline-block' : 'none'; }

  // Received but not yet physically recounted in the Inventory tab
  const recountEl = document.getElementById('recount-list');
  if (recountEl) {
    const needsRecount = state.ingredients.filter(ing => state.inventory[ing.id]?.pendingRecount);
    recountEl.innerHTML = !needsRecount.length
      ? `<div style="font-size:12px;color:var(--smoke);padding:4px 0">Nothing pending recount</div>`
      : needsRecount.map(ing => {
          const inv = state.inventory[ing.id];
          return `<div class="alert-item">
            <i class="fa-solid fa-clipboard-check" style="color:var(--warning)"></i>
            <div>
              <div class="alert-item-name">${escHtml(ing.desc)}</div>
              <div class="alert-item-detail">Received ${escHtml(inv.measuredAt||'')}${inv.measuredBy?` by ${escHtml(inv.measuredBy)}`:''} — not yet physically counted</div>
            </div>
            <button class="btn btn-ghost btn-sm" style="font-size:10px" onclick="dismissRecount('${ing.id}')">Mark Counted</button>
          </div>`;
        }).join('');
  }

  // Home-made / batch low stock alerts
  const hmList = document.getElementById('low-hm-list');
  const unavailEl = document.getElementById('unavailable-list');
  if (unavailEl) {
    // Same live-from-current-stock treatment as "Low Home-Made & Batch" below —
    // no session bookkeeping required, an item at 0 in inventory shows up here
    // automatically. The manual notAvailable flag (ban icon / dashboard button)
    // still applies on top, for items pulled off menu for reasons other than stock.
    const unavailIngs = state.ingredients.filter(i =>
      i.notAvailable || (i.inInventory && calcTotalMl(i, getInvEntry(i.id)) <= 0));
    const unavailHM   = (state.homeMade||[]).filter(h =>
      h.notAvailable || (h.trackInv && (state.hmInventory?.[h.id]?.qty||0) <= 0));
    if (!unavailIngs.length && !unavailHM.length) {
      unavailEl.innerHTML = `<div style="font-size:12px;color:var(--smoke);padding:4px 0">All ingredients available</div>`;
    } else {
      // Find recipes affected by each unavailable ingredient
      const affectedRecipes = {};
      unavailIngs.forEach(ing => {
        const recipes = state.recipes.filter(r =>
          (r.lines||[]).some(l => l.ingId === ing.id)
        );
        affectedRecipes[ing.id] = recipes;
      });

      const ingRows = unavailIngs.map(ing => {
        const affected = affectedRecipes[ing.id]||[];
        return `<div class="alert-item" style="flex-direction:column;align-items:flex-start;gap:6px">
          <div style="display:flex;align-items:center;gap:8px;width:100%">
            <i class="fa-solid fa-ban" style="color:var(--danger);flex-shrink:0"></i>
            <div style="flex:1">
              <div class="alert-item-name" style="color:var(--danger)">${escHtml(ing.desc)}</div>
              <div class="alert-item-detail">${affected.length} recipe${affected.length!==1?'s':''} affected</div>
            </div>
            <button class="btn btn-ghost btn-sm" style="font-size:10px" onclick="toggleIngAvailable('${ing.id}')">Mark Available</button>
          </div>
          ${affected.length ? `<div style="padding-left:24px;width:100%">
            ${affected.slice(0,4).map(r=>`<span style="font-size:10px;background:rgba(224,82,82,0.1);color:var(--danger);padding:2px 6px;border-radius:20px;margin:2px;display:inline-block">${escHtml(r.name)}</span>`).join('')}
            ${affected.length>4?`<span style="font-size:10px;color:var(--smoke)"> +${affected.length-4} more</span>`:''}
            <button class="btn btn-ghost btn-sm" style="font-size:10px;margin-left:6px" onclick="findAlternativeAI('${ing.id}','${escHtml(ing.desc).replace(/'/g,'\\\'')}')" title="Ask AI for an alternative ingredient">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Find Alternative
            </button>
          </div>` : ''}
        </div>`;
      });

      const hmRows = unavailHM.map(hm => `<div class="alert-item" style="flex-direction:column;align-items:flex-start;gap:6px">
          <div style="display:flex;align-items:center;gap:8px;width:100%">
            <i class="fa-solid fa-ban" style="color:var(--danger);flex-shrink:0"></i>
            <div style="flex:1">
              <div class="alert-item-name" style="color:var(--danger)">${escHtml(hm.name)} <span style="font-size:10px;color:var(--smoke)">(home-made)</span></div>
              <div class="alert-item-detail">Counted at 0 in the last stock take</div>
            </div>
            <button class="btn btn-ghost btn-sm" style="font-size:10px" onclick="toggleHMAvailable('${hm.id}')">Mark Available</button>
          </div>
        </div>`);

      unavailEl.innerHTML = ingRows.join('') + hmRows.join('');
    }
  }

  // Home-made / batch low stock alerts
  // (hmList declared above)
  if (hmList) {
    const hmLow = (state.homeMade||[]).filter(h => {
      const inv = state.hmInventory?.[h.id];
      if (!inv) return false; // not tracked
      const minQty = h.minPar || 0;
      return minQty > 0 && (inv.qty||0) < minQty;
    });
    hmList.innerHTML = hmLow.length === 0
      ? `<div style="font-size:12px;color:var(--smoke);padding:8px 0">All home-made items OK</div>`
      : hmLow.slice(0,4).map(h => {
          const inv = state.hmInventory[h.id];
          const minQty = h.minPar||0;
          return `<div class="alert-item">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <div class="alert-item-name">${escHtml(h.name)} <span style="font-size:10px;color:var(--gold)">${h.hmId}</span></div>
              <div class="alert-item-detail">${inv.qty||0} ${h.yieldUnit} in stock</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--danger)">${minQty} ${h.yieldUnit} min</div>
          </div>`;
        }).join('');
  }

} // end renderDashboard

function dismissRecount(id) {
  if (!state.inventory[id]) return;
  state.inventory[id].pendingRecount = false;
  save();
  renderDashboard();
  toast('Marked as physically counted');
}

// Convert ml to bottles as decimal, rounded to 2dp (e.g. 424ml / 700ml = 0.61 btl)
function mlToBtl(ml, unitMl) {
  if (!unitMl || unitMl <= 0) return 0;
  return Math.round((ml / unitMl) * 100) / 100;
}
// Format bottles nicely: 2.0→"2", 0.5→"0.5", 0.61→"0.6"
function fmtBtl(btl) {
  if (btl === 0) return '0';
  if (btl % 1 === 0) return btl.toString();
  return btl.toFixed(1).replace(/\.0$/, '');
}

function getLowStockItems() {
  return state.ingredients.filter(ing => {
    const entry    = getInvEntry(ing.id);
    const totalMl  = calcTotalMl(ing, entry);
    const isAnyLiq = isAnyLiquidCat(ing.cat);
    const unitMl   = isAnyLiq ? ing.unitSize : 1;
    const minMl    = (ing.minPar||0) * unitMl;
    return (ing.minPar||0) > 0 && totalMl < minMl;
  }).map(ing => {
    const entry    = getInvEntry(ing.id);
    const isAnyLiq = isAnyLiquidCat(ing.cat);
    const unitMl   = isAnyLiq ? ing.unitSize : 1;
    const totalMl  = calcTotalMl(ing, entry);
    const minMl   = (ing.minPar||0) * unitMl;
    const maxMl   = (ing.maxPar||0) * unitMl;
    return {
      id: ing.id, desc: ing.desc, cat: ing.cat,
      totalMl, minMl, maxMl, unitMl,
      stockBtl: isAnyLiq ? mlToBtl(totalMl, unitMl) : totalMl,
      minBtl:   ing.minPar || 0,
      maxBtl:   ing.maxPar || 0,
    };
  });
}
