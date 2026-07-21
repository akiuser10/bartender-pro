// BartenderPro — AI recipe creator tab
// Lines 2252–2402 of original bar_app.html
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// AI CREATOR
// ═══════════════════════════════════════════════════════
async function generateRecipe(fromInventory) {
  lastFromInventory = fromInventory;
  const apiKey = state.apiKey;
  if (!apiKey) {
    toast('Please add your Claude API key in Settings first');
    showScreen('settings', document.querySelector('[onclick*=settings]'));
    return;
  }

  document.getElementById('ai-loading').style.display = 'flex';
  document.getElementById('ai-result').style.display = 'none';
  document.getElementById('ai-save-btn').style.display = 'none';
  lastAiRaw = '';

  const ingList = state.ingredients.map(i => {
    const g = parseFloat(state.inventory[i.id]||0);
    const ml = g / (i.density||1);
    return `${i.desc} | ${i.cat} | ${state.currency} ${(i.costPerGram/(i.density||1)).toFixed(4)}/ml | ${state.currency} ${i.costPerGram.toFixed(4)}/g${fromInventory?' | stock:'+g.toFixed(0)+'g ('+ml.toFixed(0)+'ml)':''}`;
  }).join('\n');

  let userMsg = '';
  if (fromInventory) {
    userMsg = `Based on my current bar inventory below, suggest 2 creative beverage recipes I can make right now. Prioritise ingredients that have stock available. Current inventory:\n${ingList}\n\nUse ml for liquids, g or nos for food/garnish.`;
  } else {
    const type = document.getElementById('ai-type-select').value;
    const prompt = document.getElementById('ai-prompt').value.trim();
    if (!prompt) { toast('Please describe what you want'); document.getElementById('ai-loading').style.display='none'; return; }
    userMsg = `Create a ${type==='any'?'beverage':type} recipe: "${prompt}"\n\nAvailable ingredients for cost reference:\n${ingList}\n\nUse ml for all liquids, g or nos for food/garnish items.`;
  }

  const systemPrompt = `You are an expert bar consultant for ${state.barName}. When creating recipes, always use ml for liquid ingredients and g or nos for food/garnish items. Include exact quantities. Format your response as:

**Recipe Name:** [name]
**Type:** cocktail | mocktail | coffee | beer
**Description:** [1-2 sentences]
**Ingredients:**
- [ingredient]: [qty][unit]
- [ingredient]: [qty][unit]
**Method:** [step by step]
**Glass:** [glass type]
**Garnish:** [garnish]
**Ice:** [ice type]
**Suggested selling price (${state.currency}):** [price]

If suggesting multiple recipes, separate each with ---`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });
    const data = await resp.json();
    const text = data.content?.map(c=>c.text||'').join('') || (data.error?.message || 'No response');
    lastAiRaw = text;
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:16px 0">')
      .replace(/\n/g, '<br>');
    const _air=document.getElementById('ai-result'); if(_air) _air.innerHTML=formatted;
    document.getElementById('ai-result').style.display = 'block';
    document.getElementById('ai-save-btn').style.display = 'block';
  } catch(e) {
    const _air2b=document.getElementById('ai-result'); if(_air2b) _air2b.innerHTML=`<span style="color:var(--danger)">Error: ${e.message}. Check your API key and internet connection.</span>`;
    document.getElementById('ai-result').style.display = 'block';
  }
  document.getElementById('ai-loading').style.display = 'none';
}

async function substituteIngredient() {
  const sub = document.getElementById('sub-ingredient').value.trim();
  if (!sub) { toast('Enter an ingredient to substitute'); return; }
  const apiKey = state.apiKey;
  if (!apiKey) { toast('Add API key in Settings'); return; }
  document.getElementById('ai-loading').style.display = 'flex';
  document.getElementById('ai-result').style.display = 'none';
  const ingList = state.ingredients.map(i=>`${i.desc} (${i.cat})`).join(', ');
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model:'claude-sonnet-4-6', max_tokens:800,
        messages:[{role:'user',content:`I need to substitute "${sub}" in my bar. My available ingredients are: ${ingList}. Suggest 2-3 practical substitutes with how to adjust quantities and any flavour notes. Keep it concise.`}]
      })
    });
    const data = await resp.json();
    const text = data.content?.map(c=>c.text||'').join('')||'';
    const _air3=document.getElementById('ai-result'); if(_air3) _air3.innerHTML=text.replace(/\n/g,'<br>');
    document.getElementById('ai-result').style.display = 'block';
  } catch(e) {
    const _air4=document.getElementById('ai-result'); if(_air4) _air4.innerHTML=`<span style="color:var(--danger)">${e.message}</span>`;
    document.getElementById('ai-result').style.display = 'block';
  }
  document.getElementById('ai-loading').style.display = 'none';
}

function saveAiRecipe() {
  // parse first recipe from AI output
  const text = lastAiRaw;
  const nameMatch = text.match(/Recipe Name[:\s]+([^\n]+)/i);
  const typeMatch = text.match(/Type[:\s]+([^\n]+)/i);
  const priceMatch = text.match(/Suggested selling price[^:]*:\s*([0-9.]+)/i);
  const methodMatch = text.match(/Method[:\s]+([\s\S]*?)(?=\*\*Glass|\*\*Garnish|\*\*Ice|$)/i);
  const glassMatch = text.match(/Glass[:\s]+([^\n]+)/i);
  const garnishMatch = text.match(/Garnish[:\s]+([^\n]+)/i);
  const iceMatch = text.match(/Ice[:\s]+([^\n]+)/i);
  const ingSection = text.match(/Ingredients[:\s]*([\s\S]*?)(?=\*\*Method|\*\*Glass|$)/i);

  const name = nameMatch?.[1]?.trim().replace(/\*+/g,'') || 'AI Recipe';
  let type = 'classic';
  if (typeMatch) {
    const t = typeMatch[1].toLowerCase();
    if (t.includes('signature')) type='signature';
    else if (t.includes('classic')) type='classic';
    else if (t.includes('mocktail')) type='mocktail';
    else if (t.includes('coffee')||t.includes('tea')) type='coffee';
    else if (t.includes('beer')||t.includes('wine')) type='beer';
    else if (t.includes('cocktail')) type='classic';
  }
  const price = parseFloat(priceMatch?.[1]||0);
  const glass = glassMatch?.[1]?.trim().replace(/\*+/g,'')||'';
  const garnish = garnishMatch?.[1]?.trim().replace(/\*+/g,'')||'';
  const ice = iceMatch?.[1]?.trim().replace(/\*+/g,'')||'';
  const method = methodMatch?.[1]?.trim().replace(/\*+/g,'').replace(/\n/g,' ')||'';

  // try to match ingredient lines
  const lines = [];
  if (ingSection?.[1]) {
    const lineRx = /[-•]\s*([^:]+):\s*([\d.]+)\s*(ml|g|nos|dash|drop)/gi;
    let m;
    while ((m = lineRx.exec(ingSection[1])) !== null) {
      const ingName = m[1].trim().toLowerCase();
      const ing = state.ingredients.find(i => i.desc.toLowerCase().includes(ingName.split(' ')[0]));
      if (ing) lines.push({ id:uid(), ingId:ing.id, qty:parseFloat(m[2]), unit:m[3] });
    }
  }

  const recipe = { id:uid(), name, type, price, glass, garnish, ice, method, lines };
  state.recipes.push(recipe);
  save(); renderRecipes(); toast(`"${name}" saved to Recipe Center`);
  document.getElementById('ai-save-btn').style.display = 'none';
}
