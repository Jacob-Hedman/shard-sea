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
    abilities: { body: { base: 3, bonus: 0 }, mind: { base: 3, bonus: 0 }, reflex: { base: 3, bonus: 0 } },
    abilityStart: { body: 3, mind: 3, reflex: 3 },
    strain: 0, corruption: 0, expEarned: 500, money: 0,
    skills: [], disciplines: [], feats: [], items: [], notes: '',
  };
}

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
  return `<div class="card" style="padding:.8rem .95rem">
    <div style="display:flex;align-items:baseline;gap:.6rem">
      <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint);width:4rem">${label}</div>
      <div class="cs-num" style="font-family:var(--font-mono);font-size:1.6rem">${dv.adjusted.value}</div>
      <span class="cs-pill" style="color:var(--color-gold)">bonus +${dv.bonusVal}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.5rem">
      <div class="cs-field"><label>Base</label><input class="cs-input num" type="number" data-ab="${k}" data-p="base" value="${a.base}"></div>
      <div class="cs-field"><label>Bonus</label><input class="cs-input num" type="number" data-ab="${k}" data-p="bonus" value="${a.bonus}"></div>
      <div class="cs-field"><label>Start</label><input class="cs-input num" type="number" data-abstart="${k}" value="${char.abilityStart?.[k] ?? a.base}"></div>
    </div>
    <div class="cs-f">= ${a.base} base − ${char.strain} strain + ${a.bonus} bonus · bonus ⌊${dv.adjusted.value} ÷ 6⌋</div>
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

function itemsBlock() {
  const kindLabel: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', artifice: 'Artifice', consumable: 'Consumable', material: 'Material', generic: 'Item' };
  const rows = char.items.map((it: any, i: number) => `
    <div class="cs-eq"><div class="et">
      <span class="ek">${kindLabel[it.kind] || it.kind}</span><b>${esc(it.name)}</b>
      ${it.kind === 'armor' ? `<label class="cs-pill" style="cursor:pointer"><input type="checkbox" data-equip="${i}" ${it.equipped ? 'checked' : ''}> equipped</label>
        <span class="cs-pill">DT+ <input class="cs-input num" style="width:3.2rem;display:inline-block;padding:.1rem .3rem" type="number" data-dtplus="${i}" value="${it.dtPlus || 0}"></span>` : ''}
      <span class="cs-pill">Bulk <input class="cs-input num" style="width:3.5rem;display:inline-block;padding:.1rem .3rem" type="number" data-bulk="${i}" value="${it.bulk || 0}"></span>
      ${it.accuracy ? `<span class="cs-pill">Acc ${it.accuracy >= 0 ? '+' : ''}${it.accuracy}</span>` : ''}
      ${it.traits ? `<span class="cs-pill" style="color:var(--color-muted)">${esc(it.traits)}</span>` : ''}
      <button type="button" class="cs-roll-link" data-delitem="${i}" style="margin-left:auto;color:var(--color-nonogl)">remove</button>
    </div></div>`).join('') || '<div class="cs-eq"><span class="gov">No equipment yet.</span></div>';
  return `<div class="card" id="cs-items">${rows}</div>
    <div style="position:relative;margin-top:.5rem">
      <input class="cs-input" id="cs-item-search" placeholder="Search weapons, armor, artifice… and add" autocomplete="off">
      <div id="cs-item-res" class="card" style="position:absolute;z-index:5;left:0;right:0;margin-top:.25rem;display:none;max-height:18rem;overflow:auto"></div>
    </div>`;
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
      <div class="cs-field"><label>EXP earned</label><input class="cs-input num" type="number" data-f="expEarned" value="${char.expEarned}"></div>
      <div class="cs-field"><label>Money</label><input class="cs-input num" type="number" data-f="money" value="${char.money}"></div>
      <div class="cs-field"><label>Strain (live)</label><input class="cs-input num" type="number" data-f="strain" value="${char.strain}"></div>
      <div class="cs-field"><label>Corruption</label><input class="cs-input num" type="number" data-f="corruption" value="${char.corruption}"></div>
    </div>
    <div class="cs-eyebrow">Abilities</div>
    <div class="cs-grid" id="cs-abilities" style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))">
      ${['body', 'mind', 'reflex'].map(abilityRow).join('')}
    </div>
    <div class="cs-eyebrow">Skills — tick the ones you're trained in</div>
    <div id="cs-skills-wrap">${skillsBlock()}</div>
    <div class="cs-cols">
      <div><div class="cs-eyebrow">Disciplines</div><div id="cs-disc-wrap">${disciplinesBlock()}</div></div>
      <div><div class="cs-eyebrow">EXP</div><div class="card" style="padding:1rem 1.1rem">
        <div style="display:flex;gap:1.5rem"><div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.3rem">${d.exp.spent.value}</div><div class="cs-f" style="margin:0">Spent</div></div>
        <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.3rem;color:${d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-ogl)'}">${d.exp.remaining}</div><div class="cs-f" style="margin:0">Remaining</div></div></div>
        <div class="cs-f" style="margin-top:.5rem">abilities <b>${d.exp.breakdown.abilities.value}</b> · disciplines <b>${d.exp.breakdown.disciplines.value}</b> · tier <b>${d.exp.breakdown.tier.value}</b></div>
      </div></div>
    </div>
    <div class="cs-eyebrow">Equipment — search the codex, items go to the right section</div>
    <div id="cs-items-wrap">${itemsBlock()}</div>
    <div class="cs-eyebrow">Notes</div>
    <textarea class="cs-input" data-f="notes" rows="3" style="resize:vertical">${esc(char.notes)}</textarea>
    ${d.warnings.length ? `<div class="cs-warn">⚠ ${d.warnings.map((w: string) => esc(w)).join('<br>')}</div>` : ''}
  </div>`;
  bind();
  populateRefSelects();
}

// ---- events ----
function reRenderSkills() { document.getElementById('cs-skills-wrap')!.innerHTML = skillsBlock(); bindSkills(); }
function reRenderDisc() { document.getElementById('cs-disc-wrap')!.innerHTML = disciplinesBlock(); bindDisc(); }
function reRenderItems() { document.getElementById('cs-items-wrap')!.innerHTML = itemsBlock(); bindItems(); }

function bind() {
  // scalar fields
  mount.querySelectorAll('[data-f]').forEach((el) =>
    el.addEventListener('input', () => {
      const f = (el as HTMLElement).dataset.f!;
      const v = (el as HTMLInputElement).value;
      char[f] = ['tier', 'expEarned', 'money', 'strain', 'corruption'].includes(f) ? Number(v) || 0 : (v || (f === 'archetype' || f === 'background' ? null : ''));
      markDirty();
      if (['strain', 'tier'].includes(f)) { document.getElementById('cs-abilities')!.innerHTML = ['body', 'mind', 'reflex'].map(abilityRow).join(''); bindAbilities(); reRenderSkills(); }
    }));
  // view link
  const view = document.getElementById('cs-view') as HTMLAnchorElement;
  view.addEventListener('click', async (e) => { e.preventDefault(); await save(); if (id) location.href = `/characters/sheet?c=${id}`; });
  bindAbilities(); bindSkills(); bindDisc(); bindItems();
}

function bindAbilities() {
  mount.querySelectorAll('[data-ab]').forEach((el) =>
    el.addEventListener('input', () => {
      const k = (el as HTMLElement).dataset.ab!, p = (el as HTMLElement).dataset.p!;
      char.abilities[k][p] = Number((el as HTMLInputElement).value) || 0;
      markDirty(); reRenderSkills();
    }));
  mount.querySelectorAll('[data-abstart]').forEach((el) =>
    el.addEventListener('input', () => {
      const k = (el as HTMLElement).dataset.abstart!;
      char.abilityStart = char.abilityStart || {};
      char.abilityStart[k] = Number((el as HTMLInputElement).value) || 0;
      markDirty();
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
      markDirty(); reRenderDisc();
    }));
  document.querySelectorAll('[data-deldisc]').forEach((el) =>
    el.addEventListener('click', () => { char.disciplines.splice(Number((el as HTMLElement).dataset.deldisc), 1); markDirty(); reRenderDisc(); }));
  wireSearch('cs-disc-search', 'cs-disc-res', ['discipline'], (rec) => {
    char.disciplines.push({ slug: rec.slug, name: rec.name, skill: (rec.facets?.skill || [])[0]?.toLowerCase() || null, degree: 1 });
    markDirty(); reRenderDisc();
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
  wireSearch('cs-item-search', 'cs-item-res', EQUIP_KINDS, (rec) => {
    const st = rec.stat || {};
    char.items.push({
      id: crypto.randomUUID(), kind: rec.kind, refSlug: rec.slug, name: rec.name,
      bulk: Number(st.bulk) || 0, tier: rec.tier ?? null, qty: 1, equipped: false, dtPlus: 0,
      accuracy: Number(st.accuracy) || 0, traits: st.traits || '', damage: '',
    });
    markDirty(); reRenderItems();
  });
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
