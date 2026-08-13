// Playable character sheet. Read-only for the built character (abilities, skills,
// disciplines, equipment, XP, notes) but LIVE for play-state — strain (three PHB
// types), conditions, injuries, armor notches, corruption, taxed and temporary
// ability points, money and character art are all changed here and autosaved.
// Click any skill, ability, discipline or weapon to build a copy-paste Foundry roll.
import { api, esc, openRoll } from './charApi';
import { derive } from '../lib/character/derive.mjs';
import {
  STRAIN_TYPES, DAMAGE_TYPES, BASE_DAMAGE, INJURY_SEVERITIES, CONDITION_COUNTERS,
  STACKING_CONDITIONS, weaponDamage, parseBulk, MELEE_SKILLS, RANGED_SKILLS, ratingCovers,
} from '../lib/character/rules.mjs';
import { hrefFor } from '../lib/sections';

let mount: HTMLElement;
let char: any;
let cid: string | null = null;
let saveTimer: any = null;
let saveState: 'saved' | 'saving' | 'dirty' = 'saved';
let ref: Record<string, any[]> = {};
let artBox: HTMLDialogElement | null = null;
let artEdit: HTMLDialogElement | null = null;

const EQUIP_KINDS = ['weapon', 'armor', 'artifice', 'magic_item', 'martech', 'consumable', 'material'];
const REF_KINDS = ['feat', 'threshold_feat', 'archetype', 'condition', 'action', 'skill', 'discipline',
  'background', 'fixation', ...EQUIP_KINDS];

/** Render an explained value as arithmetic you can actually read:
 *    Tier 2 + Body bonus 1 = 3
 *    Reflex 6 − Dragon Armor 4 = 2
 *  Term names are dimmed, numbers are highlighted, the result is emphasised.
 *  Previously this printed the template AND the substitution
 *  ("= Tier + permanent Body bonus = Tier 2 + permanent Body bonus 1"). */
function calcText(e: any) {
  const parts = (e.parts || []).filter((p: any) => p && p.label);
  if (!parts.length) return esc(e.formula);
  const term = (p: any, i: number) => {
    const neg = p.value < 0;
    const mag = i === 0 && !neg ? p.value : Math.abs(p.value);
    const op = i === 0 ? (neg ? '−&nbsp;' : '') : (neg ? '− ' : '+ ');
    return `${op}<span class="t">${esc(p.label)}</span> <b>${esc(mag)}</b>`;
  };
  const body = parts.map(term).join(' ');
  if (parts.length === 1) return body;
  return `${body} <span class="op">=</span> <b class="res">${esc(e.value)}</b>`;
}
const fLine = (e: any) => `<div class="cs-f cs-calc">${calcText(e)}</div>`;
const pill = (label: string, v: any) => (v != null && v !== '' && v !== 0) ? `<span class="cs-pill">${esc(label)} <b>${esc(v)}</b></span>` : '';
const abLabel = (s: any) => (s.ability ? s.ability[0].toUpperCase() + s.ability.slice(1) : 'Ability');
const numFrom = (v: any) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const isXCondition = (c: any) => /_x\b/i.test(c.name || '') || /-x$/.test(c.slug || '') || c.x != null;
const link = (kind: string, slug: string, text: string) =>
  slug ? `<a class="cs-link" href="${esc(hrefFor(kind, slug))}">${esc(text)}</a>` : esc(text);
const findRef = (kind: string, slug: string) => (ref[kind] || []).find((r: any) => r.slug === slug);

async function loadRef() {
  if (Object.keys(ref).length) return ref;
  const loaded = await Promise.all(
    REF_KINDS.map((k) => fetch(`/data/${k}.index.json`).then((r) => r.json()).catch(() => [])),
  );
  ref = Object.fromEntries(REF_KINDS.map((k, i) => [k, loaded[i]]));
  return ref;
}

/** Best attacking skill for a weapon, respecting the PHB melee/ranged split. */
function bestCombatMod(d: any, mode: string) {
  const pool = mode === 'Ranged' ? RANGED_SKILLS : mode === 'Melee' ? MELEE_SKILLS : [...MELEE_SKILLS, ...RANGED_SKILLS];
  const combat = d.skills.filter((s: any) => pool.includes(s.slug));
  return combat.reduce((best: any, s: any) => (!best || s.mod.value > best.mod.value ? s : best), null);
}

// ---- persistence -------------------------------------------------------
function setSaveState(s: typeof saveState) {
  saveState = s;
  const el = document.getElementById('cs-save');
  if (!el) return;
  el.className = 'cs-save ' + (s === 'saved' ? 'saved' : s === 'saving' ? 'saving' : '');
  const txt = el.querySelector('.txt');
  if (txt) txt.textContent = s === 'saved' ? 'Saved' : s === 'saving' ? 'Saving…' : 'Unsaved';
}
function markDirty() {
  if (!cid) return;
  saveRetries = 0;              // a fresh edit deserves a fresh set of attempts
  setSaveState('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}
let saveRetries = 0;
const MAX_SAVE_RETRIES = 5;
async function save() {
  if (!cid) return;
  clearTimeout(saveTimer); saveTimer = null;
  setSaveState('saving');
  try {
    await api.update(cid, char);
    saveRetries = 0;
    setSaveState('saved');
  } catch {
    setSaveState('dirty');
    // Retry a bounded number of times with backoff, then stop and stay visibly
    // "Unsaved" rather than hammering an endpoint that is never going to accept us.
    if (saveRetries < MAX_SAVE_RETRIES) {
      saveRetries++;
      saveTimer = setTimeout(save, 2000 * saveRetries);
    }
  }
}
/** Persist immediately — used when the page is about to go away. */
function flush() {
  if (!cid || !saveTimer) return;
  clearTimeout(saveTimer); saveTimer = null;
  try {
    navigator.sendBeacon?.(`/api/characters/${cid}`, new Blob([JSON.stringify(char)], { type: 'application/json' }));
  } catch { /* falls through to the normal save below */ }
  void save();
}

function ensureShape(c: any) {
  if (!c || typeof c !== 'object') return;
  if (!c.abilities || typeof c.abilities !== 'object') c.abilities = {};
  for (const k of ['body', 'mind', 'reflex']) {
    const a = c.abilities[k] && typeof c.abilities[k] === 'object' ? c.abilities[k] : {};
    c.abilities[k] = { base: Number(a.base) || 0, bonus: Number(a.bonus) || 0, temp: Number(a.temp) || 0, tax: Math.max(0, Number(a.tax) || 0) };
  }
  if (!c.strain || typeof c.strain !== 'object') c.strain = { standard: Number(c.strain) || 0, persistent: 0, permanent: 0 };
  for (const k of ['standard', 'persistent', 'permanent']) c.strain[k] = Math.max(0, Number(c.strain[k]) || 0);
  for (const k of ['conditions', 'injuries', 'items', 'skills', 'disciplines', 'feats', 'noteSections', 'expLedger'])
    if (!Array.isArray(c[k])) c[k] = [];
  c.corruption = Math.max(0, Number(c.corruption) || 0);
  c.money = Number(c.money) || 0;
  c.tier = Number(c.tier) || 1;
  c.height = Number(c.height) || 1.8;
  // only http(s) may reach an img src — never javascript:/data:
  c.portrait = (typeof c.portrait === 'string' && /^https?:\/\//i.test(c.portrait)) ? c.portrait : '';
}

// ---- small UI helpers --------------------------------------------------
/** ±1 buttons read as bare − / + so they look like controls, not values;
 *  bigger steps keep their magnitude ("−10", "+10"). */
const stepBtns = (attr: string, key: string, steps: number[], what = '') =>
  steps.map((n) => {
    const face = Math.abs(n) === 1 ? (n > 0 ? '+' : '−') : (n > 0 ? '+' + n : '−' + Math.abs(n));
    return `<button type="button" class="cs-step" ${attr}="${esc(key)}" data-d="${n}" aria-label="${esc((n > 0 ? 'increase ' : 'decrease ') + (what || key) + ' by ' + Math.abs(n))}">${face}</button>`;
  }).join('');
const sevClass = (sev: string) => (sev === 'Major' || sev === 'Lethal') ? 'major' : sev === 'Moderate' ? 'moderate' : '';

/** Re-hydrate equipment stats from the codex for items saved before a field existed.
 *  Characters built earlier stored no `mode`, `rating`, `movement_penalty` or
 *  `durability`, so their armor penalties and melee/ranged attack skill were wrong.
 *  Only ever FILLS blanks — a value the player typed is never overwritten. */
function healItems(c: any) {
  let healed = 0;
  for (const it of c.items) {
    if (!it.refSlug) continue;
    const rec = (ref[it.kind] || []).find((r: any) => r.slug === it.refSlug);
    if (!rec) continue;
    const st = rec.stat || {};
    const fill = (k: string, v: any) => { if ((it[k] === '' || it[k] == null) && v) { it[k] = String(v); healed++; } };
    fill('mode', st.mode); fill('weapon_group', st.weapon_group); fill('rating', st.rating);
    fill('movement_penalty', st.movement_penalty); fill('durability', st.durability || st.durable);
    fill('traits', st.traits); fill('activation', st.activation); fill('pattern', st.pattern);
    fill('effects', st.effects || st.special);
    if (!it.accuracy && st.accuracy) { it.accuracy = Number(String(st.accuracy).replace(/[^\d.-]/g, '')) || 0; healed++; }
    if (it.tier == null && rec.tier != null) { it.tier = rec.tier; healed++; }
    // codex Bulk is often a formula of Tier/Height — recompute when we never stored it
    if (!it.bulkFormula) {
      const b = parseBulk(st.bulk, Number(c.tier) || 1, Number(c.height) || 1.8);
      if (b.formula) { it.bulk = b.value; it.bulkFormula = b.formula; healed++; }
    }
  }
  return healed;
}

// ========================================================================
export async function mountSheet(el: HTMLElement, character: any, id?: string) {
  clearTimeout(saveTimer); saveTimer = null;     // never let a stale timer fire at the new character
  mount = el; char = character; cid = id || null; saveState = 'saved';
  ensureShape(char);
  await loadRef();
  if (healItems(char)) markDirty();     // persist the repair so the builder agrees
  render();
  bindLifecycle();
}

let lifecycleBound = false;
function bindLifecycle() {
  if (lifecycleBound) return;
  lifecycleBound = true;
  document.addEventListener('astro:before-preparation', flush);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

// ---- character art (portrait + lightbox + link editor) -----------------
function ensureArtDialogs() {
  if (!artBox) {
    artBox = document.createElement('dialog');
    artBox.className = 'cs-art-dialog';
    artBox.innerHTML = `<img alt="character art"><button class="cs-art-close" type="button" aria-label="close">✕</button>`;
    document.body.appendChild(artBox);
    artBox.addEventListener('click', () => artBox!.close());
  } else if (!artBox.isConnected) document.body.appendChild(artBox);
  if (!artEdit) {
    artEdit = document.createElement('dialog');
    artEdit.className = 'cs-dialog';
    artEdit.innerHTML = `<form method="dialog" class="box">
      <h3>Character art</h3>
      <div class="sub">Paste an image link — e.g. https://i.imgur.com/0TsESxm.jpg</div>
      <input class="cs-input" id="cs-art-url" placeholder="https://…" autocomplete="off">
      <p class="cs-f" id="cs-art-err"></p>
      <div style="margin-top:1rem;display:flex;gap:.5rem;justify-content:flex-end">
        <button type="button" class="cs-copy cs-copy-ghost" id="cs-art-clear" style="color:var(--color-nonogl)">Clear</button>
        <button class="cs-copy cs-copy-ghost">Cancel</button>
        <button type="button" class="cs-copy" id="cs-art-save">Save</button>
      </div></form>`;
    document.body.appendChild(artEdit);
    const doSave = () => {
      const v = (artEdit!.querySelector('#cs-art-url') as HTMLInputElement).value.trim();
      const err = artEdit!.querySelector('#cs-art-err') as HTMLElement;
      if (v && !/^https?:\/\//i.test(v)) { err.textContent = 'Only http(s) image links are allowed.'; return; }
      char.portrait = v; markDirty(); artEdit!.close(); reRender();
    };
    (artEdit.querySelector('#cs-art-save') as HTMLElement).addEventListener('click', doSave);
    (artEdit.querySelector('#cs-art-clear') as HTMLElement).addEventListener('click', () => { char.portrait = ''; markDirty(); artEdit!.close(); reRender(); });
    (artEdit.querySelector('#cs-art-url') as HTMLInputElement).addEventListener('keydown', (e: any) => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });
  } else if (!artEdit.isConnected) document.body.appendChild(artEdit);
}
function openArt() { if (!char.portrait) return openArtEdit(); ensureArtDialogs(); (artBox!.querySelector('img') as HTMLImageElement).src = char.portrait; artBox!.showModal(); }
function openArtEdit() {
  ensureArtDialogs();
  (artEdit!.querySelector('#cs-art-url') as HTMLInputElement).value = char.portrait || '';
  (artEdit!.querySelector('#cs-art-err') as HTMLElement).textContent = '';
  artEdit!.showModal();
}

// ---- header ------------------------------------------------------------
function portraitHtml(c: any) {
  const url = c.portrait || '';
  return `<div class="cs-portrait${url ? '' : ' empty'}">
    ${url
      ? `<img src="${esc(url)}" alt="${esc(c.name)}" data-art-open>
         <div class="cs-art-fallback" data-art-edit>image failed<br>tap to fix</div>`
      : `<div class="cs-art-empty" data-art-edit>＋<br>art</div>`}
    ${url ? `<button type="button" class="cs-art-edit-btn" data-art-edit title="Change image link" aria-label="Change character art link">✎</button>` : ''}
  </div>`;
}

function headerHtml(d: any, c: any) {
  const arch = c.fixation ? findRef('fixation', c.fixation) : findRef('archetype', c.archetype);
  const bg = findRef('background', c.background);
  const saveCls = saveState === 'saved' ? 'saved' : saveState === 'saving' ? 'saving' : '';
  const saveTxt = saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Unsaved';
  return `<header class="cs-head">
    ${portraitHtml(c)}
    <div class="cs-head-main">
      <h1 class="cs-name">${esc(c.name)}</h1>
      <div class="cs-chips">
        <span class="cs-pill cs-pill-gold"><b>Tier ${esc(c.tier)}</b></span>
        <span class="cs-pill">${esc(d.size)} · ${esc(d.height)} m</span>
        ${c.fixation
          ? `<span class="cs-pill cs-pill-bad">Fixated: ${link('fixation', c.fixation, arch?.name || c.fixation)}</span>`
          : c.archetype ? `<span class="cs-pill">Archetype ${link('archetype', c.archetype, arch?.name || c.archetype)}</span>` : ''}
        ${c.background ? `<span class="cs-pill">Background ${link('background', c.background, bg?.name || c.background)}</span>` : ''}
        ${cid ? `<span id="cs-save" class="cs-save ${saveCls}"><span class="dot"></span><span class="txt">${saveTxt}</span></span>` : ''}
      </div>
      ${bg?.sub ? `<div class="cs-f">${esc(bg.sub)} · invoke your Background for +1 on a related Test, once per Scene</div>` : ''}
    </div>
    <div class="cs-head-side">
      <div class="cs-money">
        <span class="cs-lbl">Money</span>
        ${stepBtns('data-money', 'm', [-10, -1], 'money')}
        <span class="cs-num cs-money-v">${esc(c.money)}</span>
        ${stepBtns('data-money', 'm', [1, 10], 'money')}
      </div>
      <div class="cs-f">Plug · Loop 10 · Sphere 100 · Globe 1000</div>
      <div class="cs-xp-mini">EXP <b class="${d.exp.remaining < 0 ? 'bad' : 'gold'}">${d.exp.remaining}</b> left / ${d.exp.earned}</div>
    </div>
  </header>`;
}

function alertsHtml(d: any) {
  const alerts: string[] = [];
  const bleeding = d.conditions.find((k: any) => /bleed/i.test(k.name || ''));
  if (bleeding) {
    const n = d.ability.body.natural;
    alerts.push(`Bleeding — Incapacitated in ${n} rounds, dead in ${2 * n} (Natural Body). First-Aid stops it.`);
  }
  const doomed = d.conditions.find((k: any) => /doomed/i.test(k.name || ''));
  if (doomed) alerts.push(`Doomed ${doomed.x ?? 1} — Major Panic at ${d.tier}, death at ${d.tier * 2}.`);
  // derive() already produces the rule-violation and play-state warnings; don't duplicate them
  return (alerts.length || d.warnings.length)
    ? `<div class="cs-warn">${[...alerts, ...d.warnings].map((w: string) => `<div>⚠ ${esc(w)}</div>`).join('')}</div>`
    : '';
}

// ---- live play panel ---------------------------------------------------
function strainCardHtml(d: any) {
  const trackRow = (t: any) => {
    const injPart = t.key === 'permanent' && d.injuryStrain ? ` +${d.injuryStrain} from injuries` : '';
    const v = char.strain[t.key];
    return `<div class="cs-track">
      <span class="cs-track-lbl"><span class="cs-mark">${t.mark}</span> ${t.label}</span>
      <span class="cs-stepper">
        ${stepBtns('data-strain', t.key, [-1], t.label + ' strain')}
        <span class="cs-count ${v ? 'on' : ''}">${v}</span>
        ${stepBtns('data-strain', t.key, [1], t.label + ' strain')}</span>
      <span class="cs-f cs-track-note">${t.sheds}${injPart}</span></div>`;
  };
  return `<div class="card cs-play-card">
    <div class="cs-lbl">Strain</div>
    <div class="cs-big-row">
      <span class="cs-num cs-big ${d.strainPenalty ? 'bad' : ''}">${d.strain}</span>
      <span class="cs-of">of <b>${d.reserve.value}</b> Reserve</span></div>
    ${fLine(d.reserve)}
    <div class="cs-f ${d.strainPenalty ? 'bad' : ''}">${d.strainPenalty
      ? `over by <b>${d.strainPenalty}</b> → all abilities &amp; derived stats −${d.strainPenalty}`
      : 'within Reserve — no penalty'}</div>
    ${STRAIN_TYPES.map(trackRow).join('')}
    <div class="cs-btn-row">
      <button type="button" class="cs-btn" data-rest="breath" title="10 minutes' inactivity: shed all Standard strain and clear all Tax">Catch breath</button>
      <button type="button" class="cs-btn" data-rest="w1" title="One Watch: shed all Standard, Persistent −Tier">Rest 1w</button>
      <button type="button" class="cs-btn" data-rest="w2" title="Two Watches: shed all Standard, half Persistent">2w</button>
      <button type="button" class="cs-btn" data-rest="w3" title="Three Watches: shed all Standard and Persistent">3w</button>
      <button type="button" class="cs-btn" data-rest="w4" title="Four Watches: as 3w, and every Injury's recovery time drops by one">4w</button>
      ${d.incapacitated && !d.overload ? `<button type="button" class="cs-btn cs-btn-gold" data-rest="wake" title="After 1d6 minutes: shed all Standard strain and all Persistent above Reserve">Wake</button>` : ''}
    </div>
    <div class="cs-f">Injury strain needs healing, not rest.</div>
  </div>`;
}

function corruptionCardHtml(d: any) {
  const band = d.corruption.band;
  const chip = (k: string) => `<span class="cs-sev ${band === k ? (k === 'Morbid' || k === 'Terminal' ? 'major' : 'moderate') : ''}">${k}</span>`;
  return `<div class="card cs-play-card">
    <div class="cs-lbl">Corruption</div>
    <div class="cs-big-row">
      <span class="cs-stepper">
        ${stepBtns('data-corr', 'c', [-1], 'corruption')}
        <span class="cs-num cs-big ${d.corruption.terminal ? 'bad' : ''}">${d.corruption.value}</span>
        ${stepBtns('data-corr', 'c', [1], 'corruption')}</span>
      <span class="cs-of">scale <b>${esc(band)}</b></span></div>
    <div class="cs-ladder cs-scale" title="Clear 0–5 · Dark 6–11 · Morbid 12–17 · Terminal 18+">
      ${chip('Clear')}${chip('Dark')}${chip('Morbid')}${chip('Terminal')}</div>
    <div class="cs-lbl cs-sub">Dice pools</div>
    <div class="cs-pool">
      <span><b>${d.panic.minor}</b><small>panic minor</small></span>
      <span><b>${d.panic.moderate}</b><small>moderate</small></span>
      <span><b>${d.panic.major}</b><small>major</small></span>
      <span class="sep"><b>${d.corruption.pool}</b><small>corruption</small></span>
    </div>
    <div class="cs-f">Panic pools already cut by your Mind bonus <b>${d.ability.mind.bonusVal}</b> (min 1).
      Each 6 rolled Panics you; on a Corruption roll each 6 is +1 Corruption.</div>
    ${char.fixation ? `<div class="cs-f">Depravity <b>${d.corruption.depravity}</b> — 1 + one per six Corruption</div>` : ''}
  </div>`;
}

/** PHB-correct damage resolution: each instance either notches Rated armor or
 *  triggers one Injury Risk roll. There is no accumulating damage pool. */
function damageCardHtml(d: any) {
  const armor = (d.byKind.armor || []).filter((a: any) => a.equipped);
  return `<div class="card cs-play-card">
    <div class="cs-lbl">Take damage</div>
    <div class="cs-dmg-form">
      <input class="cs-input num" id="cs-dmg-n" type="number" value="1" min="0" aria-label="damage amount">
      <select class="cs-select" id="cs-dmg-type" aria-label="damage type">
        ${DAMAGE_TYPES.map((t) => `<option value="${esc(t)}">${esc(cap(t))} (base ${BASE_DAMAGE[t]})</option>`).join('')}
      </select>
    </div>
    <div class="cs-btn-row">
      ${armor.length
        ? armor.map((a: any) => `<button type="button" class="cs-btn" data-absorb="${esc(a.id)}">Notch ${esc(a.name)}</button>`).join('')
        : `<span class="cs-f">No armor equipped.</span>`}
      <button type="button" class="cs-btn cs-btn-gold" id="cs-dmg-injure">Injury Risk →</button>
    </div>
    ${armor.map((a: any) => {
      const dur = numFrom(a.durability);
      const broken = dur > 0 && (a.notches || 0) > dur;
      return `<div class="cs-f cs-armorline"><span class="t">${esc(a.name)}</span> negates <b>${esc(a.rating || '—')}</b>
        · notches <b>${a.notches || 0}</b>${dur ? `/${dur}` : ''}${broken ? ' <b class="bad">BROKEN</b>' : ''}</div>`;
    }).join('')}
    <details class="cs-mini"><summary>how damage resolves</summary>
      <div class="cs-f">Armor Rated for the type negates it and takes Notches equal to the Damage; past its
        Durability it Breaks and you take the rest. Otherwise roll 2d6 on that type's
        <a class="cs-link" href="/damage">Injury Risk table</a> — the Injury carries Permanent Strain equal to the Damage.</div>
    </details>
  </div>`;
}

function conditionsCardHtml(d: any) {
  const rows = d.conditions.map((k: any, i: number) => {
    const counter = CONDITION_COUNTERS[(k.slug || '') as keyof typeof CONDITION_COUNTERS];
    return `<div class="cs-eq cs-cond-row">
      <div class="et">
        <span class="cs-sev ${sevClass(k.severity)}">${esc(k.severity || '—')}</span>
        <b>${k.slug ? link('condition', k.slug, k.name) : esc(k.name)}</b>
        ${isXCondition(k) ? `<span class="cs-xctl">${stepBtns('data-condx', String(i), [-1], k.name)}<span class="cs-count">${k.x ?? 1}</span>${stepBtns('data-condx', String(i), [1], k.name)}</span>` : ''}
        <button type="button" class="cs-x" data-delcond="${i}" aria-label="remove ${esc(k.name)}">✕</button>
      </div>
      ${k.effects ? `<div class="cs-f cs-eff">${esc(k.effects)}</div>` : ''}
      ${counter ? `<div class="cs-f">Ends with: ${esc(counter)}</div>` : ''}
    </div>`;
  }).join('') || '<div class="cs-f cs-empty">No conditions active.</div>';
  const opts = (ref.condition || []).map((k: any) => `<option value="${esc(k.slug)}">${esc(k.name)} · ${esc(k.sub || '')}</option>`).join('');
  return `<div class="card">
    <div class="cs-lbl cs-card-pad">Conditions</div>
    ${rows}
    <div class="cs-add-row">
      <select class="cs-select" id="cs-cond-pick" aria-label="condition to add">${opts}</select>
      <button type="button" class="cs-btn cs-btn-gold" id="cs-cond-add">+ Add</button></div>
    <div class="cs-f cs-card-pad" id="cs-cond-eff"></div></div>`;
}

function injuriesCardHtml(d: any) {
  const rows = d.injuries.map((inj: any, i: number) => `
    <div class="cs-eq">
      <div class="et">
        <span class="cs-sev ${sevClass(inj.severity)}">${esc(inj.severity)}</span>
        <b>${esc(inj.name)}</b>
        <span class="cs-pill">+${inj.strain} permanent strain</span>
        <button type="button" class="cs-x" data-delinj="${i}" aria-label="remove ${esc(inj.name)}">✕</button>
      </div>
      <div class="cs-f">Removed by ${esc(inj.removal)}${inj.infectionDays != null ? ` · untreated: dead in ${inj.infectionDays} days (systemic infection)` : ''}</div>
      <input class="cs-input cs-note-in" data-injnote="${i}" value="${esc(inj.note)}" placeholder="note (location, infected, GM ruling…)">
    </div>`).join('') || '<div class="cs-f cs-empty">No injuries.</div>';
  return `<div class="card">
    <div class="cs-lbl cs-card-pad">Injuries — each adds Permanent Strain</div>
    ${rows}
    <div class="cs-add-row">
      <select class="cs-select cs-sev-sel" id="cs-inj-sev" aria-label="injury severity">${INJURY_SEVERITIES.map((s) => `<option>${s}</option>`).join('')}</select>
      <input class="cs-input" id="cs-inj-name" placeholder="Injury (e.g. Gash)" aria-label="injury name">
      <input class="cs-input num cs-inj-strain" id="cs-inj-strain" type="number" value="1" aria-label="permanent strain">
      <button type="button" class="cs-btn cs-btn-gold" id="cs-inj-add">+ Add</button></div></div>`;
}

// ---- abilities & vitals -------------------------------------------------
function abilitiesHtml(d: any) {
  return ['body', 'mind', 'reflex'].map((k) => {
    const a = d.ability[k];
    return `<div class="cs-ab card">
      <div class="cs-lbl">${a.label}</div>
      <div class="val cs-num">${a.adjusted.value}</div><div class="bonus">+${a.bonusVal}</div>
      ${fLine(a.adjusted)}
      <div class="cs-f"><b>+${a.bonusVal}</b> to Skills = ⌊${a.adjusted.value} ÷ 6⌋${a.base !== a.adjusted.value ? ` · Threshold Feats use Base <b>${a.base}</b>` : ''}</div>
      <div class="cs-ab-ctl">
        <span class="cs-lbl cs-lbl-gold">Temp</span>
        ${stepBtns('data-atemp', k, [-1], a.label + ' temp')}<span class="cs-count">${a.temp >= 0 ? '+' : ''}${a.temp}</span>${stepBtns('data-atemp', k, [1], a.label + ' temp')}
      </div>
      <div class="cs-ab-ctl">
        <span class="cs-lbl">Tax</span>
        ${stepBtns('data-atax', k, [-1], a.label + ' tax')}<span class="cs-count">${a.tax}</span>${stepBtns('data-atax', k, [1], a.label + ' tax')}
        <button class="cs-roll-link" data-roll="ability" data-a="${k}">⚄ check</button>
      </div>
      <div class="cs-f">Tax −1 to auto-succeed a related Test; cleared by Catching your Breath.</div>
    </div>`;
  }).join('');
}

function vitalsHtml(d: any) {
  const encPct = Math.max(0, Math.min(100, d.maxEnc.value ? Math.round((d.carried / d.maxEnc.value) * 100) : (d.carried ? 100 : 0)));
  return `
    <div class="cs-vital card"><div class="cs-lbl">Movement</div>
      <div class="v cs-num">${d.movement.value} <small>m</small></div>${fLine(d.movement)}
      <div class="cs-ladder">${d.speeds.map((s: any) => `<span class="cs-sev">${esc(s.label)} ${s.value}</span>`).join('')}</div></div>
    <div class="cs-vital card"><div class="cs-lbl">Initiative</div>
      <div class="v cs-num">${d.initiative.value}</div>${fLine(d.initiative)}
      <div class="cs-f">Highest goes first · ties Reflex → Body → Mind</div></div>
    <div class="cs-vital card"><div class="cs-lbl">AP / turn</div>
      <div class="v cs-num">${d.ap.value}</div>${fLine(d.ap)}
      <div class="cs-f">Spare AP carries for Reactions; excess is lost</div></div>
    <div class="cs-vital card"><div class="cs-lbl">Encumbrance</div>
      <div class="v cs-num">${d.maxEnc.value} <small class="cs-num">· ${d.carried} carried</small></div>${fLine(d.maxEnc)}
      <div class="cs-bar ${d.penalty ? 'over' : ''}"><span style="width:${encPct}%"></span></div>
      <div class="cs-f">push ${d.push.value} · lift ${d.lift.value}${d.penalty ? ` · <b class="bad">over by ${d.penalty}</b>` : ''}</div></div>
    <div class="cs-vital card"><div class="cs-lbl">Weight</div>
      <div class="v cs-num">${d.weight.value}</div>${fLine(d.weight)}
      <div class="cs-f">${esc(d.size)} — armor Bulk counts toward Weight</div></div>
    <div class="cs-vital card"><div class="cs-lbl">Defenses — what an attacker must beat</div>
      <div class="cs-def-grid">${d.defenses.map((x: any) => `
        <div class="cs-def ${x.trained ? '' : 'gap'}">
          <span class="cs-def-dc cs-num">${x.dc}</span>
          <span class="cs-def-nm">${esc(x.name)}<small>${esc(x.mode)}${x.trained ? '' : ' · gap'}</small></span>
        </div>`).join('')}</div>
      <div class="cs-f">8 + Tier, +Tier again where you are trained</div></div>`;
}

// ---- skills, disciplines, feats -----------------------------------------
function skillsHtml(d: any) {
  return d.skills.map((s: any, i: number) => {
    const rec = findRef('skill', s.slug);
    return `<button class="cs-skill ${s.trained ? 'trained' : 'untrained'}" data-roll="skill" data-i="${i}">
      <span class="chk" aria-hidden="true">${s.trained ? '✓' : ''}</span>
      <span class="nm"><span class="nm-t">${esc(s.name)}</span> <span class="gov">${abLabel(s)}</span>
        ${s.principal ? `<span class="prin">${esc(s.mode)}</span>` : ''}</span>
      <span class="calc"><b>${s.mod.value >= 0 ? '+' : ''}${s.mod.value}</b>
        <span class="gov">${s.trained ? `T${d.tier}+${s.abilityBonus}` : `${s.abilityBonus} untr.`}</span><span class="die" aria-hidden="true">⚄</span></span>
      ${rec?.desc ? `<span class="cs-f cs-skill-desc">${esc(rec.desc)}</span>` : ''}
    </button>`;
  }).join('');
}

function discHtml(d: any) {
  const featsFor = (discName: string, degree: number) => (ref.feat || [])
    .filter((f: any) => (f.facets?.discipline || [])[0] === discName && (f.feat_tier ?? 99) <= degree)
    .sort((a: any, b: any) => (a.feat_tier || 0) - (b.feat_tier || 0));
  if (!d.disciplines.length) return '<div class="cs-f cs-empty">No disciplines yet.</div>';
  return d.disciplines.map((dd: any, i: number) => {
    const fs = featsFor(dd.name, dd.degree);
    return `<div class="cs-eq">
      <div class="et"><b>${dd.slug ? link('discipline', dd.slug, dd.name) : esc(dd.name)}</b>
        <span class="cs-pill cs-pill-gold">${esc(dd.rank)} · degree ${dd.degree}</span>
        ${dd.skill ? `<span class="cs-pill">${esc(cap(dd.skill))}</span>` : ''}
        <button class="cs-roll-link" data-roll="disc" data-i="${i}">⚄ specialized</button>
        <span class="cs-f cs-right">cost ${dd.cost.value} = ${esc(dd.cost.formula)}</span></div>
      ${fs.length ? `<div class="cs-featlist">${fs.map((f: any) => `
        <div class="cs-feat">
          <div class="cs-feat-h"><b>${f.slug ? link('feat', f.slug, f.name) : esc(f.name)}</b>
            <span class="cs-pill">T${esc(f.feat_tier)}</span>
            ${f.ap ? `<span class="cs-pill">AP ${esc(f.ap)}</span>` : ''}
            ${f.qualities ? `<span class="cs-pill">${esc(f.qualities)}</span>` : ''}</div>
          <div class="cs-f cs-eff">${esc(f.effect || f.desc || '')}</div></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function thresholdHtml(d: any) {
  const out: string[] = [];
  for (const a of ['body', 'mind', 'reflex']) {
    const base = d.ability[a].base;               // Threshold FEATS gate on BASE alone…
    const reached = d.ability[a].adjusted.value;  // …while the +Skill bonus uses the full (buffed) value
    for (const step of [6, 12, 18]) {
      const tf = (ref.threshold_feat || []).find((t: any) => (t.ability || '').toLowerCase() === a && Number(t.threshold) === step);
      if (!tf) continue;
      const name = tf.slug ? link('threshold_feat', tf.slug, tf.name) : esc(tf.name);
      if (base >= step) {
        out.push(`<div class="cs-feat cs-feat-thr">
          <div class="cs-feat-h"><b>${name}</b> <span class="cs-pill">${cap(a)} ${step}</span></div>
          <div class="cs-f cs-eff">${esc(tf.effect || tf.desc || '')}</div></div>`);
      } else if (reached >= step) {
        // A permanent/temporary bonus pushed the value over this Threshold, but the FEAT
        // needs Base — so it's shown locked (the Skill bonus still applies).
        out.push(`<div class="cs-feat cs-feat-thr cs-feat-locked">
          <div class="cs-feat-h"><b>${name}</b> <span class="cs-pill">${cap(a)} ${step}</span>
            <span class="cs-pill cs-pill-mute">locked · needs Base ${step}</span></div>
          <div class="cs-f cs-eff">Your ${cap(a)} reaches ${step} only with bonuses (Base <b>${base}</b>), so you gain the <b>+${d.ability[a].bonusVal}</b> Skill bonus but <b>not</b> this Feat.</div></div>`);
      }
    }
  }
  return out;
}

function otherFeatsHtml(d: any) {
  const list = d.char.feats || [];
  if (!list.length) return '';
  return `<div class="cs-eyebrow">Other feats</div><div class="card cs-card-pad">${list.map((f: any) => {
    const rec = f.slug ? findRef('feat', f.slug) : null;
    return `<div class="cs-feat">
      <div class="cs-feat-h"><b>${f.slug ? link('feat', f.slug, f.name || rec?.name || f.slug) : esc(f.name)}</b>
        <span class="cs-pill">${esc(f.source || 'manual')}</span></div>
      ${rec?.effect || rec?.desc ? `<div class="cs-f cs-eff">${esc(rec.effect || rec.desc)}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

function archHtml(c: any, d: any) {
  const isFix = !!c.fixation;
  const rec = isFix ? findRef('fixation', c.fixation) : findRef('archetype', c.archetype);
  if (!rec) return '';
  const panic = rec.panic && Object.keys(rec.panic).length ? rec.panic : null;
  return `<div class="cs-eq">
    <div class="et"><b>${isFix ? 'Fixation' : 'Archetype'}: ${link(isFix ? 'fixation' : 'archetype', rec.slug, rec.name)}</b>
      ${rec.feat_name ? `<span class="cs-pill cs-pill-gold">${esc(rec.feat_name)}</span>` : ''}</div>
    ${rec.feat_effect ? `<div class="cs-f cs-eff">${esc(rec.feat_effect)}</div>` : ''}
    ${rec.stat?.effects && !rec.feat_effect ? `<div class="cs-f cs-eff">${esc(rec.stat.effects)}</div>` : ''}
    ${isFix ? `<div class="cs-f">Depravity <b>${d.corruption.depravity}</b> scales this Fixation. You no longer have an Archetype.</div>` : ''}
    ${panic ? `<div class="cs-panic"><div class="cs-f">Panic — ${esc(rec.panic_response || '')} (everything at your Scale and below)</div>
      ${['Clear', 'Dark', 'Morbid'].filter((k) => panic[k]).map((k) => `<div class="cs-panic-row">
        <span class="cs-pill ${d.corruption.band === k ? 'cs-pill-gold' : ''}">${k}</span>
        <span class="cs-eff">${esc(panic[k])}</span></div>`).join('')}</div>` : ''}</div>`;
}

// ---- equipment ----------------------------------------------------------
function equipHtml(d: any) {
  const kindLabel: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', artifice: 'Artifice', magic_item: 'Magic Item', martech: 'Martech', consumable: 'Consumable', material: 'Material', generic: 'Item' };
  const order = ['weapon', 'armor', 'artifice', 'consumable', 'material', 'generic'];
  const kinds = Object.keys(d.byKind).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  if (!kinds.length) return '<div class="cs-f cs-empty">No equipment yet.</div>';
  return kinds.map((kind) => {
    const items = d.byKind[kind];
    const rows = items.map((it: any) => {
      const dur = numFrom(it.durability);
      const broken = dur > 0 && (it.notches || 0) > dur;
      const stats: string[] = [];
      if (kind === 'weapon') {
        const wb = weaponDamage(it.traits);
        for (const x of wb.dmg) stats.push(`<span class="cs-pill cs-pill-dmg">${esc(x.text)}</span>`);
        if (wb.viciousImplicit) stats.push(`<span class="cs-pill" title="listed without a value — PHB says assume 1">Vicious 1</span>`);
        if (it.mode) stats.push(`<span class="cs-pill">${esc(it.mode)}</span>`);
        if (it.accuracy) stats.push(`<span class="cs-pill">Acc <b>${it.accuracy >= 0 ? '+' : ''}${esc(it.accuracy)}</b></span>`);
        for (const x of wb.other) stats.push(`<span class="cs-pill cs-pill-mute">${esc(x)}</span>`);
      } else if (kind === 'armor') {
        if (it.rating) stats.push(`<span class="cs-pill cs-pill-gold">Negates <b>${esc(it.rating)}</b></span>`);
        stats.push(pill('Move penalty', it.movement_penalty));
      } else if (kind === 'artifice') {
        stats.push(pill('Activation', it.activation));
        if (it.pattern) stats.push(`<span class="cs-pill">Pattern <b>${esc(it.pattern)}</b></span>`);
      }
      // every Object has a Durability and Breaks when Notched beyond it (PHB a_Items)
      if (dur > 0) {
        stats.push(`<span class="cs-pill ${broken ? 'broken' : ''}">Notches ${stepBtns('data-notch', it.id, [-1], it.name + ' notches')}<b>${it.notches || 0}</b>/${dur}${stepBtns('data-notch', it.id, [1], it.name + ' notches')}${broken ? ' <b class="bad">BROKEN</b>' : ''}</span>`);
      }
      stats.push(pill('Bulk', it.bulk));
      if ((it.qty || 1) > 1) stats.push(pill('×', it.qty));
      stats.push(pill('T', it.tier));
      const rollBtn = kind === 'weapon' ? `<button class="cs-roll-link" data-roll="weapon" data-id="${esc(it.id)}">⚄ attack</button>` : '';
      return `<div class="cs-eq">
        <div class="et">
          <b>${it.refSlug ? link(kind, it.refSlug, it.name) : esc(it.name)}</b>
          ${it.equipped ? '<span class="cs-pill cs-pill-gold">equipped</span>' : ''}
          ${it.weapon_group ? `<span class="cs-pill cs-pill-mute">${esc(it.weapon_group)}</span>` : ''}
          ${rollBtn}</div>
        <div class="stats">${stats.filter(Boolean).join('')}</div>
        ${it.effects ? `<div class="cs-f cs-eff">${esc(it.effects)}</div>` : ''}
        ${it.note ? `<div class="cs-f">📝 ${esc(it.note)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="cs-eq-group"><div class="cs-lbl cs-card-pad">${esc(kindLabel[kind] || kind)}</div>${rows}</div>`;
  }).join('');
}

function actionsHtml() {
  const order = ['Movement', 'Primary', 'General', 'Reactions'];
  const groups: Record<string, any[]> = {};
  for (const a of (ref.action || [])) { const t = (a.facets?.action_type || [])[0] || 'Other'; (groups[t] ??= []).push(a); }
  const apOf = (sub: string) => { const m = /AP\s*(\S+)/.exec(sub || ''); return m ? m[1] : '—'; };
  const sections = order.filter((t) => groups[t]).map((t) => `
    <div class="cs-act-group"><div class="cs-lbl">${t}</div>
    ${groups[t].map((a: any) => `
      <div class="cs-act">
        <span class="cs-pill cs-act-ap">AP ${esc(apOf(a.sub))}</span>
        <div><b>${a.slug ? link('action', a.slug, a.name) : esc(a.name)}</b>
          <span class="cs-f cs-inline">${esc(a.stat?.effects || a.desc || '')}</span></div>
      </div>`).join('')}</div>`).join('');
  if (!sections) return '';
  return `<details class="card cs-details" id="cs-actions"><summary>Actions &amp; AP — combat quick reference (${(ref.action || []).length}) · 3 AP per turn</summary>
    <div class="cs-act-grid">${sections}</div></details>`;
}

function xpHtml(d: any) {
  const line = (label: string, amount: number) =>
    `<div class="cs-xp-line"><span>${esc(label || '—')}</span>
      <span class="cs-num ${amount < 0 ? 'good' : ''}">${amount >= 0 ? '−' : '+'}${Math.abs(amount)}</span></div>`;
  const nt = d.exp.nextTier;
  return `<div class="card cs-card-pad">
    <div class="cs-xp-tot">
      <div><div class="cs-num cs-big">${d.exp.earned}</div><div class="cs-f">Earned</div></div>
      <div><div class="cs-num cs-big">${d.exp.spent.value}</div><div class="cs-f">Spent</div></div>
      <div><div class="cs-num cs-big ${d.exp.remaining < 0 ? 'bad' : 'gold'}">${d.exp.remaining}</div><div class="cs-f">Available</div></div>
    </div>
    <div class="cs-xp-lines">
      ${d.exp.breakdown.abilities.value ? line('Abilities', d.exp.breakdown.abilities.value) : ''}
      ${d.exp.breakdown.disciplines.value ? line('Disciplines', d.exp.breakdown.disciplines.value) : ''}
      ${d.exp.breakdown.tier.value ? line('Tier', d.exp.breakdown.tier.value) : ''}
      ${d.exp.ledger.map((e: any) => line(e.label, e.amount)).join('')}
    </div>
    <div class="cs-f">${esc(d.exp.breakdown.abilities.formula)} · Available = ${d.exp.earned} − ${d.exp.spent.value}</div>
    ${nt ? `<div class="cs-f">Toward Tier ${nt.tier}: advances <b>${nt.advances}/${nt.advancesNeeded}</b> ·
      degrees <b>${nt.degrees}/${nt.degreesNeeded}</b> · EXP <b>${nt.cost}</b> (tiering up also grants +1 to every Ability)</div>` : ''}
  </div>`;
}

function notesHtml(c: any) {
  const secs = (c.noteSections && c.noteSections.length ? c.noteSections : (c.notes ? [{ title: 'Notes', body: c.notes }] : []));
  if (!secs.length) return '';
  return `<div class="cs-eyebrow">Notes</div><div class="cs-note-grid">
    ${secs.map((n: any) => `<div class="card cs-card-pad"><div class="cs-lbl">${esc(n.title)}</div>
      <div class="cs-note-body">${esc(n.body)}</div></div>`).join('')}</div>`;
}

/** The group's original spreadsheet stats. NOT in the PHB — labelled so nobody
 *  mistakes them for canon. The PHB resolves harm with Injury Risk tables instead. */
function houseHtml(d: any) {
  return `<details class="card cs-details"><summary>House rules — not in PHB v17</summary>
    <div class="cs-card-pad">
      <div class="cs-f">These came from the group's original spreadsheet. The PHB has no Damage or Strain
        Threshold: Movement and Encumbrance are its only Secondary Values, and injury severity is rolled on
        a per-damage-type Injury Risk table. Kept here in case you still use them.</div>
      <div class="cs-house">
        <div><span class="cs-lbl">Damage Threshold</span> <b class="cs-num">${d.houseDt.value}</b> <span class="cs-f cs-inline">${esc(d.houseDt.formula)}</span></div>
        <div><span class="cs-lbl">Strain Threshold</span> <b class="cs-num">${d.houseSt.value}</b> <span class="cs-f cs-inline">${esc(d.houseSt.formula)}</span></div>
      </div>
      <div class="cs-ladder">${d.houseShakes.map((s: any) => `<span class="cs-sev ${s.key}"><span class="t">${s.label.toLowerCase()}</span> ${esc(s.at)}</span>`).join('')}</div>
    </div></details>`;
}

// ---- render -------------------------------------------------------------
/** Transient UI the full re-render would otherwise destroy. */
function snapshotUi() {
  const g = (id: string) => document.getElementById(id) as any;
  return {
    scrollY: window.scrollY,
    actionsOpen: (g('cs-actions') as HTMLDetailsElement)?.open,
    condPick: g('cs-cond-pick')?.value,
    injSev: g('cs-inj-sev')?.value,
    injName: g('cs-inj-name')?.value,
    injStrain: g('cs-inj-strain')?.value,
    dmgN: g('cs-dmg-n')?.value,
    dmgType: g('cs-dmg-type')?.value,
    focus: (document.activeElement as HTMLElement)?.getAttribute?.('data-k') || null,
  };
}
function restoreUi(s: any) {
  const g = (id: string) => document.getElementById(id) as any;
  const set = (id: string, v: any) => { const el = g(id); if (el != null && v != null) el.value = v; };
  if (g('cs-actions') && s.actionsOpen) (g('cs-actions') as HTMLDetailsElement).open = true;
  set('cs-cond-pick', s.condPick); set('cs-inj-sev', s.injSev); set('cs-inj-name', s.injName);
  set('cs-inj-strain', s.injStrain); set('cs-dmg-n', s.dmgN); set('cs-dmg-type', s.dmgType);
  if (s.focus) (mount.querySelector(`[data-k="${s.focus}"]`) as HTMLElement)?.focus();
  window.scrollTo({ top: s.scrollY });
}

function render() {
  const d = derive(char);
  const c = d.char;
  const thr = thresholdHtml(d);
  const arch = archHtml(c, d);

  mount.innerHTML = `<div class="csheet">
    ${headerHtml(d, c)}
    ${alertsHtml(d)}

    <div class="cs-eyebrow">In play — tracked live &amp; saved</div>
    <div class="cs-play-grid">${strainCardHtml(d)}${damageCardHtml(d)}${corruptionCardHtml(d)}</div>
    <div class="cs-cols">${conditionsCardHtml(d)}${injuriesCardHtml(d)}</div>

    <div class="cs-eyebrow">Abilities</div>
    <div class="cs-abilities">${abilitiesHtml(d)}</div>

    <div class="cs-eyebrow">Combat &amp; vitals — derived</div>
    <div class="cs-vitals">${vitalsHtml(d)}</div>
    ${actionsHtml()}

    <div class="cs-cols">
      <div class="cs-col">
        <div class="cs-eyebrow">Skills — click to roll</div><div class="card">${skillsHtml(d)}</div>
        ${thr.length ? `<div class="cs-eyebrow">Threshold feats — automatic</div><div class="card cs-card-pad">${thr.join('')}</div>` : ''}
      </div>
      <div class="cs-col">
        <div class="cs-eyebrow">Disciplines &amp; feats</div><div class="card">${discHtml(d)}</div>
        ${arch ? `<div class="cs-eyebrow">${c.fixation ? 'Fixation' : 'Archetype'}</div><div class="card">${arch}</div>` : ''}
        ${otherFeatsHtml(d)}
      </div>
    </div>

    <div class="cs-eyebrow">Equipment</div><div class="card">${equipHtml(d)}</div>
    <div class="cs-eyebrow">Experience</div>${xpHtml(d)}
    ${notesHtml(c)}
    <div class="cs-eyebrow">Reference</div>${houseHtml(d)}
  </div>`;

  bindPlay();
  bindRolls(d);
  bindArt();
  setSaveState(saveState);       // keep the chip honest across re-renders
}

function reRender() { const s = snapshotUi(); render(); restoreUi(s); }

// ---- events -------------------------------------------------------------
function on(sel: string, ev: string, fn: (el: HTMLElement, e: Event) => void) {
  mount.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el as HTMLElement, e)));
}

function bindPlay() {
  on('[data-money]', 'click', (el) => { char.money = Math.max(0, (Number(char.money) || 0) + Number(el.dataset.d)); markDirty(); reRender(); });
  on('[data-corr]', 'click', (el) => { char.corruption = Math.max(0, (Number(char.corruption) || 0) + Number(el.dataset.d)); markDirty(); reRender(); });
  on('[data-strain]', 'click', (el) => {
    const k = el.dataset.strain!;
    char.strain[k] = Math.max(0, (Number(char.strain[k]) || 0) + Number(el.dataset.d));
    markDirty(); reRender();
  });
  on('[data-atemp]', 'click', (el) => { const k = el.dataset.atemp!; char.abilities[k].temp = (Number(char.abilities[k].temp) || 0) + Number(el.dataset.d); markDirty(); reRender(); });
  on('[data-atax]', 'click', (el) => { const k = el.dataset.atax!; char.abilities[k].tax = Math.max(0, (Number(char.abilities[k].tax) || 0) + Number(el.dataset.d)); markDirty(); reRender(); });
  on('[data-notch]', 'click', (el) => {
    const it = char.items.find((i: any) => i.id === el.dataset.notch);
    if (it) { it.notches = Math.max(0, (Number(it.notches) || 0) + Number(el.dataset.d)); markDirty(); reRender(); }
  });
  // rest / catch breath (PHB d_Rest). Catching your Breath also clears Taxed abilities.
  on('[data-rest]', 'click', (el) => {
    const mode = el.dataset.rest!;
    const P = Number(char.strain.persistent) || 0;
    if (mode === 'wake') {                        // waking from Incapacitation (PHB a_Health)
      char.strain.standard = 0;
      char.strain.persistent = Math.min(P, derive(char).reserve.value);
    } else {
      char.strain.standard = 0;
      for (const k of ['body', 'mind', 'reflex']) char.abilities[k].tax = 0;
      if (mode === 'w1') char.strain.persistent = Math.max(0, P - (Number(char.tier) || 1));
      else if (mode === 'w2') char.strain.persistent = Math.floor(P / 2);
      else if (mode === 'w3' || mode === 'w4') char.strain.persistent = 0;
    }
    markDirty(); reRender();
  });

  // conditions
  const pick = document.getElementById('cs-cond-pick') as HTMLSelectElement | null;
  const eff = document.getElementById('cs-cond-eff');
  const showEff = () => {
    if (!pick || !eff) return;
    const k = (ref.condition || []).find((x: any) => x.slug === pick.value);
    eff.textContent = k ? (k.stat?.effects || k.desc || '') : '';
  };
  pick?.addEventListener('change', showEff); showEff();
  document.getElementById('cs-cond-add')?.addEventListener('click', () => {
    if (!pick) return;
    const k = (ref.condition || []).find((x: any) => x.slug === pick.value);
    if (!k) return;
    const existing = char.conditions.find((x: any) => x.slug === k.slug);
    if (existing) {
      // "The same Condition does not Stack with itself" — only Doomed_x stacks.
      if (STACKING_CONDITIONS.includes(k.slug) || isXCondition(existing)) existing.x = (Number(existing.x) || 1) + 1;
    } else {
      char.conditions.push({
        slug: k.slug, name: k.name, severity: k.sub || '',
        effects: k.stat?.effects || k.desc || '', x: isXCondition(k) ? 1 : null, note: '',
      });
    }
    markDirty(); reRender();
  });
  on('[data-delcond]', 'click', (el) => { char.conditions.splice(Number(el.dataset.delcond), 1); markDirty(); reRender(); });
  on('[data-condx]', 'click', (el) => {
    const i = Number(el.dataset.condx);
    char.conditions[i].x = Math.max(1, (Number(char.conditions[i].x) || 1) + Number(el.dataset.d));
    markDirty(); reRender();
  });

  // injuries
  document.getElementById('cs-inj-add')?.addEventListener('click', () => {
    const sev = (document.getElementById('cs-inj-sev') as HTMLSelectElement).value;
    const name = (document.getElementById('cs-inj-name') as HTMLInputElement).value.trim() || 'Injury';
    const strain = Math.max(0, Number((document.getElementById('cs-inj-strain') as HTMLInputElement).value) || 0);
    char.injuries.push({ id: crypto.randomUUID(), name, severity: sev, strain, note: '' });
    markDirty(); render();     // full render: the add form should reset
  });
  on('[data-delinj]', 'click', (el) => { char.injuries.splice(Number(el.dataset.delinj), 1); markDirty(); reRender(); });
  on('[data-injnote]', 'input', (el) => { char.injuries[Number(el.dataset.injnote)].note = (el as HTMLInputElement).value; markDirty(); });

  // damage resolution
  const dmgAmount = () => Math.max(0, Number((document.getElementById('cs-dmg-n') as HTMLInputElement)?.value) || 0);
  on('[data-absorb]', 'click', (el) => {
    const it = char.items.find((i: any) => i.id === el.dataset.absorb);
    if (!it) return;
    const type = (document.getElementById('cs-dmg-type') as HTMLSelectElement).value;
    // Armor only negates damage it is RATED for (PHB a_Health §Armor).
    if (!ratingCovers(it.rating, type)) {
      const go = window.confirm(
        `${it.name} is Rated for "${it.rating || '—'}", which does not cover ${cap(type)}.\n\n` +
        `By the rules this damage is not negated — roll Injury Risk instead.\n\nNotch it anyway?`);
      if (!go) return;
    }
    const n = dmgAmount();
    const dur = numFrom(it.durability);
    it.notches = (Number(it.notches) || 0) + n;
    if (dur > 0 && it.notches > dur) {
      const overflow = it.notches - dur;
      window.alert(`${it.name} Breaks — Notched past Durability ${dur}. You suffer the remaining ${overflow} damage: roll Injury Risk for it.`);
    }
    markDirty(); reRender();
  });
  document.getElementById('cs-dmg-injure')?.addEventListener('click', () => {
    const n = dmgAmount();
    const type = (document.getElementById('cs-dmg-type') as HTMLSelectElement).value;
    openRoll({
      label: `Injury Risk — ${cap(type)}`, mod: 0, tier: 0, unskilled: true,
      note: `roll 2d6 on the ${cap(type)} table, then add the Injury with ${n} Permanent Strain`,
    });
    (document.getElementById('cs-inj-strain') as HTMLInputElement).value = String(n);
    (document.getElementById('cs-inj-name') as HTMLInputElement).value = cap(type) + ' injury';
  });
}

function bindArt() {
  on('[data-art-open]', 'click', () => openArt());
  on('[data-art-edit]', 'click', (_el, e) => { e.stopPropagation(); openArtEdit(); });
}

function bindRolls(d: any) {
  on('[data-roll="skill"]', 'click', (el) => {
    const s = d.skills[Number(el.dataset.i)];
    openRoll({
      label: s.name, mod: s.mod.value,
      tier: s.trained ? d.tier : 0, unskilled: !s.trained,
      note: s.trained ? `Tier ${d.tier} + ${abLabel(s)} bonus ${s.abilityBonus}` : `untrained · ${abLabel(s)} bonus ${s.abilityBonus}`,
    });
  });
  on('[data-roll="ability"]', 'click', (el) => {
    const a = d.ability[el.dataset.a!];
    openRoll({
      label: `${a.label} check`, mod: a.bonusVal, tier: 0, unskilled: true,
      note: `${a.label} bonus ${a.bonusVal}${a.temp ? ` (incl. temp ${a.temp >= 0 ? '+' : ''}${a.temp})` : ''}${a.tax ? ` · taxed −${a.tax}` : ''}`,
    });
  });
  on('[data-roll="disc"]', 'click', (el) => {
    const dd = d.disciplines[Number(el.dataset.i)];
    openRoll({
      label: `${dd.name} — Specialized Test`, mod: dd.specialMod, tier: d.tier,
      note: `${dd.skill ? cap(dd.skill) : 'skill'} + training ${dd.degree} (${dd.rank})`,
    });
  });
  on('[data-roll="weapon"]', 'click', (el) => {
    const it = (d.byKind.weapon || []).find((w: any) => w.id === el.dataset.id);
    const acc = Number(it?.accuracy || 0);
    const mode = it?.mode || '';
    const best = bestCombatMod(d, mode);
    const skillMod = best ? best.mod.value : 0;
    openRoll({
      label: `Attack — ${it?.name || 'Weapon'}`, mod: skillMod + acc,
      tier: best && best.trained ? d.tier : 0, unskilled: !(best && best.trained),
      note: `${mode || 'unknown mode'} · ${best ? best.name + ' ' + (best.mod.value >= 0 ? '+' : '') + best.mod.value : 'no combat skill'}${acc ? ` + accuracy ${acc >= 0 ? '+' : ''}${acc}` : ''}`,
    });
  });
}
