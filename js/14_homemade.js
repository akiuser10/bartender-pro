// BartenderPro — Home-made ingredients & HM inventory
// Lines 3493–3688 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// HOME-MADE INGREDIENTS
// state.homeMade = [ { id, hmId, name, type, yieldQty, yieldUnit, density, method, lines, totalCost, costPerUnit, createdAt } ]
// ═══════════════════════════════════════════════════════

function nextHMId() {
  const existing = (state.homeMade||[]).map(h=>parseInt(h.hmId.replace('HM-',''))||0);
  const max = existing.length ? Math.max(...existing) : 0;
  return 'HM-' + String(max+1).padStart(3,'0');
}

// Returns all ingredients including home-made items for recipe dropdowns
function allIngredients() {
  const base = state.ingredients || [];
  const hm   = (state.homeMade||[]).map(h => {
    // Assign a batch-routing category based on HM type and alcohol flag
    let batchCat;
    if (h.isAlcoholic) {
      batchCat = 'hm_alcoholic'; // infusions, shrubs with alcohol → alcohol table
    } else if (['syrup','cordial','oleo'].includes(h.type)) {
      batchCat = 'hm_syrup';    // syrups → syrup section (with alcohol table)
    } else {
      batchCat = 'hm_nonalc';   // mixes, sodas, saline → juice/mixer table
    }
    return {
      id: h.id,
      desc: `[HM] ${h.name} (${h.hmId})`,
      cat: batchCat,
      hmType: h.type,
      isAlcoholic: h.isAlcoholic,
      unitSize: h.yieldQty,
      cost: h.totalCost||0,
      costPerGram: h.costPerUnit||0,
      density: h.density||1,
      abv: h.abv||0,
      isHomeMade: true,
      hmRef: h,
    };
  });
  return [...base, ...hm];
}

function hmIngById(id) {
  return allIngredients().find(x=>x.id===id);
}

function renderHomeMade() {
  const HM_CAT_LABELS = {
    all:'All', alcoholic:'🍸 Alcoholic', non_alcoholic:'🌿 Non-Alcoholic',
    infusion:'Infused Spirit', syrup:'Syrup', mix:'Pre-mix',
    shrub:'Shrub', cordial:'Cordial', puree:'Puree', bitters:'Bitters', other:'Other'
  };
  document.getElementById('hm-chips').innerHTML = HM_CATS.map(c=>
    `<div class="chip${hmFilter===c?' active':''}" onclick="hmFilter='${c}';renderHomeMade()">
      ${HM_CAT_LABELS[c]||c}</div>`).join('');

  const q = (document.getElementById('hm-search')||{}).value?.toLowerCase()||'';
  const items = (state.homeMade||[]).filter(h => {
    const typeMatch = hmFilter==='all'
      || (hmFilter==='alcoholic'    &&  h.isAlcoholic)
      || (hmFilter==='non_alcoholic'&& !h.isAlcoholic)
      || h.type===hmFilter;
    return typeMatch && (h.name.toLowerCase().includes(q)||h.hmId.toLowerCase().includes(q));
  });

  const tbody = document.getElementById('hm-tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--smoke)">No home-made items yet. Click "+ New Item" to create one.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(h => {
    const ingList = (h.lines||[]).slice(0,3).map(l=>{
      const ing = ingById(l.ingId);
      return ing ? `<span class="ing-chip" style="font-size:10px">${escHtml(ing.desc.split(' ')[0])}</span>` : '';
    }).join('') + ((h.lines||[]).length>3?`<span style="font-size:10px;color:var(--smoke)"> +${h.lines.length-3}</span>`:'');
    return `<tr>\n      <td title="${h.trackInv?'In inventory — click to remove':'Add to inventory'}">\n        <span class="inv-toggle ${h.trackInv?'active':''}" onclick="toggleHMInventory('${h.id}')">\n          <i class="fa-solid fa-${h.trackInv?'check':'plus'}"></i>\n        </span>\n      </td>
      <td><span style="font-family:monospace;color:var(--gold);font-size:12px;font-weight:700">${h.hmId}</span></td>
      <td class="td-name">
        ${escHtml(h.name)}
        <div style="font-size:10px;margin-top:2px">${h.isAlcoholic
          ? '<span style="color:var(--spirits-color,#5B9BD5);font-size:10px">🍸 Alcoholic</span>'
          : '<span style="color:var(--success);font-size:10px">🌿 Non-Alcoholic</span>'}</div>
      </td>
      <td>${hmTypeBadge(h.type)}</td>
      <td style="font-variant-numeric:tabular-nums">${h.yieldQty} ${h.yieldUnit}</td>
      <td>${ingList}</td>
      <td style="color:var(--gold);font-weight:600">${fmt(h.totalCost||0)}</td>
      <td style="color:var(--smoke);font-size:12px;font-variant-numeric:tabular-nums">${fmt(h.costPerUnit||0)} / ${h.yieldUnit}</td>
      <td>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="openHMModal('${h.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteHM('${h.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function openHMModal(id=null) {
  editHMId = id;
  const h = id ? (state.homeMade||[]).find(x=>x.id===id) : null;
  const _hmmt=document.getElementById('hm-modal-title'); if(_hmmt) _hmmt.textContent=id?'Edit Home-Made Item':'New Home-Made Item';
  const _hsv = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
  _hsv('hm-name', h?.name||'');
  _hsv('hm-type', h?.type||'syrup');
  _hsv('hm-yield-qty', h?.yieldQty||'');
  _hsv('hm-yield-unit', h?.yieldUnit||'ml');
  _hsv('hm-density', h?.density||1);
  _hsv('hm-method', h?.method||'');
  _hsv('hm-min-par', h?.minPar||0);
  _hsv('hm-track-inv', h?.trackInv!==false ? '1' : '0');
  _hsv('hm-alcoholic', h?.isAlcoholic ? '1' : '0');
  _hsv('hm-tare', h?.tare||'');
  hmIngRows = h?.lines ? h.lines.map(l=>({...l})) : [];
  renderHMIngRows();
  document.getElementById('hm-modal').classList.add('open');
}
function closeHMModal() { document.getElementById('hm-modal').classList.remove('open'); }

function addHMIngRow(ingId='',qty='',unit='g') {
  hmIngRows.push({ id:uid(), ingId, qty:parseFloat(qty)||0, unit });
  renderHMIngRows();
}

function renderHMIngRows() {
  const ingOpts = state.ingredients.map(i=>
    `<option value="${i.id}">${escHtml(i.desc)}</option>`).join('');
  document.getElementById('hm-ing-rows').innerHTML = hmIngRows.map((row,idx)=>`
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <select style="flex:2" onchange="hmIngRows[${idx}].ingId=this.value;calcHMCost()">
        <option value="">— Select ingredient —</option>${ingOpts.replace(`value="${row.ingId}"`,`value="${row.ingId}" selected`)}
      </select>
      <input type="number" style="width:80px" placeholder="qty" value="${row.qty||''}" min="0" step="0.5"
        oninput="hmIngRows[${idx}].qty=parseFloat(this.value)||0;calcHMCost()">
      <select style="width:72px" onchange="hmIngRows[${idx}].unit=this.value;calcHMCost()">
        <option value="g"${row.unit==='g'?' selected':''}>g</option>
        <option value="ml"${row.unit==='ml'?' selected':''}>ml</option>
        <option value="nos"${row.unit==='nos'?' selected':''}>nos</option>
      </select>
      <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="hmIngRows.splice(${idx},1);renderHMIngRows()"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
  calcHMCost();
}

function calcHMCost() {
  const totalCost = hmIngRows.reduce((s,line)=>{
    const ing = ingById(line.ingId); if(!ing||!line.qty) return s;
    return s + (line.unit==='ml' ? line.qty*(ing.costPerGram/(ing.density||1)) : line.qty*ing.costPerGram);
  },0);
  const yieldQty = parseFloat(document.getElementById('hm-yield-qty')?.value)||0;
  const yieldUnit = document.getElementById('hm-yield-unit')?.value||'ml';
  const costPerUnit = yieldQty>0 ? totalCost/yieldQty : 0;
  const el1 = document.getElementById('hm-total-cost');
  const el2 = document.getElementById('hm-unit-cost');
  const el3 = document.getElementById('hm-unit-label');
  if(el1) el1.textContent = fmt(totalCost);
  if(el2) el2.textContent = `${fmt(costPerUnit)} / ${yieldUnit}`;
  if(el3) el3.textContent = yieldUnit;
  return { totalCost, costPerUnit };
}

function saveHMItem() {
  const name = document.getElementById('hm-name').value.trim();
  if (!name) { toast('Enter a name'); return; }
  const { totalCost, costPerUnit } = calcHMCost();
  const yieldQty  = parseFloat(document.getElementById('hm-yield-qty').value)||0;
  const yieldUnit = document.getElementById('hm-yield-unit').value;
  const density   = parseFloat(document.getElementById('hm-density').value)||1;
  const item = {
    id: editHMId||uid(),
    hmId: editHMId ? (state.homeMade||[]).find(x=>x.id===editHMId)?.hmId||nextHMId() : nextHMId(),
    name, type: document.getElementById('hm-type').value,
    yieldQty, yieldUnit, density,
    method: document.getElementById('hm-method').value.trim(),
    minPar:   parseFloat(document.getElementById('hm-min-par')?.value)||0,
    trackInv: document.getElementById('hm-track-inv')?.value === '1',
    isAlcoholic: document.getElementById('hm-alcoholic')?.value === '1',
    tare:     parseFloat(document.getElementById('hm-tare')?.value)||0,
    lines: hmIngRows.filter(r=>r.ingId&&r.qty>0),
    totalCost, costPerUnit,
    createdAt: new Date().toISOString(),
  };
  if (!state.homeMade) state.homeMade=[];
  if (editHMId) {
    const idx = state.homeMade.findIndex(x=>x.id===editHMId);
    state.homeMade[idx] = item;
    toast('Home-made item updated');
  } else {
    state.homeMade.push(item);
    toast(`${item.hmId} — "${name}" saved`);
  }
  save(); closeHMModal(); renderHomeMade();
}

function deleteHM(id) {
  if (!confirm('Delete this home-made item? Recipes using it will show missing data.')) return;
  state.homeMade = (state.homeMade||[]).filter(x=>x.id!==id);
  saveAndSync(); renderHomeMade(); toast('Deleted — syncing…');
}
