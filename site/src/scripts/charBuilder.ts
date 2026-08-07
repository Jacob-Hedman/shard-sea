// Character builder. Edits a character document, autosaves to the KV API, and
// pulls all choices (skills, disciplines, feats, equipment) from the codex.
import { api, esc } from './charApi';
import { derive } from '../lib/character/derive.mjs';
import { SKILLS, MAX_SKILLS, PRINCIPAL_SKILLS } from '../lib/character/rules.mjs';

let char: any;
let id: string | null = null;
let mount: HTMLElement;
let saveTimer: any;
const refCache: Record<string, any[]> = {};
const EQUIP_KINDS = ['weapon', 'armor', 'artifice', 'consumable', 'material'];

function newChar() {
  return {
    name: 'New Character', tier: 1, archetype: null, background: null,
    abilities: { body: { base: 3, bonus: 0, temp: 0 }, mind: { base: 3, bonus: 0, temp: 0 }, reflex: { base: 3, bonus: 0, temp: 0 } },
    abilityStart: { body: 3, mind: 3, reflex: 3 },
    strain: { standard: 0, persistent: 0, permanent: 0 }, corruption: 0, expEarned: 500, money: 0,
    conditions: [], injuries: [], damage: 0,
    skills: [], disciplines: [], feats: [], items: [], notes: '',
    expLedger: [],
    noteSections: [
      { title: 'Background & bonds', body: '' },
      { title: 'Goals', body: '' },
      { title: 'Combat reminders', body: '' },
    ],
  };
}

const NOTE_SUGGESTIONS = ['Background & bonds', 'Goals', 'Combat reminders', 'Contacts & factions', 'Inventory & loot', 'Session log'];

async function loadIndex(kind: string): Promise<any[]> {
  if (refCache[kind]) return refCache[kind];
  try { refCache[kind] = await fetch(`/data/${kind}.index.json`).then((r) => r.json()); }
  catch { refCache[kind] = []; }
  return refCache[kind];
}

// ---- save ----
function setSaveState(s: 'saved' | 'saving' | 'dirty') {
  const el = document.getElementById('cs-save');
  if (!el) return;
  el.className = 'cs-save ' + (s === 'saved' ? 'saved' : s === 'saving' ? 'saving' : '');
  el.querySelector('.txt')!.textContent = s === 'saved' ? 'Saved' : s === 'saving' ? 'Saving…' : 'Unsaved changes';
}
function markDirty() {
  setSaveState('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 700);
}
async function save() {
  setSaveState('saving');
  try {
    if (!id) {
      const res = await api.create(char);
      id = res.id;
      history.replaceState(null, '', `?c=${id}`);
    } else {
      await api.update(id, char);
    }
    setSaveState('saved');
  } catch { setSaveState('dirty'); }
}

// ---- render ----
export async function initBuilder(el: HTMLElement) {
  mount = el;
  id = new URLSearchParams(location.search).get('c');
  if (id) {
    char = await api.get(id);
    if (char.error) { mount.innerHTML = `<p class="cs-warn">Character not found.</p>`; return; }
    // fill fields that older documents may lack, so every control has state
    for (const k of ['body', 'mind', 'reflex']) { char.abilities[k] = char.abilities[k] || { base: 0, bonus: 0, temp: 0 }; if (char.abilities[k].temp == null) char.abilities[k].temp = 0; }
    if (!Array.isArray(char.expLedger)) char.expLedger = [];
    if (!char.strain || typeof char.strain !== 'object') char.strain = { standard: Number(char.strain) || 0, persistent: 0, permanent: 0 };
    if (!Array.isArray(char.conditions)) char.conditions = [];
    if (!Array.isArray(char.injuries)) char.injuries = [];
    if (char.damage == null) char.damage = 0;
  } else {
    char = newChar();
  }
  render();
}

function abilityRow(k: string) {
  const a = char.abilities[k];
  const d = derive(char);
  const dv = d.ability[k];
  const label = k[0].toUpperCase() + k.slice(1);
  const temp = a.temp || 0;
  const pen = d.strainPenalty;
  return `<div class="card" style="padding:.8rem .95rem">
    <div style="display:flex;align-items:baseline;gap:.6rem">
      <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint);width:4rem">${label}</div>
      <div class="cs-num" style="font-family:var(--font-mono);font-size:1.6rem">${dv.adjusted.value}</div>
      <span class="cs-pill" style="color:var(--color-gold)">bonus +${dv.bonusVal}</span>
      ${temp ? `<span class="cs-pill" style="color:var(--color-gold-strong);border-color:#8a6f45">temp ${temp >= 0 ? '+' : ''}${temp}</span>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.5rem">
      <div class="cs-field"><label>Base</label><input class="cs-input num" type="number" data-ab="${k}" data-p="base" value="${a.base}"></div>
      <div class="cs-field"><label>Perm. bonus</label><input class="cs-input num" type="number" data-ab="${k}" data-p="bonus" value="${a.bonus}"></div>
      <div class="cs-field"><label>Start</label><input class="cs-input num" type="number" data-abstart="${k}" value="${char.abilityStart?.[k] ?? a.base}"></div>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:.55rem">
      <span class="lbl" style="font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;color:var(--color-gold)">Temp</span>
      <button type="button" class="cs-step" data-temp="${k}" data-d="-1">−</button>
      <span class="cs-count">${temp >= 0 ? '+' : ''}${temp}</span>
      <button type="button" class="cs-step" data-temp="${k}" data-d="1">+</button>
      ${temp ? `<button type="button" class="cs-roll-link" data-tempclear="${k}">clear</button>` : ''}
      <span class="cs-f" style="margin:0 0 0 auto">spells &amp; items — kept off your real score</span>
    </div>
    <div class="cs-f">= ${a.base} base ${a.bonus ? `+ ${a.bonus} bonus ` : ''}${temp ? `+ ${temp} temp ` : ''}${pen ? `− ${pen} strain ` : ''}· bonus ⌊${dv.adjusted.value} ÷ 6⌋ = +${dv.bonusVal}</div>
  </div>`;
}

function skillsBlock() {
  const trained = new Set(char.skills);
  const over = char.skills.length > MAX_SKILLS;
  const prin = char.skills.filter((s: string) => PRINCIPAL_SKILLS.includes(s)).length;
  const d = derive(char);
  const rows = SKILLS.map((s) => {
    const on = trained.has(s.slug);
    const sk = d.skills.find((x: any) => x.slug === s.slug);
    return `<button type="button" class="cs-skill ${on ? 'trained' : 'untrained'}" data-skill="${s.slug}">
      <span class="chk">${on ? '✓' : ''}</span>
      <span class="nm">${s.name} ${s.ability ? `<span class="gov">${s.ability}</span>` : ''} ${PRINCIPAL_SKILLS.includes(s.slug) ? '<span class="prin">principal</span>' : ''}</span>
      <span class="calc"><b>${sk.mod.value >= 0 ? '+' : ''}${sk.mod.value}</b></span>
    </button>`;
  }).join('');
  return `<div class="card" id="cs-skills">${rows}</div>
    <div class="cs-f">${char.skills.length}/${MAX_SKILLS} trained · ${prin}/2 principal${over ? ' — <span style="color:var(--color-nonogl)">over the limit</span>' : ''}. A trained skill adds your Tier to its rolls.</div>`;
}

function disciplinesBlock() {
  const rows = char.disciplines.map((dd: any, i: number) => `
    <div class="cs-eq"><div class="et">
      <b>${esc(dd.name || dd.slug)}</b>
      <span class="ctrl" style="display:flex;align-items:center;gap:.4rem;margin-left:.5rem">
        <button type="button" class="cs-step" data-deg="${i}" data-d="-1">−</button>
        <span class="cs-count">deg ${dd.degree}</span>
        <button type="button" class="cs-step" data-deg="${i}" data-d="1">+</button></span>
      <button type="button" class="cs-roll-link" data-deldisc="${i}" style="margin-left:auto;color:var(--color-nonogl)">remove</button>
    </div></div>`).join('') || '<div class="cs-eq"><span class="gov">None yet.</span></div>';
  return `<div class="card" id="cs-disc">${rows}</div>
    <div style="position:relative;margin-top:.5rem">
      <input class="cs-input" id="cs-disc-search" placeholder="Add a discipline from the codex…" autocomplete="off">
      <div id="cs-disc-res" class="card" style="position:absolute;z-index:5;left:0;right:0;margin-top:.25rem;display:none;max-height:16rem;overflow:auto"></div>
    </div>`;
}

// ---- experience: earned, auto rules-spend, and a manual XP log that moves Available ----
function xpFormulaHtml(d: any) {
  return `Rules spend <b>${d.exp.rules.value}</b> = abilities ${d.exp.breakdown.abilities.value} + disciplines ${d.exp.breakdown.disciplines.value} + tier ${d.exp.breakdown.tier.value}. Logged <b>${d.exp.ledgerSpent.value}</b>. Available = ${char.expEarned} − ${d.exp.rules.value} − ${d.exp.ledgerSpent.value}.`;
}
function xpRowsHtml() {
  return (char.expLedger || []).map((e: any, i: number) => `
    <div style="display:flex;gap:.4rem;align-items:center;padding:.3rem 0">
      <input class="cs-input" data-xp-label="${i}" value="${esc(e.label)}" placeholder="What you spent XP on…" style="flex:1;min-width:7rem">
      <input class="cs-input num" data-xp-amt="${i}" type="number" value="${e.amount}" title="XP spent (use a negative number for an award)" style="width:5.5rem">
      <button type="button" class="cs-roll-link" data-delxp="${i}" style="color:var(--color-nonogl)">✕</button>
    </div>`).join('') || '<div class="cs-f" style="color:var(--color-faint)">No entries yet — log feats, gear bought with XP, or GM awards (negative amount = award).</div>';
}
function xpBlock() {
  const d = derive(char);
  const av = d.exp.remaining;
  return `<div class="card" style="padding:1rem 1.1rem">
    <div style="display:flex;gap:1.4rem;flex-wrap:wrap;align-items:flex-end">
      <div class="cs-field" style="width:7rem"><label>EXP earned</label><input class="cs-input num" type="number" data-xp-earned value="${char.expEarned}"></div>
      <div><div class="cs-num" id="cs-xp-spent" style="font-family:var(--font-mono);font-size:1.3rem">${d.exp.spent.value}</div><div class="cs-f" style="margin:0">Spent</div></div>
      <div><div class="cs-num" id="cs-xp-avail" style="font-family:var(--font-mono);font-size:1.3rem;color:${av < 0 ? 'var(--color-nonogl)' : 'var(--color-ogl)'}">${av}</div><div class="cs-f" style="margin:0">Available</div></div>
    </div>
    <div class="cs-f" id="cs-xp-formula" style="margin-top:.4rem">${xpFormulaHtml(d)}</div>
    <div class="cs-eyebrow" style="margin:.8rem 0 .3rem">XP log — feats, gear &amp; GM awards</div>
    <div id="cs-xp-rows">${xpRowsHtml()}</div>
    <button type="button" id="cs-addxp" class="cs-copy" style="margin-top:.5rem;background:var(--color-surface-2);color:var(--color-muted)">+ Add XP entry</button>
  </div>`;
}

function itemsBlock() {
  const kindLabel: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', artifice: 'Artifice', consumable: 'Consumable', material: 'Material', generic: 'Item' };
  const rows = char.items.map((it: any, i: number) => `
    <div class="cs-eq"><div class="et">
      <span class="ek">${kindLabel[it.kind] || it.kind}</span>
      ${it.refSlug ? `<b>${esc(it.name)}</b>` : `<input class="cs-input" data-iname="${i}" value="${esc(it.name)}" style="width:11rem;padding:.15rem .4rem;font-weight:600">`}
      ${it.kind === 'armor' ? `<label class="cs-pill" style="cursor:pointer"><input type="checkbox" data-equip="${i}" ${it.equipped ? 'checked' : ''}> equipped</label>
        <span class="cs-pill">DT+ <input class="cs-input num" style="width:3.2rem;display:inline-block;padding:.1rem .3rem" type="number" data-dtplus="${i}" value="${it.dtPlus || 0}"></span>` : ''}
      <span class="cs-pill">Bulk <input class="cs-input num" style="width:3.5rem;display:inline-block;padding:.1rem .3rem" type="number" data-bulk="${i}" value="${it.bulk || 0}"></span>
      <span class="cs-pill">Qty <input class="cs-input num" style="width:3rem;display:inline-block;padding:.1rem .3rem" type="number" data-qty="${i}" value="${it.qty || 1}"></span>
      ${it.accuracy ? `<span class="cs-pill">Acc ${it.accuracy >= 0 ? '+' : ''}${it.accuracy}</span>` : ''}
      ${it.traits ? `<span class="cs-pill" style="color:var(--color-muted)">${esc(it.traits)}</span>` : ''}
      <button type="button" class="cs-roll-link" data-delitem="${i}" style="margin-left:auto;color:var(--color-nonogl)">remove</button>
    </div></div>`).join('') || '<div class="cs-eq"><span class="gov">No equipment yet.</span></div>';
  return `<div class="card" id="cs-items">${rows}</div>
    <div style="margin-top:.5rem;display:flex;gap:.5rem;align-items:flex-start">
      <div style="position:relative;flex:1">
        <input class="cs-input" id="cs-item-search" placeholder="Search weapons, armor, artifice… and add" autocomplete="off">
        <div id="cs-item-res" class="card" style="position:absolute;z-index:5;left:0;right:0;margin-top:.25rem;display:none;max-height:18rem;overflow:auto"></div>
      </div>
      <button type="button" id="cs-additem" class="cs-copy" style="background:var(--color-surface-2);color:var(--color-muted);white-space:nowrap">+ Custom item</button>
    </div>`;
}

function notesBlock() {
  if (!Array.isArray(char.noteSections)) char.noteSections = [];
  const secs = char.noteSections.map((n: any, i: number) => `
    <div class="card" style="padding:.7rem .85rem">
      <div style="display:flex;gap:.5rem;align-items:center">
        <input class="cs-input" data-note-title="${i}" value="${esc(n.title)}" style="font-weight:600;font-size:.85rem;flex:1" list="cs-note-sugg">
        <button type="button" class="cs-roll-link" data-delnote="${i}" style="color:var(--color-nonogl)">remove</button>
      </div>
      <textarea class="cs-input" data-note-body="${i}" rows="3" style="resize:vertical;margin-top:.4rem;font-size:.88rem">${esc(n.body)}</textarea>
    </div>`).join('') || '<div class="cs-eq"><span class="gov">No sections yet — add one below.</span></div>';
  return `<datalist id="cs-note-sugg">${NOTE_SUGGESTIONS.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>
    <div id="cs-notes" class="cs-cols" style="grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))">${secs}</div>
    <button type="button" id="cs-addnote" class="cs-copy" style="margin-top:.5rem;background:var(--color-surface-2);color:var(--color-muted)">+ Add note section</button>`;
}

function render() {
  const d = derive(char);
  mount.innerHTML = `<div class="csheet">
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <input class="cs-input" data-f="name" value="${esc(char.name)}" style="font-size:1.3rem;max-width:22rem;font-weight:600">
      <div id="cs-save" class="cs-save"><span class="dot"></span><span class="txt">Saved</span></div>
      <a id="cs-view" class="cs-copy" style="margin-left:auto;background:var(--color-surface-2);color:var(--color-muted)" href="#">View sheet →</a>
    </div>
    <div class="cs-eyebrow">Identity</div>
    <div class="cs-grid" style="grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))">
      <div class="cs-field"><label>Tier</label><select class="cs-select" data-f="tier">${[1, 2, 3].map((t) => `<option value="${t}" ${char.tier == t ? 'selected' : ''}>Tier ${t}</option>`).join('')}</select></div>
      <div class="cs-field"><label>Archetype</label><select class="cs-select" data-ref="archetype" data-f="archetype"><option value="">—</option></select></div>
      <div class="cs-field"><label>Background</label><select class="cs-select" data-ref="background" data-f="background"><option value="">—</option></select></div>
      <div class="cs-field"><label>Money</label><input class="cs-input num" type="number" data-f="money" value="${char.money}"></div>
    </div>
    <div class="cs-eyebrow">Abilities — Base is permanent, Temp is spells &amp; items</div>
    <div class="cs-grid" id="cs-abilities" style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))">
      ${['body', 'mind', 'reflex'].map(abilityRow).join('')}
    </div>
    <div class="cs-f" style="margin:.5rem 0 0">Strain, conditions, damage &amp; corruption are tracked live on the <b>sheet</b> during play — not here.</div>
    <div class="cs-eyebrow">Skills — tick the ones you're trained in</div>
    <div id="cs-skills-wrap">${skillsBlock()}</div>
    <div class="cs-cols">
      <div><div class="cs-eyebrow">Disciplines</div><div id="cs-disc-wrap">${disciplinesBlock()}</div></div>
      <div><div class="cs-eyebrow">Experience — earned, spent &amp; your XP log</div><div id="cs-xp-wrap">${xpBlock()}</div></div>
    </div>
    <div class="cs-eyebrow">Equipment — search the codex, items route to the right section</div>
    <div id="cs-items-wrap">${itemsBlock()}</div>
    <div class="cs-eyebrow">Notes — sectioned, shown on the sheet</div>
    <div id="cs-notes-wrap">${notesBlock()}</div>
    ${d.warnings.length ? `<div class="cs-warn">⚠ ${d.warnings.map((w: string) => esc(w)).join('<br>')}</div>` : ''}
  </div>`;
  bind();
  populateRefSelects();
}

// ---- events ----
function reRenderAbilities() { document.getElementById('cs-abilities')!.innerHTML = ['body', 'mind', 'reflex'].map(abilityRow).join(''); bindAbilities(); }
function reRenderSkills() { document.getElementById('cs-skills-wrap')!.innerHTML = skillsBlock(); bindSkills(); }
function reRenderDisc() { document.getElementById('cs-disc-wrap')!.innerHTML = disciplinesBlock(); bindDisc(); }
function reRenderItems() { document.getElementById('cs-items-wrap')!.innerHTML = itemsBlock(); bindItems(); }

function bind() {
  // scalar identity fields (tier is a select; archetype/background come from ref selects)
  mount.querySelectorAll('[data-f]').forEach((el) =>
    el.addEventListener('input', () => {
      const f = (el as HTMLElement).dataset.f!;
      const v = (el as HTMLInputElement).value;
      char[f] = ['tier', 'money'].includes(f) ? Number(v) || 0 : (v || (f === 'archetype' || f === 'background' ? null : ''));
      markDirty();
      if (f === 'tier') { reRenderAbilities(); reRenderSkills(); reRenderDisc(); refreshXpTotals(); }
    }));
  const view = document.getElementById('cs-view') as HTMLAnchorElement;
  view.addEventListener('click', async (e) => { e.preventDefault(); await save(); if (id) location.href = `/characters/sheet?c=${id}`; });
  bindAbilities(); bindSkills(); bindDisc(); bindItems(); bindNotes(); bindXp();
}

function reRenderNotes() { document.getElementById('cs-notes-wrap')!.innerHTML = notesBlock(); bindNotes(); }
function bindNotes() {
  document.querySelectorAll('[data-note-title]').forEach((el) =>
    el.addEventListener('input', () => { char.noteSections[Number((el as HTMLElement).dataset.noteTitle)].title = (el as HTMLInputElement).value; markDirty(); }));
  document.querySelectorAll('[data-note-body]').forEach((el) =>
    el.addEventListener('input', () => { char.noteSections[Number((el as HTMLElement).dataset.noteBody)].body = (el as HTMLTextAreaElement).value; markDirty(); }));
  document.querySelectorAll('[data-delnote]').forEach((el) =>
    el.addEventListener('click', () => { char.noteSections.splice(Number((el as HTMLElement).dataset.delnote), 1); markDirty(); reRenderNotes(); }));
  document.getElementById('cs-addnote')?.addEventListener('click', () => {
    char.noteSections.push({ title: 'New section', body: '' }); markDirty(); reRenderNotes();
  });
}

function bindAbilities() {
  mount.querySelectorAll('[data-ab]').forEach((el) =>
    el.addEventListener('input', () => {
      const k = (el as HTMLElement).dataset.ab!, p = (el as HTMLElement).dataset.p!;
      char.abilities[k][p] = Number((el as HTMLInputElement).value) || 0;
      markDirty(); reRenderSkills(); refreshXpTotals();
    }));
  mount.querySelectorAll('[data-abstart]').forEach((el) =>
    el.addEventListener('input', () => {
      const k = (el as HTMLElement).dataset.abstart!;
      char.abilityStart = char.abilityStart || {};
      char.abilityStart[k] = Number((el as HTMLInputElement).value) || 0;
      markDirty(); refreshXpTotals();
    }));
  mount.querySelectorAll('[data-temp]').forEach((el) =>
    el.addEventListener('click', () => {
      const k = (el as HTMLElement).dataset.temp!, dlt = Number((el as HTMLElement).dataset.d);
      char.abilities[k].temp = (Number(char.abilities[k].temp) || 0) + dlt;
      markDirty(); reRenderAbilities(); reRenderSkills();
    }));
  mount.querySelectorAll('[data-tempclear]').forEach((el) =>
    el.addEventListener('click', () => {
      char.abilities[(el as HTMLElement).dataset.tempclear!].temp = 0;
      markDirty(); reRenderAbilities(); reRenderSkills();
    }));
}

function bindSkills() {
  document.querySelectorAll('[data-skill]').forEach((el) =>
    el.addEventListener('click', () => {
      const slug = (el as HTMLElement).dataset.skill!;
      const i = char.skills.indexOf(slug);
      if (i >= 0) char.skills.splice(i, 1); else char.skills.push(slug);
      markDirty(); reRenderSkills();
    }));
}

function bindDisc() {
  document.querySelectorAll('[data-deg]').forEach((el) =>
    el.addEventListener('click', () => {
      const i = Number((el as HTMLElement).dataset.deg), dlt = Number((el as HTMLElement).dataset.d);
      char.disciplines[i].degree = Math.max(1, (char.disciplines[i].degree || 1) + dlt);
      markDirty(); reRenderDisc(); refreshXpTotals();
    }));
  document.querySelectorAll('[data-deldisc]').forEach((el) =>
    el.addEventListener('click', () => { char.disciplines.splice(Number((el as HTMLElement).dataset.deldisc), 1); markDirty(); reRenderDisc(); refreshXpTotals(); }));
  wireSearch('cs-disc-search', 'cs-disc-res', ['discipline'], (rec) => {
    char.disciplines.push({ slug: rec.slug, name: rec.name, skill: (rec.facets?.skill || [])[0]?.toLowerCase() || null, degree: 1 });
    markDirty(); reRenderDisc(); refreshXpTotals();
  });
}

function bindItems() {
  document.querySelectorAll('[data-delitem]').forEach((el) =>
    el.addEventListener('click', () => { char.items.splice(Number((el as HTMLElement).dataset.delitem), 1); markDirty(); reRenderItems(); }));
  document.querySelectorAll('[data-equip]').forEach((el) =>
    el.addEventListener('change', () => { char.items[Number((el as HTMLElement).dataset.equip)].equipped = (el as HTMLInputElement).checked; markDirty(); }));
  document.querySelectorAll('[data-dtplus]').forEach((el) =>
    el.addEventListener('input', () => { char.items[Number((el as HTMLElement).dataset.dtplus)].dtPlus = Number((el as HTMLInputElement).value) || 0; markDirty(); }));
  document.querySelectorAll('[data-bulk]').forEach((el) =>
    el.addEventListener('input', () => { char.items[Number((el as HTMLElement).dataset.bulk)].bulk = Number((el as HTMLInputElement).value) || 0; markDirty(); }));
  document.querySelectorAll('[data-qty]').forEach((el) =>
    el.addEventListener('input', () => { char.items[Number((el as HTMLElement).dataset.qty)].qty = Math.max(1, Number((el as HTMLInputElement).value) || 1); markDirty(); }));
  document.querySelectorAll('[data-iname]').forEach((el) =>
    el.addEventListener('input', () => { char.items[Number((el as HTMLElement).dataset.iname)].name = (el as HTMLInputElement).value; markDirty(); }));
  document.getElementById('cs-additem')?.addEventListener('click', () => {
    char.items.push({
      id: crypto.randomUUID(), kind: 'generic', refSlug: null, name: 'New item', bulk: 0, tier: null, qty: 1,
      equipped: false, dtPlus: 0, accuracy: 0, traits: '', damage: '', durability: '', notches: 0,
      movement_penalty: '', rating: '', activation: '', pattern: '', effects: '',
    });
    markDirty(); reRenderItems();
  });
  wireSearch('cs-item-search', 'cs-item-res', EQUIP_KINDS, (rec) => {
    const st = rec.stat || {};
    char.items.push({
      id: crypto.randomUUID(), kind: rec.kind, refSlug: rec.slug, name: rec.name,
      bulk: Number(String(st.bulk).replace(/[^\d.-]/g, '')) || 0, tier: rec.tier ?? null, qty: 1,
      equipped: rec.kind === 'armor', dtPlus: 0,
      accuracy: Number(String(st.accuracy).replace(/[^\d.-]/g, '')) || 0,
      traits: st.traits || '', damage: '',
      durability: st.durability || st.durable || '', notches: 0,
      movement_penalty: st.movement_penalty || '', rating: st.rating || '',
      activation: st.activation || '', pattern: st.pattern || '', effects: st.effects || st.special || '',
    });
    markDirty(); reRenderItems();
  });
}

// ---- XP log wiring ----
function refreshXpTotals() {
  const d = derive(char);
  const spent = document.getElementById('cs-xp-spent'); if (spent) spent.textContent = String(d.exp.spent.value);
  const avail = document.getElementById('cs-xp-avail');
  if (avail) { avail.textContent = String(d.exp.remaining); (avail as HTMLElement).style.color = d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-ogl)'; }
  const f = document.getElementById('cs-xp-formula'); if (f) f.innerHTML = xpFormulaHtml(d);
}
function reRenderXpRows() { const el = document.getElementById('cs-xp-rows'); if (el) { el.innerHTML = xpRowsHtml(); bindXpRows(); } }
function bindXpRows() {
  document.querySelectorAll('[data-xp-label]').forEach((el) =>
    el.addEventListener('input', () => { char.expLedger[Number((el as HTMLElement).dataset.xpLabel)].label = (el as HTMLInputElement).value; markDirty(); }));
  document.querySelectorAll('[data-xp-amt]').forEach((el) =>
    el.addEventListener('input', () => { char.expLedger[Number((el as HTMLElement).dataset.xpAmt)].amount = Number((el as HTMLInputElement).value) || 0; markDirty(); refreshXpTotals(); }));
  document.querySelectorAll('[data-delxp]').forEach((el) =>
    el.addEventListener('click', () => { char.expLedger.splice(Number((el as HTMLElement).dataset.delxp), 1); markDirty(); reRenderXpRows(); refreshXpTotals(); }));
}
function bindXp() {
  const earned = document.querySelector('[data-xp-earned]') as HTMLInputElement | null;
  earned?.addEventListener('input', () => { char.expEarned = Number(earned.value) || 0; markDirty(); refreshXpTotals(); });
  document.getElementById('cs-addxp')?.addEventListener('click', () => {
    (char.expLedger = char.expLedger || []).push({ label: '', amount: 0, note: '' }); markDirty(); reRenderXpRows(); refreshXpTotals();
  });
  bindXpRows();
}

// generic codex search-and-pick dropdown
async function wireSearch(inputId: string, resId: string, kinds: string[], onPick: (rec: any) => void) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const res = document.getElementById(resId) as HTMLElement;
  if (!input) return;
  const all = (await Promise.all(kinds.map(loadIndex))).flat();
  const kLabel: Record<string, string> = { weapon: 'weapon', armor: 'armor', artifice: 'artifice', consumable: 'consumable', material: 'material', discipline: 'discipline' };
  const close = () => { res.style.display = 'none'; };
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return close();
    const hits = all.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 30);
    res.innerHTML = hits.map((r) =>
      `<button type="button" class="cs-skill" data-pick='${esc(JSON.stringify({ slug: r.slug, name: r.name, kind: r.kind, tier: r.tier, stat: r.stat, facets: r.facets }))}'>
        <span class="nm">${esc(r.name)} <span class="gov">${kLabel[r.kind] || r.kind}${r.tier ? ' · T' + r.tier : ''}</span></span>
        <span class="calc" style="color:var(--color-gold)">add +</span></button>`).join('') || '<div class="cs-eq"><span class="gov">No match.</span></div>';
    res.style.display = 'block';
    res.querySelectorAll('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => { onPick(JSON.parse((b as HTMLElement).dataset.pick!)); input.value = ''; close(); }));
  });
  input.addEventListener('blur', () => setTimeout(close, 200));
}

async function populateRefSelects() {
  for (const el of Array.from(mount.querySelectorAll('[data-ref]'))) {
    const kind = (el as HTMLElement).dataset.ref!;
    const recs = await loadIndex(kind);
    const sel = el as HTMLSelectElement;
    for (const r of recs) {
      const o = document.createElement('option');
      o.value = r.slug; o.textContent = r.name;
      if (char[kind] === r.slug) o.selected = true;
      sel.appendChild(o);
    }
  }
}
