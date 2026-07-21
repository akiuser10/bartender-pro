// BartenderPro — Ingredients CRUD & modal
// Lines 425–1495 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// INGREDIENTS
// ═══════════════════════════════════════════════════════
const ING_CATS = ['all',
  'spirits','liqueur','amaro','bitters',
  'wine_red','wine_white','wine_rose','wine_sweet',
  'sparkling','fortified_wine','aromatised_wine',
  'beer',
  'juice_fresh','juice_canned','soft_drink','water',
  'fruit','citrus','berry','vegetable','herb','spice',
  'dry_fruit','nut','seed',
  'syrup','puree','milk','coffee','other'];

function renderIngChips() {
  document.getElementById('ing-chips').innerHTML = ING_CATS.map(c =>
    `<div class="chip${state.ingFilter===c?' active':''}" onclick="state.ingFilter='${c}';renderIngredients()">
      ${CAT_LABELS[c]||c}</div>`
  ).join('');
}

let ingSelected = new Set(); // tracks selected ingredient IDs

function renderIngredients() {
  renderIngChips();
  const q = (document.getElementById('ing-search')||{}).value?.toLowerCase()||'';
  const showInvOnly = document.getElementById('ing-show-inv-only')?.checked || false;

  const ings = state.ingredients.filter(i =>
    (state.ingFilter==='all' || i.cat===state.ingFilter) &&
    (!showInvOnly || i.inInventory) &&
    (i.desc.toLowerCase().includes(q) ||
     (i.supplier||'').toLowerCase().includes(q) ||
     (i.tahweel||'').toLowerCase().includes(q))
  );

  const rows = ings.map(i => {
    const cpp      = i.costPerGram.toFixed(4);
    const cpm      = (i.costPerGram / (i.density||1)).toFixed(4);
    const checked  = ingSelected.has(i.id);
    const invActive = i.inInventory ? 'active' : '';
    const invTitle  = i.inInventory ? 'In inventory — click to remove' : 'Add to inventory';
    return `<tr class="${checked?'ing-selected':''}" style="${i.notAvailable?'opacity:0.6;background:rgba(224,82,82,0.04)':''}">
      <td><input type="checkbox" ${checked?'checked':''} style="accent-color:var(--gold);width:15px;height:15px;cursor:pointer"
        onchange="toggleIngSelect('${i.id}',this.checked)"></td>
      <td title="${invTitle}">
        <span class="inv-toggle ${invActive}" onclick="toggleIngInventory('${i.id}')">
          <i class="fa-solid fa-${i.inInventory?'check':'plus'}"></i>
        </span>
      </td>
      <td title="${i.notAvailable?'Mark as available':'Mark as not available / out of stock'}" style="cursor:pointer" onclick="toggleIngAvailable('${i.id}')">
        <span style="font-size:11px;color:${i.notAvailable?'var(--danger)':'var(--surface2)'}">
          <i class="fa-solid fa-${i.notAvailable?'ban':'circle'}"></i>
        </span>
      </td>
      <td class="td-name">${escHtml(i.desc)}</td>
      <td style="font-size:12px;color:var(--smoke)">${escHtml(i.supplier||'—')}</td>
      <td>${categoryBadge(i.cat)}</td>
      <td style="font-variant-numeric:tabular-nums">${isAnyLiquidCat(i.cat)?i.unitSize+'ml':i.unitSize+'g'}</td>
      <td style="font-variant-numeric:tabular-nums">${i.abv?i.abv+'%':'—'}</td>
      <td style="font-variant-numeric:tabular-nums;color:${i.tare?'var(--success)':'var(--smoke)'}">${i.tare?i.tare+'g':'—'}</td>
      <td style="font-variant-numeric:tabular-nums">${fmt(i.cost)}</td>
      <td style="font-variant-numeric:tabular-nums;color:var(--smoke)">${state.currency} ${isLiquidCat(i.cat)?cpm:cpp}</td>
      <td>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="editIngredient('${i.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteIngredient('${i.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('ing-tbody').innerHTML = rows ||
    `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--smoke)">No ingredients found.</td></tr>`;

  updateIngBulkBar();
}

function toggleIngSelect(id, checked) {
  if (checked) ingSelected.add(id); else ingSelected.delete(id);
  updateIngBulkBar();
  // Update row highlight
  const allRows = document.querySelectorAll('#ing-tbody tr');
  allRows.forEach(row => {
    const cb = row.querySelector('input[type=checkbox]');
    if (cb) row.classList.toggle('ing-selected', cb.checked);
  });
}

function toggleSelectAllIngs(checked) {
  const cbs = document.querySelectorAll('#ing-tbody input[type=checkbox]');
  cbs.forEach(cb => {
    cb.checked = checked;
    const id = cb.closest('tr')?.querySelector('.inv-toggle')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    // Get ID from the row's edit button
  });
  // Simpler: get IDs from filtered ingredients
  const q = (document.getElementById('ing-search')||{}).value?.toLowerCase()||'';
  const showInvOnly = document.getElementById('ing-show-inv-only')?.checked || false;
  const ings = state.ingredients.filter(i =>
    (state.ingFilter==='all' || i.cat===state.ingFilter) &&
    (!showInvOnly || i.inInventory) &&
    (i.desc.toLowerCase().includes(q) || (i.supplier||'').toLowerCase().includes(q))
  );
  if (checked) ings.forEach(i => ingSelected.add(i.id));
  else ingSelected.clear();
  renderIngredients();
}

function clearIngSelection() {
  ingSelected.clear();
  document.getElementById('ing-select-all').checked = false;
  renderIngredients();
}

function updateIngBulkBar() {
  const bar   = document.getElementById('ing-bulk-bar');
  const count = document.getElementById('ing-bulk-count');
  if (!bar) return;
  const n = ingSelected.size;
  if (n > 0) {
    bar.style.display = 'flex';
    count.textContent = n + ' selected';
  } else {
    bar.style.display = 'none';
  }
}

function toggleIngAvailable(id) {
  const ing = state.ingredients.find(x=>x.id===id);
  if (!ing) return;
  ing.notAvailable = !ing.notAvailable;
  save();
  renderIngredients();
  renderDashboard();
  toast(ing.notAvailable
    ? `⛔ ${ing.desc.split(' ').slice(0,3).join(' ')} marked as NOT AVAILABLE`
    : `✓ ${ing.desc.split(' ').slice(0,3).join(' ')} marked as available`);
}

function toggleIngInventory(id) {
  const ing = state.ingredients.find(x=>x.id===id);
  if (!ing) return;
  ing.inInventory = !ing.inInventory;
  save();
  renderIngredients();
  toast(ing.inInventory
    ? `✓ ${ing.desc.split(' ').slice(0,3).join(' ')} added to inventory`
    : `Removed from inventory`);
}

function toggleHMInventory(id) {
  const hm = (state.homeMade||[]).find(x=>x.id===id);
  if (!hm) return;
  hm.trackInv = !hm.trackInv;
  if (!state.hmInventory) state.hmInventory = {};
  if (hm.trackInv && !state.hmInventory[id]) {
    state.hmInventory[id] = { qty:0, measuredAt:'', measuredBy:'' };
  }
  save();
  renderHomeMade();
  renderInventory();
  toast(hm.trackInv
    ? `✓ ${hm.name} added to inventory`
    : `${hm.name} removed from inventory`);
}

function bulkToggleInventory(on) {
  let count = 0;
  state.ingredients.forEach(i => {
    if (ingSelected.has(i.id)) { i.inInventory = on; count++; }
  });
  save(); clearIngSelection();
  toast(`${on?'Added':'Removed'} ${count} item${count>1?'s':''} ${on?'to':'from'} inventory`);
}

function bulkDeleteIngredients() {
  const n = ingSelected.size;
  if (!n) return;
  if (!confirm(`Delete ${n} ingredient${n>1?'s':''}? Recipes using them will show missing data.`)) return;
  state.ingredients = state.ingredients.filter(i => !ingSelected.has(i.id));
  ingSelected.forEach(id => delete state.inventory[id]);
  ingSelected.clear();
  saveAndSync(); renderIngredients(); renderDashboard();
  toast(`Deleted ${n} ingredient${n>1?'s':''} — syncing…`);
}

// ── Bulk update from Excel ─────────────────────────────────────────────────
// Reads columns: Supplier Code (col D), Description (col E), Unit Size (col F),
// ABV (col G), Cost (col I) — matches existing items by supplier code, updates
// cost/unitSize/abv/density/costPerGram. New codes get added as new ingredients.
async function bulkUpdateFromExcel(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  toast('Reading Excel file…');

  try {
    const buf  = await file.arrayBuffer();
    const rows = await parseXlsxSimple(buf);
    if (!rows.length) { toast('No data found in file'); return; }

    let updated = 0, added = 0, skipped = 0;

    // Build lookup by supplier code
    const byCode = {};
    state.ingredients.forEach(i => { if (i.tahweel) byCode[i.tahweel.trim()] = i; });

    for (const row of rows) {
      const code    = String(row[3] || '').trim();   // col D = Tahweel / Supplier Code
      const desc    = String(row[4] || '').trim();   // col E = Description
      const unitRaw = parseFloat(row[5]) || 0;       // col F = ML IN BTL
      const abvRaw  = parseFloat(row[6]) || 0;       // col G = ABV%
      const costRaw = parseFloat(row[8]) || 0;       // col I = COST PER UNIT

      if (!desc) { skipped++; continue; }

      const unitSize = unitRaw > 0 ? unitRaw : 1000;
      const frac     = abvRaw > 1 ? abvRaw / 100 : abvRaw;
      const density  = frac > 0 ? round3((frac * 0.789) + ((1 - frac) * 1.0)) : undefined;

      const existing = code ? byCode[code] : null;
      if (existing) {
        // Update existing item
        existing.desc     = desc || existing.desc;
        existing.unitSize = unitSize;
        existing.abv      = abvRaw;
        if (density !== undefined) existing.density = density;
        existing.cost = costRaw;
        // Recalculate costPerGram
        const d = existing.density || 1;
        existing.costPerGram = isLiquidCat(existing.cat)
          ? round6(costRaw / (unitSize * d))
          : round6(costRaw / unitSize);
        updated++;
      } else if (code && desc) {
        // Add new ingredient (cat defaults to 'other' — user can edit)
        const d = density || 1;
        state.ingredients.push({
          id: uid(), tahweel: code, supplier: '', desc,
          cat: 'other', unitSize, abv: abvRaw, density: d, brix: 0,
          cost: costRaw, costPerGram: round6(costRaw / (unitSize * d)),
          maxPar: 0, minPar: 0, inInventory: false,
        });
        added++;
      } else {
        skipped++;
      }
    }

    save(); renderIngredients(); renderDashboard();
    toast(`Excel update: ${updated} updated · ${added} added · ${skipped} skipped`);
  } catch(e) {
    console.error(e);
    toast('Error reading Excel file. Make sure it is .xlsx format.');
  }
}

function round3(n) { return Math.round(n * 1000) / 1000; }
function round6(n) { return Math.round(n * 1000000) / 1000000; }

async function parseXlsxSimple(buf) {
  return await parseXlsxBuffer(buf);
}

function parseXlsxBuffer(buf) {
  // Unzip the XLSX (it's a ZIP)
  const bytes = new Uint8Array(buf);
  const files = unzipMinimal(bytes);

  const sharedStrXml = files['xl/sharedStrings.xml'] || '';
  const sharedStrings = parseSharedStrings(sharedStrXml);

  // Find the first sheet
  const sheetXml = files['xl/worksheets/sheet1.xml'] || '';
  if (!sheetXml) return [];

  return parseSheetXml(sheetXml, sharedStrings);
}

function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    // Extract all <t> text nodes within this <si>
    const tRe = /<t[^>]*>([^<]*)<\/t>/g;
    let tm, combined = '';
    while ((tm = tRe.exec(m[1])) !== null) {
      combined += tm[1];
    }
    strings.push(combined.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#10;/g,' '));
  }
  return strings;
}

function parseSheetXml(xml, sharedStrings) {
  const rows = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
  const valRe  = /<v>([^<]*)<\/v>/;

  let rowMatch;
  while ((rowMatch = rowRe.exec(xml)) !== null) {
    const rowData = {};
    let cellMatch;
    cellRe.lastIndex = 0;
    const rowContent = rowMatch[1];

    let inner;
    const innerRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    while ((inner = innerRe.exec(rowContent)) !== null) {
      const col   = colIndex(inner[1]);  // 0-based
      const attrs = inner[3];
      const body  = inner[4];
      const vMatch = valRe.exec(body);
      if (!vMatch) continue;
      const raw = vMatch[1];
      // t="s" means shared string index
      if (/t="s"/.test(attrs)) {
        rowData[col] = sharedStrings[parseInt(raw)] || '';
      } else {
        rowData[col] = isNaN(Number(raw)) ? raw : Number(raw);
      }
    }
    if (Object.keys(rowData).length > 0) {
      // Convert to array
      const maxCol = Math.max(...Object.keys(rowData).map(Number));
      const arr = [];
      for (let c = 0; c <= maxCol; c++) arr.push(rowData[c] !== undefined ? rowData[c] : '');
      rows.push(arr);
    }
  }
  return rows;
}

function colIndex(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) n = n * 26 + col.charCodeAt(i) - 64;
  return n - 1;
}

async function parseXlsxBuffer(buf) {
  const bytes = new Uint8Array(buf);
  const files = await unzipAsync(bytes);

  const sharedStrXml = files['xl/sharedStrings.xml'] || '';
  const sharedStrings = parseSharedStrings(sharedStrXml);

  const sheetXml = files['xl/worksheets/sheet1.xml'] || '';
  if (!sheetXml) return [];

  return parseSheetXml(sheetXml, sharedStrings);
}

async function unzipAsync(bytes) {
  const files = {};
  let i = 0;
  const tasks = [];

  while (i < bytes.length - 4) {
    if (bytes[i]===0x50 && bytes[i+1]===0x4B && bytes[i+2]===0x03 && bytes[i+3]===0x04) {
      const compression = bytes[i+8]  | (bytes[i+9]<<8);
      const compSize    = (bytes[i+18]|(bytes[i+19]<<8)|(bytes[i+20]<<16)|(bytes[i+21]<<24))>>>0;
      const uncompSize  = (bytes[i+22]|(bytes[i+23]<<8)|(bytes[i+24]<<16)|(bytes[i+25]<<24))>>>0;
      const nameLen     = bytes[i+26] | (bytes[i+27]<<8);
      const extraLen    = bytes[i+28] | (bytes[i+29]<<8);
      const name        = new TextDecoder().decode(bytes.slice(i+30, i+30+nameLen));
      const dataStart   = i + 30 + nameLen + extraLen;

      if (name.endsWith('.xml')) {
        const data = bytes.slice(dataStart, dataStart + compSize);
        if (compression === 0) {
          files[name] = new TextDecoder('utf-8').decode(data);
        } else if (compression === 8) {
          tasks.push((async () => {
            try {
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              const reader = ds.readable.getReader();
              writer.write(data);
              writer.close();
              const chunks = [];
              while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              const total = chunks.reduce((s,c)=>s+c.length,0);
              const out   = new Uint8Array(total);
              let pos = 0;
              for (const c of chunks) { out.set(c,pos); pos+=c.length; }
              files[name] = new TextDecoder('utf-8').decode(out);
            } catch(e) { files[name] = ''; }
          })());
        }
      }
      i = dataStart + compSize;
      if (compSize === 0 && uncompSize === 0) i++;
    } else {
      i++;
    }
  }

  await Promise.all(tasks);
  return files;
}



function openIngModal(id=null) {
  state.editIngId = id;
  const m = id ? state.ingredients.find(x=>x.id===id) : null;
  const _imt=document.getElementById('ing-modal-title'); if(_imt) _imt.textContent=id?'Edit Ingredient':'Add Ingredient';
  const _ingM = (id) => document.getElementById(id);
  const _sv = (id, v) => { const el=_ingM(id); if(el) el.value=v; };
  // Populate supplier dropdown before setting value
  populateSupplierDropdown(m?.supplier||'');
  _sv('ing-tahweel', m?.tahweel||'');
  _sv('ing-desc', m?.desc||'');
  _sv('ing-cat', m?.cat||'spirits');
  _sv('ing-unit-size', m?.unitSize||'');
  _sv('ing-cost', m?.cost||'');
  _sv('ing-abv', m?.abv||'');
  _sv('ing-density', m?.density||'');
  _sv('ing-brix', m?.brix||'');
  _sv('ing-tare', m?.tare||'');
  _sv('ing-full-weight', m?.fullWeight||'');
  _sv('ing-max-par', m?.maxPar||'');
  _sv('ing-min-par', m?.minPar||'');
  // Show warning if no suppliers exist yet
  const supSel = document.getElementById('ing-supplier');
  const noSupWarning = document.getElementById('no-supplier-warning');
  if (noSupWarning) {
    const hasSups = (state.suppliers||[]).length > 0 || state.ingredients.some(i=>i.supplier);
    noSupWarning.style.display = hasSups ? 'none' : 'block';
  }
  const _dh=document.getElementById('density-hint'); if(_dh) _dh.textContent='';
  const _bh=document.getElementById('brix-hint'); if(_bh) _bh.textContent='';
  updateUnitSizeLabel();
  document.getElementById('ing-modal').classList.add('open');
}
function closeIngModal() { document.getElementById('ing-modal').classList.remove('open'); }

function updateUnitSizeLabel() {
  const cat = document.getElementById('ing-cat').value;
  const lbl = document.getElementById('unit-size-label');
  if (lbl) lbl.textContent = isLiquidCat(cat) ? 'Unit Size (ml)' : 'Unit Size (g)';
}
function calcDensityFromABV() {
  const abv = parseFloat(document.getElementById('ing-abv').value);
  if (!isNaN(abv) && abv >= 0) {
    const d = abvToDensity(abv);
    const _denEl = document.getElementById('ing-density'); if(_denEl) _denEl.value = d;
    const _dh3=document.getElementById('density-hint'); if(_dh3) _dh3.textContent=`Auto: (${abv}% × 0.789) + (${(100-abv).toFixed(1)}% × 1.0) = ${d} g/ml`;
  }
}
function calcDensityFromBrix() {
  const brix = parseFloat(document.getElementById('ing-brix').value);
  if (!isNaN(brix) && brix >= 0) {
    const d = brixToDensity(brix);
    const _denEl3=document.getElementById('ing-density'); if(_denEl3) _denEl3.value=d;
    const _bh2=document.getElementById('brix-hint'); if(_bh2) _bh2.textContent=`Auto: 1 + (${brix}° × 0.004) = ${d} g/ml`;
  }
}

function saveIngredient() {
  const desc = document.getElementById('ing-desc').value.trim();
  if (!desc) { toast('Please enter a description'); return; }
  const cat = document.getElementById('ing-cat').value;
  const unitSize = parseFloat(document.getElementById('ing-unit-size').value)||1000;
  const cost = parseFloat(document.getElementById('ing-cost').value)||0;
  const abv = parseFloat(document.getElementById('ing-abv').value)||0;
  const densityInput = parseFloat(document.getElementById('ing-density').value);
  const density = isNaN(densityInput) ? abvToDensity(abv) : densityInput;
  // For liquids: unitSize is in ml → convert to grams for costPerGram
  // For food/garnish: unitSize is already in grams
  const unitSizeG = isAnyLiquidCat(cat) ? unitSize * density : unitSize;
  const costPerGram = unitSizeG > 0 ? cost / unitSizeG : 0;

  const ing = {
    id: state.editIngId || uid(),
    tahweel: document.getElementById('ing-tahweel').value.trim(),
    supplier: document.getElementById('ing-supplier').value.trim(),
    desc, cat,
    unitSize, cost, abv, density, brix: parseFloat(document.getElementById('ing-brix').value)||0,
    tare:       parseFloat(document.getElementById('ing-tare').value)||0,
    fullWeight: parseFloat(document.getElementById('ing-full-weight').value)||0,
    maxPar: parseFloat(document.getElementById('ing-max-par').value)||0,
    minPar: parseFloat(document.getElementById('ing-min-par').value)||0,
    costPerGram,
  };

  if (state.editIngId) {
    const idx = state.ingredients.findIndex(x=>x.id===state.editIngId);
    state.ingredients[idx] = ing;
    toast('Ingredient updated');
  } else {
    state.ingredients.push(ing);
    toast('Ingredient added');
  }
  save(); closeIngModal(); renderIngredients(); renderDashboard();
}

function editIngredient(id) { openIngModal(id); }
function deleteIngredient(id) {
  if (!confirm('Delete this ingredient? Recipes using it will show missing data.')) return;
  state.ingredients = state.ingredients.filter(x=>x.id!==id);
  delete state.inventory[id];
  ingSelected.delete(id);
  saveAndSync(); renderIngredients(); renderDashboard(); toast('Ingredient deleted — syncing…');
}

// ── Inventory state shape per ingredient:
const INV_CATS = ['all',
  'spirits','liqueur','amaro','bitters',
  'wine_red','wine_white','wine_rose','wine_sweet',
  'sparkling','fortified_wine','aromatised_wine',
  'beer',
  'juice_fresh','juice_canned','soft_drink','water',
  'fruit','citrus','berry','vegetable','herb','spice',
  'dry_fruit','nut','seed',
  'syrup','puree','milk','coffee','other'];

const CAT_LABELS = {
  all:'All',
  spirits:'Spirits', liqueur:'Liqueur', amaro:'Amaro', bitters:'Bitters',
  wine_red:'Red Wine', wine_white:'White Wine', wine_rose:'Rosé Wine',
  wine_sweet:'Sweet Wine', sparkling:'Sparkling', fortified_wine:'Fortified Wine',
  aromatised_wine:'Aromatised Wine',
  beer:'Beer',
  juice_fresh:'Fresh Juice', juice_canned:'Canned Juice', soft_drink:'Soft Drink',
  water:'Water',
  fruit:'Fruit', citrus:'Citrus', berry:'Berry', vegetable:'Vegetable',
  herb:'Herb', spice:'Spice', dry_fruit:'Dry Fruit', nut:'Nut', seed:'Seed',
  syrup:'Syrup', puree:'Puree', milk:'Milk/Cream', coffee:'Coffee & Tea', other:'Other'
};

// state.inventory[id] = { sealedBtls: 0, openBtls: 1, openGrams: 500 }
// Total volume:
//   sealedMl  = sealedBtls × unitSizeMl
//   openMl    = (openGrams / openBtls) × openBtls / density   ... simplified: openGrams / density
//   totalMl   = sealedMl + openMl
// But the key insight: if 2 bottles are open and user enters combined grams of all open bottles:
//   openMl = openGrams / density   (total grams of all open bottles combined ÷ density)

function getInvEntry(id) {
  const e = state.inventory[id];
  if (!e || typeof e !== 'object') {
    const old = parseFloat(e) || 0;
    return { sealedBtls:0, openBtls:1, openGrams:old, measuredBy:'', measuredAt:'' };
  }
  return { sealedBtls:0, openBtls:1, openGrams:0, measuredBy:'', measuredAt:'', ...e };
}

// Converts a gross weigh-in of a partially full container to net ml.
// When both tare (empty weight) and fullWeight (sealed/full weight) are set,
// uses the weight-ratio method: netCurrent/netFull * unitMl — this is
// calibrated against an actual full weighing, so it's accurate even when the
// liquid's real density isn't precisely known (purees, syrups, etc). Falls
// back to the density-based estimate when fullWeight isn't set.
function netMlFromWeight(grossGrams, tareGrams, fullWeightGrams, unitMl, density) {
  const netGrams = Math.max(0, grossGrams - tareGrams);
  if (fullWeightGrams > tareGrams) {
    const netFull = fullWeightGrams - tareGrams;
    return unitMl * (netGrams / netFull);
  }
  return netGrams / (density || 1);
}

function calcTotalMl(ing, entry) {
  const isLiq      = isLiquidCat(ing.cat);
  const isSealOnly = isSealedOnlyCat(ing.cat);
  const isAnyLiq   = isLiq || isSealOnly;
  const unitMl     = isAnyLiq ? ing.unitSize : (ing.unitSize / (ing.density||1));
  const sealedMl   = (entry.sealedBtls||0) * unitMl;

  if (isSealOnly) {
    // Water & soft drinks: only count sealed bottles, no open partial tracking
    return sealedMl;
  }
  if (!isLiq) {
    // Food/solid: stored in openGrams field (grams or nos)
    return entry.openGrams||0;
  }
  // Full liquid: sealed + open (with tare deduction)
  const tare       = ing.tare || 0;
  const openBtls   = Math.max(1, entry.openBtls||1);
  const grossGrams = entry.openGrams||0;
  const openMl     = netMlFromWeight(grossGrams, tare * openBtls, (ing.fullWeight||0) * openBtls, unitMl, ing.density);
  return sealedMl + openMl;
}

function calcTotalValue(ing, entry) {
  const totalMl = calcTotalMl(ing, entry);
  if (isLiquidCat(ing.cat)) return totalMl * (ing.costPerGram / (ing.density||1));
  if (isSealedOnlyCat(ing.cat)) return totalMl * (ing.costPerGram / (ing.density||1));
  // food: totalMl is already in grams (from calcTotalMl)
  return totalMl * ing.costPerGram;
}

function renderInventory() {
  document.getElementById('inv-chips').innerHTML = INV_CATS.map(c =>
    `<div class="chip${state.invFilter===c?' active':''}" onclick="state.invFilter='${c}';renderInventory()">
      ${CAT_LABELS[c]||c}</div>`
  ).join('');

  // Only show ingredients marked as inventory items
  const invIngredients = state.ingredients.filter(i => i.inInventory);

  if (!invIngredients.length) {
    document.getElementById('inv-list').innerHTML = `
      <div style="text-align:center;padding:48px 24px;color:var(--smoke)">
        <i class="fa-solid fa-box-open" style="font-size:32px;display:block;margin-bottom:12px;color:var(--surface2)"></i>
        <div style="font-size:15px;font-weight:600;color:var(--ice);margin-bottom:8px">No inventory items marked yet</div>
        <div style="font-size:13px;line-height:1.6">Go to <strong style="color:var(--gold)">Ingredients</strong> and click the
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:20px;font-size:11px">
            <i class="fa-solid fa-plus"></i> circle
          </span> next to items you want to track in inventory.
        </div>
      </div>`;
    return;
  }

  const filtered = state.invFilter === 'all'
    ? invIngredients
    : invIngredients.filter(i => i.cat === state.invFilter);

  const groups = {};
  filtered.forEach(ing => {
    if (!groups[ing.cat]) groups[ing.cat] = [];
    groups[ing.cat].push(ing);
  });

  let html = '';
  Object.entries(groups).forEach(([cat, items]) => {
    const catLabel = CAT_LABELS[cat]||cat;
    html += `<div class="inv-section-header">${catLabel}</div>`;

    items.forEach(ing => {
      const entry   = getInvEntry(ing.id);
      const isLiq      = isLiquidCat(ing.cat);
      const isSealOnly = isSealedOnlyCat(ing.cat);
      const isAnyLiq   = isLiq || isSealOnly;
      const isFood     = !isAnyLiq;
      const isNos      = isFood && ing.unitSize <= 1;
      const invUnit    = ing.cat === 'beer_keg' ? 'keg' : isAnyLiq ? 'btl' : isNos ? 'nos' : 'g';
      const unitMl     = isAnyLiq ? ing.unitSize : (ing.unitSize / (ing.density||1));
      const totalMl = calcTotalMl(ing, entry);
      // Par thresholds: liquid par is a bottle count (× ml/bottle); food par is
      // already entered directly in grams/nos, so don't scale it by package size.
      const parUnitMl = isAnyLiq ? unitMl : 1;
      const minMl   = (ing.minPar||0) * parUnitMl;
      const maxMl   = (ing.maxPar||0) * parUnitMl;
      const pctFill = maxMl > 0 ? Math.min(100, (totalMl/maxMl)*100) : 0;
      const isLow   = totalMl < minMl;
      const openBtls  = entry.openBtls||1;
      const openGrams = entry.openGrams||0;
      const sealedBtls = entry.sealedBtls||0;
      const hasData = sealedBtls > 0 || openGrams > 0;

      // Calculate bottle count as decimal
      // e.g. 1 sealed + 350ml open in 700ml bottle = 1 + 0.50 = 1.50 btl
      const tare       = ing.tare || 0;
      const netGrams   = isLiq ? Math.max(0, openGrams - (tare * openBtls)) : openGrams;
      const openMl     = isLiq ? netMlFromWeight(openGrams, tare * openBtls, (ing.fullWeight||0) * openBtls, unitMl, ing.density) : 0;
      const openBtlFraction = unitMl > 0 ? openMl / unitMl : 0; // e.g. 350ml/700ml = 0.50
      const totalBtlDecimal = sealedBtls + openBtlFraction;

      // Format: 1.50 btl, 0.25 btl etc — always 2 decimal places
      const btlDisplay = isLiq
        ? totalBtlDecimal.toFixed(2) + ' btl'
        : openGrams > 0 ? openGrams + ' g' : '—';

      const minBtl = ing.minPar || 0;
      const lowMsg = isLiq
        ? `⚠ Need ${fmtBtl(minBtl)} btl (have ${totalBtlDecimal.toFixed(2)} btl)`
        : `⚠ Below min (${minMl.toFixed(0)}g)`;

      const lastMeasured = entry.measuredAt
        ? `<span style="font-size:10px;color:var(--smoke)">Last: ${entry.measuredAt}</span>`
        : `<span style="font-size:10px;color:rgba(224,82,82,0.6)">Not yet counted</span>`;

      // Tare note for detail (shown below total)
      const tareNote = isLiq && openGrams > 0
        ? (tare > 0
            ? `${openGrams}g−${tare*openBtls}g=${netGrams}g→${openMl.toFixed(0)}ml`
            : `⚠ set tare in Ingredients`)
        : '';

      // 3 simple inputs — labels above, values below
      const isSealedOnly = isSealedOnlyCat(ing.cat);
      const inputsHtml = isFood ? `
          <div class="inv-input-col">
            <span class="inv-input-label">Qty</span>
            <input class="inv-input" type="number" min="0" step="1" placeholder="0"
              value="${openGrams||''}"
              oninput="updateInvField('${ing.id}','openGrams',this.value)">
            <span class="inv-input-unit">${invUnit}</span>
          </div>` : isSealedOnly ? `
          <div class="inv-input-col">
            <span class="inv-input-label">Sealed</span>
            <input class="inv-input" type="number" min="0" step="1" placeholder="0"
              value="${sealedBtls||''}"
              oninput="updateInvField('${ing.id}','sealedBtls',this.value)">
            <span class="inv-input-unit">btl</span>
          </div>` : `
          <div class="inv-input-col">
            <span class="inv-input-label">Sealed</span>
            <input class="inv-input" type="number" min="0" step="1" placeholder="0"
              value="${sealedBtls||''}"
              oninput="updateInvField('${ing.id}','sealedBtls',this.value)">
            <span class="inv-input-unit">${invUnit}</span>
          </div>
          <div class="inv-input-col">
            <span class="inv-input-label">Open</span>
            <input class="inv-input" type="number" min="1" step="1" placeholder="1"
              value="${openBtls||1}"
              oninput="updateInvField('${ing.id}','openBtls',this.value)">
            <span class="inv-input-unit">${invUnit}</span>
          </div>
          <div class="inv-input-col">
            <span class="inv-input-label">Gross wt</span>
            <input class="inv-input" type="number" min="0" step="1" placeholder="0"
              value="${openGrams||''}"
              oninput="updateInvField('${ing.id}','openGrams',this.value)">
            <span class="inv-input-unit">g</span>
          </div>`;

      html += `<div class="inv-row">
        <!-- LEFT: name + meta + par controls -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
            <span class="inv-name">${escHtml(ing.desc)}</span>
            ${categoryBadge(ing.cat)}
            ${isAnyLiq?`<span style="font-size:9px;color:var(--smoke)">${ing.unitSize}ml/${invUnit}</span>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:2px">
            ${entry.measuredBy?`<span class="user-tag" style="font-size:9px;padding:1px 5px"><i class="fa-solid fa-user"></i>${escHtml(entry.measuredBy)}</span>`:''}
            ${lastMeasured}
            ${isLow?`<span style="font-size:10px;color:var(--danger)">${lowMsg}</span>`:''}
            <button class="btn btn-danger-ghost btn-sm btn-icon" style="margin-left:auto;padding:1px 5px;opacity:0.4" title="Remove from inventory tracking" onclick="removeFromInventory('${ing.id}')"><i class="fa-solid fa-xmark" style="font-size:9px"></i></button>
          </div>
          <div style="display:flex;gap:3px;align-items:center;margin-top:3px">
            <span style="font-size:9px;color:var(--smoke)">Min</span>
            <input type="number" min="0" step="0.5" value="${ing.minPar||0}"
              title="Min par" onchange="updateIngPar('${ing.id}','minPar',this.value)"
              style="width:38px;background:var(--surface2);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:1px 4px;color:var(--ice);font-size:10px;outline:none;text-align:center">
            <span style="font-size:9px;color:var(--smoke)">Max</span>
            <input type="number" min="0" step="0.5" value="${ing.maxPar||0}"
              title="Max par" onchange="updateIngPar('${ing.id}','maxPar',this.value)"
              style="width:38px;background:var(--surface2);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:1px 4px;color:var(--ice);font-size:10px;outline:none;text-align:center">
            <span style="font-size:9px;color:var(--smoke)">${isAnyLiq?'btl':invUnit}</span>
          </div>
        </div>

        <!-- STOCK BAR -->
        <div style="width:40px;flex-shrink:0">
          <div class="stock-bar">
            <div class="stock-fill ${pctFill>50?'ok':pctFill>20?'warn':'low'}" style="width:${pctFill}%"></div>
          </div>
          <div class="stock-label" style="color:${isLow?'var(--danger)':hasData?'var(--smoke)':'var(--surface2)'}">
            ${isLow?'LOW':hasData?'OK':'—'}
          </div>
        </div>

        <!-- RIGHT: inputs + total -->
        <div style="display:flex;align-items:flex-end;gap:10px;flex-shrink:0">
          <div class="inv-inputs-group">
            ${inputsHtml}
          </div>
          <!-- Total display -->
          <div class="inv-total-row" id="inv-total-${ing.id}">
            ${hasData||openGrams>0 ? `
              <div class="inv-total-btl">${btlDisplay}</div>
              ${isLiq&&totalMl>0 ? `<div class="inv-total-ml">${totalMl.toFixed(0)}ml total</div>` : ''}
              ${isLiq&&tareNote ? `<div style="font-size:9px;color:var(--smoke);white-space:nowrap">${escHtml(tareNote)}</div>` : ''}
            ` : `<div class="inv-total-btl" style="color:var(--surface2)">—</div>`}
          </div>
        </div>
      </div>`;
    });
  });  if (!html) html = `<div style="text-align:center;padding:40px;color:var(--smoke)">No ingredients yet. Add ingredients first.</div>`;
  document.getElementById('inv-list').innerHTML = html;

  // ── HOME-MADE & BATCH INVENTORY ──────────────────────
  if (!state.hmInventory) state.hmInventory = {};
  const tracked = (state.homeMade||[]).filter(h => h.trackInv);
  const hmInvEl = document.getElementById('hm-inv-list');
  if (!hmInvEl) return;

  if (!tracked.length) {
    hmInvEl.innerHTML = `<div style="text-align:center;padding:32px 24px;color:var(--smoke)">
      <i class="fa-solid fa-mortar-pestle" style="font-size:28px;display:block;margin-bottom:10px;color:var(--surface2)"></i>
      <div style="font-size:14px;font-weight:600;color:var(--ice);margin-bottom:6px">No home-made items tracked yet</div>
      <div style="font-size:12px;line-height:1.6">Go to <strong style="color:var(--gold)">Home-Made</strong> tab and click the
        <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:20px;font-size:11px">
          <i class="fa-solid fa-plus"></i> circle
        </span> next to items you want to track.
      </div>
    </div>`;
    return;
  }

  hmInvEl.innerHTML = tracked.map(h => {
    if (!state.hmInventory[h.id]) state.hmInventory[h.id] = { sealedBtls:0, openBtls:1, openGrams:0, qty:0, measuredAt:'', measuredBy:'' };
    const inv     = state.hmInventory[h.id];
    const minQty  = h.minPar || 0;
    const unitMl  = h.yieldQty || 1000;
    const density = h.density || 1.0;
    const tare    = h.tare || 0;
    const fullWeight = h.fullWeight || 0;

    // Alcoholic liquid HM items → same 3-input bottle system as ingredients
    const isAlcLiq = h.isAlcoholic && h.yieldUnit === 'ml';

    let curQty, totalBtlDecimal, btlDisplay, totalMlDisp, pct;

    if (isAlcLiq) {
      const sealedBtls  = inv.sealedBtls || 0;
      const openBtls    = Math.max(1, inv.openBtls || 1);
      const openGrams   = inv.openGrams || 0;
      const openMl      = netMlFromWeight(openGrams, tare * openBtls, fullWeight * openBtls, unitMl, density);
      const openFrac    = unitMl > 0 ? openMl / unitMl : 0;
      totalBtlDecimal   = sealedBtls + openFrac;
      curQty            = Math.round(totalBtlDecimal * unitMl); // total ml
      btlDisplay        = totalBtlDecimal.toFixed(2) + ' btl';
      totalMlDisp       = curQty + 'ml';
      pct = minQty > 0 ? Math.min(100, totalBtlDecimal / minQty * 100) : (totalBtlDecimal > 0 ? 60 : 0);
    } else {
      curQty   = inv.qty || 0;
      pct      = minQty > 0 ? Math.min(100, curQty / minQty * 100) : (curQty > 0 ? 60 : 0);
      btlDisplay = curQty + ' ' + h.yieldUnit;
      totalMlDisp = '';
    }

    const isLow = minQty > 0 && (isAlcLiq ? totalBtlDecimal < minQty : curQty < minQty);
    const lowMsg = isLow
      ? `⚠ Need ${minQty} ${isAlcLiq?'btl':h.yieldUnit} (have ${isAlcLiq?totalBtlDecimal.toFixed(2)+' btl':curQty+' '+h.yieldUnit})`
      : '';

    const lastMeasured = inv.measuredAt
      ? `<span style="font-size:10px;color:var(--smoke)">Last: ${inv.measuredAt}</span>`
      : `<span style="font-size:10px;color:rgba(224,82,82,0.6)">Not yet counted</span>`;

    // Tare note for alcoholic items
    const openGrams2 = inv.openGrams || 0;
    const openBtls2  = Math.max(1, inv.openBtls||1);
    const netG2      = Math.max(0, openGrams2 - (tare * openBtls2));
    const openMl2    = isAlcLiq ? netMlFromWeight(openGrams2, tare * openBtls2, fullWeight * openBtls2, unitMl, density) : 0;
    const tareNote   = isAlcLiq && openGrams2 > 0
      ? (tare > 0
          ? `${openGrams2}g−${tare*openBtls2}g=${netG2}g→${openMl2.toFixed(0)}ml`
          : '⚠ set tare in Home-Made tab')
      : '';

    const inputsHtml = isAlcLiq ? `
      <div class="inv-input-col">
        <span class="inv-input-label">Sealed</span>
        <input class="inv-input" type="number" min="0" step="1" placeholder="0"
          value="${inv.sealedBtls||''}"
          oninput="updateHMInvField('${h.id}','sealedBtls',this.value)">
        <span class="inv-input-unit">btl</span>
      </div>
      <div class="inv-input-col">
        <span class="inv-input-label">Open</span>
        <input class="inv-input" type="number" min="1" step="1" placeholder="1"
          value="${inv.openBtls||1}"
          oninput="updateHMInvField('${h.id}','openBtls',this.value)">
        <span class="inv-input-unit">btl</span>
      </div>
      <div class="inv-input-col">
        <span class="inv-input-label">Gross wt</span>
        <input class="inv-input" type="number" min="0" step="1" placeholder="0"
          value="${inv.openGrams||''}"
          oninput="updateHMInvField('${h.id}','openGrams',this.value)">
        <span class="inv-input-unit">g</span>
      </div>` : `
      <div class="inv-input-col">
        <span class="inv-input-label">In Stock</span>
        <input class="inv-input" type="number" min="0" step="0.1" placeholder="0"
          value="${curQty||''}"
          oninput="updateHMInv('${h.id}',this.value)">
        <span class="inv-input-unit">${h.yieldUnit}</span>
      </div>`;

    const hasData = isAlcLiq
      ? ((inv.sealedBtls||0) > 0 || (inv.openGrams||0) > 0)
      : curQty > 0;

    return `<div class="inv-row">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          <span class="inv-name">${escHtml(h.name)}</span>
          <span style="font-family:monospace;color:var(--gold);font-size:11px">${h.hmId}</span>
          <span style="font-size:11px">${h.isAlcoholic?'🍸':'🌿'}</span>${hmTypeBadge(h.type)}
          ${isAlcLiq ? `<span style="font-size:9px;color:var(--smoke)">${unitMl}ml/btl</span>` : ''}
          ${isAlcLiq ? `<span style="font-size:9px;color:${tare>0?'var(--success)':'var(--warning)'}">tare:${tare>0?tare+'g':'not set'}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:2px">
          ${inv.measuredBy ? `<span class="user-tag" style="font-size:9px;padding:1px 5px"><i class="fa-solid fa-user"></i>${escHtml(inv.measuredBy)}</span>` : ''}
          ${lastMeasured}
          ${isLow ? `<span style="font-size:10px;color:var(--danger)">${lowMsg}</span>` : ''}
        </div>
        <div style="display:flex;gap:3px;align-items:center;margin-top:3px">
          <span style="font-size:9px;color:var(--smoke)">Min</span>
          <input type="number" min="0" step="${isAlcLiq?'0.5':'1'}" value="${minQty}"
            title="Min par" onchange="updateHMPar('${h.id}',this.value)"
            style="width:38px;background:var(--surface2);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:1px 4px;color:var(--ice);font-size:10px;outline:none;text-align:center">
          <span style="font-size:9px;color:var(--smoke)">${isAlcLiq ? 'btl' : h.yieldUnit}</span>
        </div>
      </div>
      <div style="width:40px;flex-shrink:0">
        <div class="stock-bar">
          <div class="stock-fill ${pct>50?'ok':pct>20?'warn':'low'}" style="width:${pct}%"></div>
        </div>
        <div class="stock-label" style="color:${isLow?'var(--danger)':hasData?'var(--smoke)':'var(--surface2)'}">
          ${isLow?'LOW':hasData?'OK':'—'}
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:10px;flex-shrink:0">
        <div class="inv-inputs-group">
          ${inputsHtml}
        </div>
        <div class="inv-total-row" id="hm-inv-total-${h.id}">
          ${hasData ? `
            <div class="inv-total-btl">${btlDisplay}</div>
            ${totalMlDisp ? `<div class="inv-total-ml">${totalMlDisp}</div>` : ''}
            ${tareNote ? `<div style="font-size:9px;color:var(--smoke);white-space:nowrap">${escHtml(tareNote)}</div>` : ''}
          ` : `<div class="inv-total-btl" style="color:var(--surface2)">—</div>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

function updateInvField(id, field, val) {
  if (!state.inventory[id] || typeof state.inventory[id] !== 'object') {
    const old = parseFloat(state.inventory[id])||0;
    state.inventory[id] = { sealedBtls:0, openBtls:1, openGrams:old, measuredBy:'', measuredAt:'' };
  }
  if (field !== '_refresh') {
    state.inventory[id][field] = parseFloat(val)||0;
    if (field === 'openBtls' && state.inventory[id].openBtls < 1) state.inventory[id].openBtls = 1;
    // A genuine physical count supersedes the "received, not yet counted" flag
    state.inventory[id].pendingRecount = false;
  }

  // stamp who measured and when (not on _refresh calls)
  if (field !== '_refresh') {
    const username = (document.getElementById('inv-username')||{}).value?.trim() || state.invUsername || '';
    if (username) {
      state.inventory[id].measuredBy = username;
      state.inventory[id].measuredAt = new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});
    }
  }

  const ing = ingById(id);
  if (!ing) return;
  const entry   = state.inventory[id];
  const isLiq      = isLiquidCat(ing.cat);
  const isSealOnly = isSealedOnlyCat(ing.cat);
  const isAnyLiq   = isLiq || isSealOnly;
  const isKeg      = ing.cat === 'beer_keg';
  const unitMl     = isAnyLiq ? ing.unitSize : (ing.unitSize/(ing.density||1));
  const totalMl    = calcTotalMl(ing, entry);
  const sealedBtls  = entry.sealedBtls||0;
  const openGrams   = entry.openGrams||0;
  const openBtls    = Math.max(1, entry.openBtls||1);
  const tare        = ing.tare||0;
  const netGrams    = Math.max(0, openGrams - (tare * openBtls));
  const openMl      = isLiq ? netMlFromWeight(openGrams, tare * openBtls, (ing.fullWeight||0) * openBtls, unitMl, ing.density) : isSealOnly ? 0 : openGrams;
  const openBtlFrac = (isLiq && unitMl > 0) ? openMl / unitMl : 0;
  const totalBtlDec = sealedBtls + openBtlFrac;
  const hasData     = sealedBtls > 0 || openGrams > 0;

  // Update the total display block
  const el = document.getElementById('inv-total-'+id);
  if (el) {
    const isNosItem = !isAnyLiq && ing.unitSize <= 1;
    const dispUnit  = isKeg ? 'keg' : isAnyLiq ? 'btl' : isNosItem ? 'nos' : 'g';
    if (!isAnyLiq) {
      el.innerHTML = openGrams > 0
        ? `<div class="inv-total-btl">${openGrams} ${dispUnit}</div>`
        : `<div class="inv-total-btl" style="color:var(--surface2)">—</div>`;
    } else if (isSealOnly) {
      el.innerHTML = sealedBtls > 0
        ? `<div class="inv-total-btl">${sealedBtls.toFixed(0)} btl</div>`
        : `<div class="inv-total-btl" style="color:var(--surface2)">—</div>`;
    } else if (hasData) {
      const tareNote = openGrams > 0
        ? (tare > 0
            ? `${openGrams}g−${tare*openBtls}g=${netGrams}g→${openMl.toFixed(0)}ml`
            : '⚠ set tare')
        : '';
      el.innerHTML = `
        <div class="inv-total-btl">${totalBtlDec.toFixed(2)} btl</div>
        ${totalMl > 0 ? `<div class="inv-total-ml">${totalMl.toFixed(0)}ml total</div>` : ''}
        ${tareNote ? `<div style="font-size:9px;color:var(--smoke);white-space:nowrap">${tareNote}</div>` : ''}
      `;
    } else {
      el.innerHTML = `<div class="inv-total-btl" style="color:var(--surface2)">—</div>`;
    }
  }
}

function updateHMInvField(id, field, val) {
  if (!state.hmInventory) state.hmInventory = {};
  if (!state.hmInventory[id]) state.hmInventory[id] = { sealedBtls:0, openBtls:1, openGrams:0, qty:0, measuredAt:'', measuredBy:'' };
  state.hmInventory[id][field] = parseFloat(val)||0;
  if (field === 'openBtls' && state.hmInventory[id].openBtls < 1) state.hmInventory[id].openBtls = 1;

  const username = (document.getElementById('inv-username')||{}).value?.trim() || state.invUsername || '';
  if (username) state.hmInventory[id].measuredBy = username;
  state.hmInventory[id].measuredAt = new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});

  // Recalculate total and update display
  const hm = (state.homeMade||[]).find(x=>x.id===id);
  if (!hm) return;
  const inv      = state.hmInventory[id];
  const unitMl   = hm.yieldQty || 1000;
  const density  = hm.density || 1.0;
  const tare     = hm.tare || 0;
  const fullWeight = hm.fullWeight || 0;
  const sealed   = inv.sealedBtls || 0;
  const openBtls = Math.max(1, inv.openBtls || 1);
  const gross    = inv.openGrams || 0;
  const netG     = Math.max(0, gross - (tare * openBtls));
  const openMl   = netMlFromWeight(gross, tare * openBtls, fullWeight * openBtls, unitMl, density);
  const openFrac = unitMl > 0 ? openMl / unitMl : 0;
  const totalBtl = sealed + openFrac;
  const totalMl  = Math.round(totalBtl * unitMl);
  // Store computed qty for dashboard/alerts
  inv.qty = totalMl;

  const el = document.getElementById('hm-inv-total-'+id);
  if (el) {
    const hasData = sealed > 0 || gross > 0;
    const tareNote = gross > 0
      ? (tare > 0 ? `${gross}g−${tare*openBtls}g=${netG}g→${openMl.toFixed(0)}ml` : '⚠ set tare')
      : '';
    el.innerHTML = hasData ? `
      <div class="inv-total-btl">${totalBtl.toFixed(2)} btl</div>
      <div class="inv-total-ml">${totalMl}ml</div>
      ${tareNote ? `<div style="font-size:9px;color:var(--smoke);white-space:nowrap">${escHtml(tareNote)}</div>` : ''}
    ` : `<div class="inv-total-btl" style="color:var(--surface2)">—</div>`;
  }
  save();
}

function updateHMInv(id, val) {
  if (!state.hmInventory) state.hmInventory = {};
  if (!state.hmInventory[id]) state.hmInventory[id] = { qty:0, measuredAt:'', measuredBy:'' };
  state.hmInventory[id].qty = parseFloat(val)||0;
  const username = (document.getElementById('inv-username')||{}).value?.trim() || state.invUsername || '';
  if (username) state.hmInventory[id].measuredBy = username;
  state.hmInventory[id].measuredAt = new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});
  save();
  // Refresh just the total row live without full re-render
  renderDashboard(); // update low stock alerts
}
function updateHMPar(id, val) {
  const hm = (state.homeMade||[]).find(x=>x.id===id);
  if (!hm) return;
  hm.minPar = parseFloat(val)||0;
  save();
}

function updateIngTare(id, val) {
  const ing = state.ingredients.find(x=>x.id===id);
  if (!ing) return;
  ing.tare = parseFloat(val)||0;
  save();
  // Refresh the total line live
  updateInvField(id, '_refresh', 0);
}

function updateIngPar(id, field, val) {
  const ing = state.ingredients.find(x=>x.id===id);
  if (!ing) return;
  ing[field] = parseFloat(val)||0;
  save();
  // Refresh bar and stock label live without full re-render
  renderDashboard();
  updateOrderBadge();
}

function saveInventory() {
  const username = (document.getElementById('inv-username')||{}).value?.trim()||'';
  if (username) state.invUsername = username;
  save();
  renderDashboard();
  updateOrderBadge();
  toast('✓ Inventory saved by ' + (username||'unknown') + ' — ' + new Date().toLocaleTimeString());
}
