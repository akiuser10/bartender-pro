// BartenderPro — Batch calculator
// Lines 3689–end of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// BATCH CALCULATOR TAB
// ═══════════════════════════════════════════════════════
// "Alcohol+Syrup" table = spirits + syrups (grouped left)
// "Juice+Mixer" table   = juices, milk, puree, herb, garnish, other (grouped right)
// Dilution only when ALL liquid lines are spirits (no juice/soda/mixer)

function renderBatch() {
  // Populate recipe dropdown with all recipes + home-made items that are batches/mixes
  const recEl = document.getElementById('btab-recipe');
  if (!recEl) return;
  const opts = state.recipes.map(r=>`<option value="${r.id}">${escHtml(r.name)}</option>`).join('');
  const hmOpts = (state.homeMade||[]).filter(h=>['mix','infusion','syrup','cordial','shrub','puree','bitters'].includes(h.type))
    .map(h=>`<option value="hm:${h.id}">[HM] ${escHtml(h.name)} (${h.hmId})</option>`).join('');
  const current = recEl.value;
  recEl.innerHTML = '<option value="">— Choose a recipe —</option>' + opts + (hmOpts?`<optgroup label="Home-Made">${hmOpts}</optgroup>`:'');
  if (current) recEl.value = current;
  renderBatchCalc();
  renderBatchHistory();
}

function renderBatchCalc() {
  const recId   = document.getElementById('btab-recipe')?.value||'';
  const qty     = parseFloat(document.getElementById('btab-qty')?.value)||0;
  const unit    = document.getElementById('btab-unit')?.value||'ml';
  const dilPct  = parseFloat(document.getElementById('btab-dilution')?.value)||20;

  document.getElementById('btab-empty').style.display  = (!recId||!qty) ? '' : 'none';
  document.getElementById('btab-result').style.display = (recId&&qty) ? '' : 'none';
  if (!recId||!qty) return;

  // Resolve recipe or home-made
  let lines = [], recipeName = '';
  if (recId.startsWith('hm:')) {
    const hmId = recId.slice(3);
    const hm   = (state.homeMade||[]).find(x=>x.id===hmId);
    if (!hm) return;
    recipeName = `${hm.name} (${hm.hmId})`;
    lines      = hm.lines||[];
  } else {
    const recipe = state.recipes.find(r=>r.id===recId);
    if (!recipe) return;
    recipeName = recipe.name;
    lines      = recipe.lines||[];
  }

  // Resolve all ingredients including home-made
  const allIngs = allIngredients();
  const resolvedLines = lines.map(l=>{
    const ing = allIngs.find(x=>x.id===l.ingId);
    return ing ? { ...l, ing } : null;
  }).filter(Boolean);

  // Base recipe total volume in ml (liquid lines only)
  const baseMl = resolvedLines.reduce((s,l)=>{
    if (l.unit==='ml') return s+l.qty;
    if (l.unit==='g' && l.ing) return s+l.qty/(l.ing.density||1);
    return s;
  },0);
  if (baseMl<=0) { toast('Recipe has no liquid ingredients with ml quantities'); return; }

  // Scale factor
  let targetMl = qty;
  if (unit==='litres')   targetMl = qty*1000;
  if (unit==='portions') targetMl = qty*baseMl;
  const scale    = targetMl/baseMl;
  const portions = targetMl/baseMl;

  // Check if spirits-only (for dilution) — includes HM alcoholic infusions.
  // Ice ("each piece" items like Ice Block) is sometimes recorded with unit 'ml'
  // in a recipe, but it's not a real juice/mixer — it's what dilution comes from
  // when a drink is stirred/shaken, so it shouldn't disqualify spirits-only dilution.
  const isRealLiquid = l => l.unit==='ml' && !(l.ing && isNosCat(l.ing));
  const liquidLines = resolvedLines.filter(isRealLiquid);
  // Use the same alcohol-category list as everywhere else in Batching (BATCH_ALCOHOL_CATS) —
  // this previously used its own incomplete inline list missing wine/sparkling/beer, so any
  // all-alcohol build that happened to include a wine line (e.g. Rosato's rosé) wrongly lost dilution.
  const spiritsOnly = liquidLines.length>0 && liquidLines.every(l=>
    BATCH_ALCOHOL_CATS.includes(l.ing?.cat));

  // For spirits-only batches, dilution water is carved OUT of the target volume
  // (not added on top) — so total volume never exceeds the target. The alcohol
  // lines get scaled down so alcohol + dilution == targetMl exactly. Garnish/ice
  // (non-ml lines, and "each piece" items even if stored as ml) keep the normal
  // portion-based scale.
  const liquidScale = spiritsOnly ? scale/(1+dilPct/100) : scale;

  // Scale each line
  const scaledLines = resolvedLines.map(l=>{
    const isLiq = l.unit==='ml';
    const useLiquidScale = isRealLiquid(l);
    const scaledQty = l.qty*(useLiquidScale ? liquidScale : scale);
    const qtyMl = isLiq ? scaledQty : (l.ing ? scaledQty/(l.ing.density||1) : scaledQty);
    const cat   = l.ing?.cat||'other';
    let cost = 0;
    if (l.ing) {
      cost = l.unit==='ml'
        ? scaledQty*(l.ing.costPerGram/(l.ing.density||1))
        : scaledQty*l.ing.costPerGram;
    }
    return { ...l, scaledQty, qtyMl, cat, cost, isLiq };
  });

  // Dilution — fills exactly the room carved out above, so alcohol + dilution == targetMl
  const dilutionMl = spiritsOnly
    ? scaledLines.filter(isRealLiquid).reduce((s,l)=>s+l.qtyMl,0) * (dilPct/100)
    : 0;

  // Split into Alcohol+Syrup vs Juice+Garnish
  const alcoholGroup = scaledLines.filter(l=>
    BATCH_ALCOHOL_CATS.includes(l.cat)||BATCH_SYRUP_CATS.includes(l.cat));
  const juiceGroup   = scaledLines.filter(l=>
    !BATCH_ALCOHOL_CATS.includes(l.cat)&&!BATCH_SYRUP_CATS.includes(l.cat));

  const fmtQty = (qty,unit)=> {
    const q = qty<10 ? qty.toFixed(2) : Math.round(qty);
    return `${q}${unit}`;
  };

  const renderTableRows = (group, footId, bodyId) => {
    let subtotal=0;
    const rows = group.map(l=>{
      const dispQty = l.unit==='g'||l.unit==='nos'
        ? fmtQty(l.scaledQty,l.unit)
        : fmtQty(l.scaledQty,'ml');
      const catLabel = l.ing?.cat ? (CAT_LABELS[l.ing?.cat]||l.ing?.cat||'—') : '—';
      const badge = l.ing?.isHomeMade ? hmTypeBadge(l.ing.hmRef?.type) : categoryBadge(l.ing?.cat||'other');
      subtotal+=l.cost;
      return `<tr>
        <td class="td-name" style="font-size:13px">${escHtml(l.ing?.desc||'Unknown')}</td>
        <td>${badge}</td>
        <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;color:var(--gold)">${dispQty}</td>
        <td style="text-align:right;font-size:12px;color:var(--smoke);font-variant-numeric:tabular-nums">${fmt(l.cost)}</td>
      </tr>`;
    }).join('');
    document.getElementById(bodyId).innerHTML = rows||`<tr><td colspan="4" style="text-align:center;padding:12px;color:var(--smoke);font-size:12px">None</td></tr>`;
    document.getElementById(footId).innerHTML = `<tr style="border-top:2px solid rgba(255,255,255,0.1)">
      <td colspan="2" style="font-weight:600;font-size:12px;padding:8px 14px;color:var(--smoke)">Subtotal</td>
      <td></td><td style="text-align:right;font-weight:700;color:var(--gold);padding:8px 14px">${fmt(subtotal)}</td>
    </tr>`;
    return subtotal;
  };

  const cost1 = renderTableRows(alcoholGroup,'btab-alcohol-foot','btab-alcohol-body');
  const cost2 = renderTableRows(juiceGroup,'btab-juice-foot','btab-juice-body');

  // juice wrap visibility
  document.getElementById('btab-juice-wrap').style.display  = juiceGroup.length ? '' : 'none';
  document.getElementById('btab-juice-empty').style.display = juiceGroup.length ? 'none' : '';

  // Dilution row
  const dilRow = document.getElementById('btab-dilution-row');
  const dilVal = document.getElementById('btab-dilution-val');
  dilRow.style.display = spiritsOnly&&dilutionMl>0 ? '' : 'none';
  if (dilVal) dilVal.textContent = `${Math.round(dilutionMl)}ml`;

  // Summary bar — dilution is carved out of the target above, so total volume
  // is always the target itself, never more.
  const totalBatchMl = targetMl;
  const totalCost = cost1+cost2;
  const costPerServe = portions>0 ? totalCost/portions : 0;
  document.getElementById('btab-summary').innerHTML = `
    <div class="order-summary-item"><div class="order-summary-label">Recipe</div><div class="order-summary-val" style="font-size:13px">${escHtml(recipeName)}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Target</div><div class="order-summary-val">${qty}${unit==='ml'?'ml':unit==='litres'?'L':' portions'}</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Total volume</div><div class="order-summary-val" style="color:var(--gold)">${Math.round(totalBatchMl)}ml</div></div>
    <div class="order-summary-item"><div class="order-summary-label">Portions yield</div><div class="order-summary-val">${portions.toFixed(1)}</div></div>
    ${spiritsOnly?`<div class="order-summary-item"><div class="order-summary-label">Dilution (${dilPct}%)</div><div class="order-summary-val" style="color:var(--info)">${Math.round(dilutionMl)}ml</div></div>`:''}
  `;

  const _btc=document.getElementById('btab-total-cost'); if(_btc) _btc.textContent=fmt(totalCost);
  const _bcs=document.getElementById('btab-cost-per-serve'); if(_bcs) _bcs.textContent=`(${fmt(costPerServe)} / portion)`;

  // store for export
  window._batchExportData = {
    recipeName, qty, unit,
    recipeId: recId.startsWith('hm:') ? '' : recId,
    hmId:     recId.startsWith('hm:') ? recId.slice(3) : '',
    scaledLines, dilutionMl, spiritsOnly, totalCost, portions,
    targetMl,
    alcoholLines: alcoholGroup,
    nonAlcLines:  juiceGroup,
  };
}

function exportBatchCSV() {
  const d = window._batchExportData;
  if (!d) { toast('Calculate a batch first'); return; }
  const rows = [['Ingredient','Category','Qty','Unit','Cost']];
  d.scaledLines.forEach(l=>{
    const q = l.unit==='ml'?Math.round(l.scaledQty):l.scaledQty.toFixed(2);
    rows.push([l.ing?.desc||'',l.ing?.cat||'',q,l.unit,l.cost.toFixed(2)]);
  });
  if (d.spiritsOnly&&d.dilutionMl>0) rows.push(['Dilution Water','water',Math.round(d.dilutionMl),'ml','0.00']);
  rows.push(['','','','Total',d.totalCost.toFixed(2)]);
  const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  downloadFile(URL.createObjectURL(new Blob([csv],{type:'text/csv'})), `batch-${d.recipeName.replace(/\s+/g,'-').toLowerCase()}-${d.qty}${d.unit}.csv`);
  toast('Batch sheet exported');
}

function logBatch() {
  const d = window._batchExportData;
  if (!d) { toast('Calculate a batch first'); return; }
  if (!state.batchLog) state.batchLog = [];

  // Build ingredient summaries for each section
  const makeIngList = (lines) => (lines||[]).map(l => ({
    desc: l.ing?.desc||'Unknown',
    cat:  l.ing?.cat||'other',
    scaledQty: l.scaledQty,
    unit: l.unit,
    cost: l.cost,
    ingId: l.ingId||'',
    isHM:  !!l.ing?.isHomeMade,
    hmId:  l.ing?.hmRef?.id||'',
  }));

  const entry = {
    id:           uid(),
    date:         new Date().toLocaleDateString('en-GB'),
    time:         new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
    recipeName:   d.recipeName,
    recipeId:     d.recipeId||'',
    hmId:         d.hmId||'',
    qty:          d.qty,
    unit:         d.unit,
    totalMl:      Math.round(d.targetMl),
    portions:     Math.round(d.portions*10)/10,
    totalCost:    Math.round(d.totalCost*100)/100,
    spiritsOnly:  d.spiritsOnly||false,
    dilutionMl:   d.dilutionMl||0,
    alcoholLines: makeIngList(d.alcoholLines),
    nonAlcLines:  makeIngList(d.nonAlcLines),
    scaledLines:  makeIngList(d.scaledLines),
    addedToInv:   false,
  };
  state.batchLog.unshift(entry);
  save();
  renderBatchHistory();
  toast(`✓ Batch logged — ${d.recipeName} · ${d.qty}${d.unit}`);
}

function renderBatchHistory() {
  const listEl = document.getElementById('batch-history-list');
  if (!listEl) return;
  const log = state.batchLog || [];
  if (!log.length) {
    listEl.innerHTML = `<div style="font-size:13px;color:var(--smoke);padding:16px 0">No batches logged yet. Calculate a batch above and click "Log Batch".</div>`;
    return;
  }

  listEl.innerHTML = log.map(entry => {
    const alcLines    = entry.alcoholLines  || [];
    const nonAlcLines = entry.nonAlcLines   || [];
    const hasAlc      = alcLines.length > 0;
    const hasNonAlc   = nonAlcLines.length > 0;

    const invBtn = entry.addedToInv
      ? `<span style="font-size:11px;color:var(--success)"><i class="fa-solid fa-check"></i> Batch added to inventory</span>`
      : `<button class="btn btn-ghost btn-sm" onclick="addBatchToInventory('${entry.id}')" style="font-size:11px"><i class="fa-solid fa-boxes-stacked"></i> Add Batch to Inventory</button>`;

    const renderLines = (lines, color) => lines.map(l => {
      const qty = l.unit==='ml' ? `${Math.round(l.scaledQty)}ml` : `${l.scaledQty.toFixed(1)}${l.unit}`;
      return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <span style="color:var(--ice)">${escHtml((l.desc||'').replace(/^\[HM\] /,''))}</span>
        <span style="color:${color};font-weight:600;font-variant-numeric:tabular-nums">${qty}</span>
      </div>`;
    }).join('');

    const alcSection = hasAlc ? `
      <div style="flex:1;min-width:160px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);margin-bottom:6px">
          <i class="fa-solid fa-wine-bottle"></i> Alcohol${entry.dilutionMl>0?` + ${Math.round(entry.dilutionMl)}ml dilution`:''}
        </div>
        ${renderLines(alcLines,'var(--gold)')}
      </div>` : '';

    const nonAlcSection = hasNonAlc ? `
      <div style="flex:1;min-width:160px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--info);margin-bottom:6px">
          <i class="fa-solid fa-lemon"></i> Juices, Mixers &amp; Garnish
        </div>
        ${renderLines(nonAlcLines,'var(--info)')}
      </div>` : '';

    return `<div style="background:var(--surface);border-radius:var(--radius);border:1px solid rgba(255,255,255,0.06);padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--ice)">${escHtml(entry.recipeName)}</div>
          <div style="font-size:12px;color:var(--smoke);margin-top:3px">
            ${entry.date} · ${entry.time} &nbsp;·&nbsp;
            <span style="color:var(--gold)">${entry.qty}${entry.unit}</span> &nbsp;·&nbsp;
            ${entry.portions} portions &nbsp;·&nbsp;
            <span style="color:var(--gold);font-weight:600">${fmt(entry.totalCost)}</span>
          </div>
        </div>
        <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteBatchLog('${entry.id}')" title="Remove"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        ${alcSection}
        ${nonAlcSection}
      </div>
      <div style="margin-top:10px">${invBtn}</div>
    </div>`;
  }).join('');
}

// Registers the finished batch itself as a trackable inventory item (like a Home-Made
// ingredient) — the diluted total volume (spirits + dilution water), not the raw
// components that went into it. Those components combine into one new product, so
// their own stock isn't touched here.
function addBatchToInventory(batchLogId) {
  const entry = (state.batchLog||[]).find(e=>e.id===batchLogId);
  if (!entry) return;
  if (entry.addedToInv) { toast('Already added to inventory'); return; }

  const totalMl = entry.totalMl || Math.round((entry.qty||0) + (entry.dilutionMl||0));

  // If this batch was made from an existing Home-Made recipe, entry.hmId already
  // points at its internal id — just top up that item's stock.
  let hmInternalId = entry.hmId;

  if (!hmInternalId) {
    if (!state.homeMade) state.homeMade = [];
    let hm = entry.recipeId ? state.homeMade.find(h=>h.sourceRecipeId===entry.recipeId) : null;
    if (!hm) {
      hm = {
        id: uid(),
        hmId: nextHMId(),
        name: `${entry.recipeName} (Batched)`,
        type: 'mix',
        yieldQty: 1000,
        yieldUnit: 'ml',
        density: 1,
        isAlcoholic: !!entry.spiritsOnly,
        method: 'Auto-created from Batch Calculator',
        lines: [],
        totalCost: 0,
        costPerUnit: 0,
        trackInv: true,
        sourceRecipeId: entry.recipeId||'',
        createdAt: new Date().toISOString(),
      };
      state.homeMade.push(hm);
    }
    hmInternalId = hm.id;
  }

  if (!state.hmInventory) state.hmInventory = {};
  if (!state.hmInventory[hmInternalId]) state.hmInventory[hmInternalId] = { qty:0, measuredAt:'', measuredBy:'' };
  state.hmInventory[hmInternalId].qty = Math.round(((state.hmInventory[hmInternalId].qty||0) + totalMl)*100)/100;
  state.hmInventory[hmInternalId].measuredAt = `${entry.date} ${entry.time}`;
  state.hmInventory[hmInternalId].measuredBy = 'Batch log';

  entry.addedToInv = true;
  save();
  renderBatchHistory();
  if (typeof renderHomeMade === 'function') renderHomeMade();
  toast(`✓ ${Math.round(totalMl)}ml of ${entry.recipeName} added to inventory`);
}

function addHMToInventory(hmId) {
  const hm = (state.homeMade||[]).find(x=>x.id===hmId);
  if (!hm) return;

  const qty = parseFloat(prompt(`Add quantity to inventory for "${hm.name}"\nEnter amount in ${hm.yieldUnit}:`) || '0');
  if (!qty || qty <= 0) return;

  if (!state.hmInventory) state.hmInventory = {};
  if (!state.hmInventory[hmId]) state.hmInventory[hmId] = { qty:0, measuredAt:'', measuredBy:'' };
  state.hmInventory[hmId].qty = Math.round(((state.hmInventory[hmId].qty||0) + qty)*100)/100;
  state.hmInventory[hmId].measuredAt = new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});
  state.hmInventory[hmId].measuredBy = state.invUsername || 'Manual';
  hm.trackInv = true;
  save();
  renderHomeMade();
  toast(`✓ Added ${qty}${hm.yieldUnit} of ${hm.name} to inventory`);
}

function deleteBatchLog(id) {
  state.batchLog = (state.batchLog||[]).filter(e=>e.id!==id);
  save();
  renderBatchHistory();
  toast('Batch log entry removed');
}

// ═══════════════════════════════════════════════════════
// RECIPE BOOKLET EXPORT — A4 foldable, print-ready
// Layout: 2 recipe cards per A4 page, each half-page (A5)
// Designed to be folded in half → A5 booklet
// ═══════════════════════════════════════════════════════
function exportRecipeBooklet() {
  const recipes = state.recipes;
  if (!recipes.length) { toast('No recipes to export'); return; }

  const cur = CURRENCIES[state.currency] || CURRENCIES.AED;
  const fmtP = v => cur.sym + Number(v).toFixed(cur.dec);
  const barName = state.barName || 'Bartender Pro';

  const typeLabel = { signature:'★ Signature Cocktail', classic:'Classic Cocktail',
    mocktail:'Mocktail', coffee:'Coffee & Tea', beer:'Beer & Wine', cocktail:'Cocktail' };

  const typeColor = { signature:'#B8860B', classic:'#1565C0',
    mocktail:'#2E7D32', coffee:'#5D4037', beer:'#E65100' };

  // Sort: signature first, then classic, then others
  const sorted = [...recipes].sort((a,b) => {
    const order = {signature:0, classic:1, cocktail:1, mocktail:2, coffee:3, beer:4};
    return (order[a.type]||5) - (order[b.type]||5);
  });

  // Build one card per recipe (A5 half-page)
  const cards = sorted.map(r => {
    const cost      = recipeCost(r);
    const cp        = r.price > 0 ? (cost/r.price*100).toFixed(1) : '—';
    const vatAmt    = r.price * (r.vat||0) / 100;
    const svcAmt    = r.price * (r.service||0) / 100;
    const otherAmt  = r.price * (r.otherTax||0) / 100;
    const priceIncl = r.price + vatAmt + svcAmt + otherAmt;
    const hasTax    = (r.vat||0)+(r.service||0)+(r.otherTax||0) > 0;
    const tcolor    = typeColor[r.type] || '#555';
    const tlabel    = typeLabel[r.type]  || r.type;

    const ingRows = (r.lines||[]).map(l => {
      const ing = allIngredients().find(x=>x.id===l.ingId);
      if (!ing) return '';
      const lc = l.unit==='ml'
        ? l.qty*(ing.costPerGram/(ing.density||1))
        : l.qty*ing.costPerGram;
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:12px">${ing.desc}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;font-weight:600;color:#1a1a2e">${l.qty}${l.unit}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;color:#777">${fmtP(lc)}</td>
      </tr>`;
    }).join('');

    const details = [
      r.glass   ? `<span>🥃 ${r.glass}</span>` : '',
      r.ice     ? `<span>🧊 ${r.ice}</span>` : '',
      r.garnish ? `<span>🌿 ${r.garnish}</span>` : '',
    ].filter(Boolean).join(' &nbsp;·&nbsp; ');

    return `
    <div class="recipe-card-print">
      <div class="card-header-print" style="border-left:5px solid ${tcolor}">
        <div class="card-type-print" style="color:${tcolor}">${tlabel}</div>
        <div class="card-name-print">${r.name}</div>
        <div class="card-price-print">
          ${fmtP(r.price)}
          ${hasTax ? `<span style="font-size:12px;color:#888;margin-left:8px">incl. tax: ${fmtP(priceIncl)}</span>` : ''}
        </div>
      </div>
      <div class="card-body-print">
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:5px 8px;font-size:11px;text-align:left;color:#666;text-transform:uppercase;letter-spacing:.04em">Ingredient</th>
              <th style="padding:5px 8px;font-size:11px;text-align:center;color:#666;text-transform:uppercase;letter-spacing:.04em">Qty</th>
              <th style="padding:5px 8px;font-size:11px;text-align:right;color:#666;text-transform:uppercase;letter-spacing:.04em">Cost</th>
            </tr>
          </thead>
          <tbody>${ingRows}</tbody>
          <tfoot>
            <tr style="background:#fafafa">
              <td colspan="2" style="padding:5px 8px;font-size:11px;font-weight:600;color:#444">Recipe Cost</td>
              <td style="padding:5px 8px;font-size:12px;font-weight:700;text-align:right;color:#B8860B">${fmtP(cost)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:4px 8px;font-size:11px;color:#666">Cost %</td>
              <td style="padding:4px 8px;font-size:11px;text-align:right;color:#555">${cp}%</td>
            </tr>
          </tfoot>
        </table>
        ${details ? `<div class="card-details-print">${details}</div>` : ''}
        ${r.method ? `<div class="card-method-print"><strong>Method:</strong> ${r.method}</div>` : ''}
      </div>
    </div>`;
  });

  // Pair cards into A4 pages (2 per page, side by side)
  let pages = '';
  for (let i = 0; i < cards.length; i += 2) {
    pages += `<div class="page">
      ${cards[i]}
      ${cards[i+1] || '<div class="recipe-card-print empty-card"></div>'}
    </div>`;
  }

  // CSS extracted into a string to prevent V8/parsers from misreading
  // CSS rule braces as JS braces inside the template literal
  const _bookletCSS = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    "body { font-family: 'Inter', sans-serif; background: #f0f0f0; }",
    '@media screen {',
    '  body { padding: 20px; }',
    '  .page { margin: 0 auto 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }',
    '}',
    '.page { width:297mm; height:210mm; background:white; display:flex; flex-direction:row; overflow:hidden; page-break-after:always; position:relative; }',
    '.page::after { content:""; display:block; position:absolute; left:50%; top:0; bottom:0; width:1px; border-left:1px dashed #ddd; pointer-events:none; }',
    '.cover { width:297mm; height:210mm; background:#1C1C2E; display:flex; flex-direction:column; align-items:center; justify-content:center; page-break-after:always; }',
    ".cover-title { font-family:'Playfair Display',serif; font-size:48px; color:#C9A84C; margin-bottom:8px; }",
    '.cover-sub { font-size:18px; color:rgba(255,255,255,0.6); margin-bottom:40px; }',
    '.cover-bar { font-size:22px; color:white; font-weight:600; }',
    '.cover-date { font-size:13px; color:rgba(255,255,255,0.4); margin-top:8px; }',
    '.cover-line { width:120px; height:2px; background:#C9A84C; margin:20px auto; }',
    '.recipe-card-print { width:50%; height:210mm; border-right:1px dashed #e0e0e0; display:flex; flex-direction:column; overflow:hidden; }',
    '.recipe-card-print:last-child { border-right:none; }',
    '.empty-card { background:#fafafa; }',
    '.card-header-print { padding:14px 16px 12px; background:#fafafa; border-bottom:1px solid #e8e8e8; flex-shrink:0; }',
    '.card-type-print { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; margin-bottom:3px; }',
    ".card-name-print { font-family:'Playfair Display',serif; font-size:20px; color:#1a1a2e; line-height:1.2; margin-bottom:4px; }",
    '.card-price-print { font-size:15px; font-weight:700; color:#B8860B; }',
    '.card-body-print { padding:10px 16px; flex:1; overflow:hidden; }',
    '.card-details-print { display:flex; gap:8px; flex-wrap:wrap; font-size:11px; color:#555; padding:6px 0; margin-bottom:6px; border-top:1px solid #eee; border-bottom:1px solid #eee; }',
    '.card-method-print { font-size:11px; color:#444; line-height:1.5; padding:8px; background:#fafafa; border-radius:4px; margin-top:8px; }',
    '.fold-note { position:fixed; bottom:10px; right:20px; font-size:11px; color:#999; font-style:italic; }',
    '@media print { .fold-note { display:none; } body { background:white; padding:0; } .page { box-shadow:none; } }',
    '@page { size: A4 landscape; margin: 0; }'
  ].join('\n');

  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
    + '<title>' + barName + ' \u2014 Recipe Booklet</title>\n'
    + '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n'
    + '<style>\n' + _bookletCSS + '\n</style>\n</head>\n<body>\n\n'
    + '<!-- COVER -->\n'
    + '<div class="cover">'
    + '<div class="cover-title">Recipe Booklet</div>'
    + '<div class="cover-line"></div>'
    + '<div class="cover-bar">' + barName + '</div>'
    + '<div class="cover-sub">' + sorted.length + ' recipes \u00b7 ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) + '</div>'
    + '<div style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.3)">Print \u2192 Fold each page in half along the dashed line \u2192 Staple spine</div>'
    + '</div>\n\n'
    + pages
    + '\n\n<div class="fold-note">Print in A4 Landscape \u00b7 Fold along dashed line \u00b7 Staple</div>\n</body>\n</html>';

  // Open in new window
  const w = window.open('','_blank','width=1100,height=800');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>{ w.print(); }, 800);
  toast(`Booklet ready — ${sorted.length} recipes on ${Math.ceil(sorted.length/2)+1} pages`);
}

