// Playable character sheet. Read-only for the built character (abilities, skills,
// disciplines, equipment, XP, notes) but LIVE for play-state — strain (three PHB
// types), conditions, damage vs your DT, injuries, armor notches, corruption and
// temporary ability points are all added/removed on the sheet and autosaved to KV.
// Click any skill, ability or weapon to build a copy-paste Foundry roll.
import { api, esc, openRoll } from './charApi';
import { derive } from '../lib/character/derive.mjs';
import { STRAIN_TYPES, INJURY_REMOVAL } from '../lib/character/rules.mjs';

let mount: HTMLElement;
let char: any;
let cid: string | null = null;
let saveTimer: any;
let ref: { feats: any[]; thresholds: any[]; archetypes: any[]; conditions: any[] } | null = null;

const partsStr = (parts: any[]) =>
  parts && parts.length ? ' = ' + parts.map((p) => `${esc(p.label)} <b>${esc(p.value)}</b>`).join(' + ') : '';
const fLine = (e: any) => `<div class="cs-f">= ${esc(e.formula)}${partsStr(e.parts)}</div>`;
const pill = (label: string, v: any) => (v != null && v !== '' && v !== 0) ? `<span class="cs-pill">${label} <b>${esc(v)}</b></span>` : '';
const abLabel = (s: any) => (s.ability ? s.ability[0].toUpperCase() + s.ability.slice(1) : 'Ability');
const numFrom = (v: any) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Lethal'];
const isXCondition = (c: any) => /_x\b/i.test(c.name || '') || /-x$/.test(c.slug || '') || c.x != null;

async function loadRef() {
  if (ref) return ref;
  const [feats, thresholds, archetypes, conditions] = await Promise.all(
    ['feat', 'threshold_feat', 'archetype', 'condition'].map((k) => fetch(`/data/${k}.index.json`).then((r) => r.json()).catch(() => [])),
  );
  ref = { feats, thresholds, archetypes, conditions };
  return ref;
}

/** Parse a weapon `traits` string into playable damage + trait chips. */
function weaponBits(traits: string) {
  const t = String(traits || '');
  const vicious = Number((/Vicious_?(-?\d+)/i.exec(t) || [])[1] || 0);
  const dmg: string[] = [];
  for (const m of t.matchAll(/(Cutting|Piercing|Crushing|Rending|Impaling|Incendiary|Chaos|Energy|Physical|Traumatic|Explosive|Frost|Voltaic)\s*\(?(\d+)?\)?/gi)) {
    const base = Number(m[2] || 1);
    dmg.push(`${m[1]} ${base + vicious}`);
  }
  const other = t.split(',').map((s) => s.trim()).filter((s) =>
    s && !/^(Cutting|Piercing|Crushing|Rending|Impaling|Incendiary|Chaos|Energy|Physical|Traumatic|Explosive|Frost|Voltaic)\b/i.test(s) && !/^Vicious/i.test(s));
  return { dmg, vicious, other };
}
function bestCombatMod(d: any) {
  const combat = d.skills.filter((s: any) => ['action', 'vitality', 'potence', 'resolve'].includes(s.slug));
  return combat.reduce((best: any, s: any) => (!best || s.mod.value > best.mod.value ? s : best), null);
}

// ---- persistence -------------------------------------------------------
function setSaveState(s: 'saved' | 'saving' | 'dirty') {
  const el = document.getElementById('cs-save');
  if (!el) return;
  el.className = 'cs-save ' + (s === 'saved' ? 'saved' : s === 'saving' ? 'saving' : '');
  el.querySelector('.txt')!.textContent = s === 'saved' ? 'Saved' : s === 'saving' ? 'Saving…' : 'Unsaved';
}
function markDirty() {
  if (!cid) return;
  setSaveState('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}
async function save() {
  if (!cid) return;
  setSaveState('saving');
  try { await api.update(cid, char); setSaveState('saved'); } catch { setSaveState('dirty'); }
}

function ensureShape(c: any) {
  if (!c.strain || typeof c.strain !== 'object') c.strain = { standard: Number(c.strain) || 0, persistent: 0, permanent: 0 };
  for (const k of ['standard', 'persistent', 'permanent']) c.strain[k] = Number(c.strain[k]) || 0;
  c.conditions = Array.isArray(c.conditions) ? c.conditions : [];
  c.injuries = Array.isArray(c.injuries) ? c.injuries : [];
  if (c.damage == null) c.damage = 0;
  c.corruption = Number(c.corruption) || 0;
  for (const k of ['body', 'mind', 'reflex']) { c.abilities[k] = c.abilities[k] || { base: 0, bonus: 0, temp: 0 }; if (c.abilities[k].temp == null) c.abilities[k].temp = 0; }
}

// ---- small UI helpers --------------------------------------------------
const stepBtns = (attr: string, key: string, steps: number[]) =>
  steps.map((n) => `<button type="button" class="cs-step" ${attr}="${key}" data-d="${n}">${n > 0 ? '+' + n : n}</button>`).join('');
const sevClass = (sev: string) => (sev === 'Major' || sev === 'Lethal') ? 'major' : sev === 'Moderate' ? 'moderate' : '';

// ========================================================================
export async function mountSheet(el: HTMLElement, character: any, id?: string) {
  mount = el; char = character; cid = id || null;
  ensureShape(char);
  await loadRef();
  render();
}

// ---- section builders --------------------------------------------------
function headerHtml(d: any, c: any, arch: any) {
  return `<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:1rem">
    <div><h1 style="font-size:2rem;letter-spacing:-.02em;line-height:1;background:linear-gradient(120deg,var(--color-ink),var(--color-gold));-webkit-background-clip:text;background-clip:text;color:transparent">${esc(c.name)}</h1>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem;align-items:center">
        <span class="cs-pill" style="color:var(--color-gold);border-color:#8a6f45"><b>Tier ${c.tier}</b></span>
        ${c.archetype ? `<a class="cs-pill" href="/archetypes/${esc(c.archetype)}">Archetype ${esc(arch?.name || c.archetype)}</a>` : ''}
        ${c.background ? `<a class="cs-pill" href="/backgrounds/${esc(c.background)}">Background ${esc(c.background)}</a>` : ''}
        ${cid ? `<span id="cs-save" class="cs-save saved"><span class="dot"></span><span class="txt">Saved</span></span>` : ''}
      </div></div>
    <div style="margin-left:auto;text-align:right"><div class="cs-f" style="margin:0">EXP · spent ${d.exp.spent.value}</div>
      <div class="cs-num" style="font-family:var(--font-mono);font-size:1.15rem;color:${d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-gold-strong)'}">${d.exp.remaining} <span style="color:var(--color-faint);font-size:.85rem">left / ${d.exp.earned}</span></div>
      <div class="cs-f">Money ${c.money}</div></div>
  </div>`;
}

function statusHtml(d: any) {
  const alerts: string[] = [];
  if (d.incapacitated) alerts.push('Incapacitated — an ability is at 0');
  if (d.dmgBand === 'Lethal') alerts.push(`Damage ${d.damage} past DT+30 (Lethal)`);
  const bleeding = d.conditions.some((k: any) => /bleed/i.test(k.name || ''));
  if (bleeding) alerts.push(`Bleeding — bleeds out in ${d.ability.body.base} rounds (Base Body)`);
  if (d.strainPenalty > 0) alerts.push(`Strain ${d.strain} over Reserve ${d.reserve.value} → all stats −${d.strainPenalty}`);
  return alerts.length ? `<div class="cs-warn" style="margin-top:.8rem">⚠ ${alerts.map(esc).join(' · ')}</div>` : '';
}

/** The live play panel: damage, strain (3 types), corruption, conditions, injuries. */
function playHtml(d: any) {
  // --- damage vs DT ladder ---
  const bands = [{ k: 'Minor', at: `> ${d.dt.value}` }, { k: 'Moderate', at: d.dt.value + 10 }, { k: 'Major', at: d.dt.value + 20 }, { k: 'Lethal', at: d.dt.value + 30 }];
  const dmgLadder = bands.map((b) => `<span class="cs-sev ${sevClass(b.k)}" style="${d.dmgBand === b.k ? 'outline:2px solid var(--color-gold);outline-offset:1px' : ''}"><span class="t">${b.k.toLowerCase()}</span> ${esc(b.at)}</span>`).join('');
  const damageCard = `<div class="card" style="padding:.85rem 1rem">
    <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint)">Damage vs DT ${d.dt.value}</div>
    <div style="display:flex;align-items:center;gap:.4rem;margin:.3rem 0">
      ${stepBtns('data-dmg', 'x', [-5, -1])}
      <span class="cs-num" style="font-size:1.7rem;font-family:var(--font-mono);min-width:2.2rem;text-align:center;color:${d.dmgBand ? 'var(--color-nonogl)' : 'inherit'}">${d.damage}</span>
      ${stepBtns('data-dmg', 'x', [1, 5])}
      <span class="cs-f" style="margin:0 0 0 auto">${d.dmgBand ? `<b style="color:var(--color-nonogl)">${d.dmgBand}</b> band` : 'unhurt'}</span>
    </div>
    <div class="cs-ladder">${dmgLadder}</div></div>`;

  // --- strain, three tracked types ---
  const trackRow = (t: any) => {
    const injPart = t.key === 'permanent' && d.injuryStrain ? ` <span class="cs-f" style="display:inline">+${d.injuryStrain} injuries</span>` : '';
    return `<div style="display:flex;align-items:center;gap:.4rem;margin-top:.3rem">
      <span class="cs-sev" style="min-width:5.3rem"><span style="font-family:var(--font-mono)">${t.mark}</span> ${t.label}</span>
      ${stepBtns('data-strain', t.key, [-1])}
      <span class="cs-count">${char.strain[t.key]}</span>
      ${stepBtns('data-strain', t.key, [1])}
      <span class="cs-f" style="margin:0 0 0 auto">${t.sheds}${injPart}</span></div>`;
  };
  const strainCard = `<div class="card" style="padding:.85rem 1rem">
    <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint)">Strain vs Reserve ${d.reserve.value}</div>
    <div style="display:flex;align-items:baseline;gap:.5rem;margin:.2rem 0">
      <span class="cs-num" style="font-size:1.7rem;font-family:var(--font-mono);color:${d.strainPenalty ? 'var(--color-nonogl)' : 'inherit'}">${d.strain}</span>
      <span class="cs-f" style="margin:0">/ ${d.reserve.value} = ${esc(d.reserve.formula)}</span></div>
    <div class="cs-f" style="color:${d.strainPenalty ? 'var(--color-nonogl)' : 'var(--color-faint)'}">${d.strainPenalty ? `over by <b>${d.strainPenalty}</b> → all abilities &amp; derived stats −${d.strainPenalty}` : 'within Reserve — no penalty'}</div>
    ${STRAIN_TYPES.map(trackRow).join('')}</div>`;

  // --- corruption ---
  const cband = d.corruption.band;
  const cchip = (k: string) => `<span class="cs-sev ${cband === k ? (k === 'Morbid' ? 'major' : 'moderate') : ''}">${k}</span>`;
  const corrCard = `<div class="card" style="padding:.85rem 1rem">
    <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint)">Corruption</div>
    <div style="display:flex;align-items:center;gap:.4rem;margin:.3rem 0">
      ${stepBtns('data-corr', 'x', [-1])}
      <span class="cs-num" style="font-size:1.7rem;font-family:var(--font-mono);min-width:2rem;text-align:center">${d.corruption.value}</span>
      ${stepBtns('data-corr', 'x', [1])}
      <span class="cs-f" style="margin:0 0 0 auto">scale <b>${esc(cband)}</b></span></div>
    <div class="cs-ladder">${cchip('Clear')}${cchip('Dark')}${cchip('Morbid')}</div>
    <div class="cs-ladder" style="margin-top:.35rem"><span class="cs-sev minor">panic minor ${d.panic.minor}</span><span class="cs-sev moderate">mod ${d.panic.moderate}</span><span class="cs-sev major">major ${d.panic.major}</span></div>
    <div class="cs-f">${esc(d.panic.formula)}</div></div>`;

  // --- conditions ---
  const active = d.conditions.map((k: any, i: number) => `
    <span class="cs-cond" title="${esc(k.effects || '')}">
      <b>${esc(k.name)}${isXCondition(k) ? ` ${k.x ?? 1}` : ''}</b>
      ${isXCondition(k) ? `<button type="button" class="cs-step cs-step-sm" data-condx="${i}" data-d="-1">−</button><button type="button" class="cs-step cs-step-sm" data-condx="${i}" data-d="1">+</button>` : ''}
      <button type="button" class="cs-x" data-delcond="${i}" title="remove">✕</button></span>`).join('') ||
    '<span class="cs-f" style="color:var(--color-faint)">No conditions active.</span>';
  const options = (ref!.conditions || []).map((k: any) => `<option value="${esc(k.slug)}">${esc(k.name)} · ${esc(k.sub || '')}</option>`).join('');
  const conditionsCard = `<div class="card" style="padding:.85rem 1rem">
    <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint);margin-bottom:.4rem">Conditions</div>
    <div class="cs-conds" style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center">${active}</div>
    <div style="display:flex;gap:.5rem;margin-top:.6rem">
      <select class="cs-select" id="cs-cond-pick" style="flex:1">${options}</select>
      <button type="button" class="cs-copy" id="cs-cond-add" style="white-space:nowrap">+ Add</button></div>
    <div class="cs-f" id="cs-cond-eff" style="margin-top:.4rem"></div></div>`;

  // --- injuries ---
  const injRows = d.injuries.map((inj: any, i: number) => `
    <div class="cs-eq" style="padding:.5rem .6rem"><div class="et" style="gap:.5rem">
      <span class="cs-sev ${sevClass(inj.severity)}">${esc(inj.severity)}</span>
      <b>${esc(inj.name)}</b>
      <span class="cs-pill">+${inj.strain} perm. strain</span>
      <span class="cs-f" style="margin:0">removed by ${esc((INJURY_REMOVAL as any)[inj.severity] || '—')}</span>
      <button type="button" class="cs-x" data-delinj="${i}" style="margin-left:auto" title="remove">✕</button>
    </div></div>`).join('') || '<div class="cs-f" style="color:var(--color-faint)">No injuries.</div>';
  const injuriesCard = `<div class="card" style="padding:.85rem 1rem">
    <div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint);margin-bottom:.4rem">Injuries — each adds Permanent Strain</div>
    <div id="cs-inj-rows">${injRows}</div>
    <div style="display:flex;gap:.4rem;margin-top:.6rem;flex-wrap:wrap;align-items:center">
      <select class="cs-select" id="cs-inj-sev" style="width:7rem">${SEVERITIES.map((s) => `<option>${s}</option>`).join('')}</select>
      <input class="cs-input" id="cs-inj-name" placeholder="Injury (e.g. Gash)" style="flex:1;min-width:8rem">
      <input class="cs-input num" id="cs-inj-strain" type="number" value="1" title="Permanent Strain" style="width:4rem">
      <button type="button" class="cs-copy" id="cs-inj-add" style="white-space:nowrap">+ Add</button></div></div>`;

  return `<div class="cs-vitals" style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))">${damageCard}${strainCard}${corrCard}</div>
    <div class="cs-cols" style="margin-top:.8rem">${conditionsCard}${injuriesCard}</div>`;
}

function abilitiesHtml(d: any) {
  return ['body', 'mind', 'reflex'].map((k) => {
    const a = d.ability[k];
    return `<div class="cs-ab card"><div class="lbl">${a.label}</div>
      <div class="val cs-num">${a.adjusted.value}</div><div class="bonus">+${a.bonusVal}</div>
      ${fLine(a.adjusted)}<div class="cs-f">bonus <b>+${a.bonusVal}</b> = ⌊${a.adjusted.value} ÷ 6⌋</div>
      <div style="display:flex;align-items:center;gap:.4rem;margin-top:.45rem">
        <span class="lbl" style="font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:var(--color-gold)">Temp</span>
        ${stepBtns('data-atemp', k, [-1])}<span class="cs-count">${a.temp >= 0 ? '+' : ''}${a.temp}</span>${stepBtns('data-atemp', k, [1])}
        <button class="cs-roll-link" data-roll="ability" data-a="${k}" style="margin-left:auto">⚄ check</button></div></div>`;
  }).join('');
}

function vitalsHtml(d: any) {
  const mini = (label: string, val: any, e: any) =>
    `<div class="cs-vital card" style="padding:.65rem .8rem"><div class="lbl">${label}</div>
      <div class="v cs-num" style="font-size:1.5rem">${esc(val)}</div>${e ? fLine(e) : ''}</div>`;
  const ladder = (steps: any[]) => steps.map((s) => `<span class="cs-sev ${s.key}"><span class="t">${s.label.toLowerCase()}</span> ${esc(s.at)}</span>`).join('');
  const encPct = Math.min(100, d.maxEnc.value ? Math.round((d.carried / d.maxEnc.value) * 100) : 0);
  return `
    ${mini('Movement', `${d.movement.value} m`, d.movement)}
    ${mini('Initiative', d.initiative.value, d.initiative)}
    ${mini('AP / turn', d.ap.value, d.ap)}
    <div class="cs-vital card"><div class="lbl">Damage Threshold</div><div class="v cs-num">${d.dt.value}</div>${fLine(d.dt)}
      <div class="cs-ladder">${ladder(d.scrapes)}</div></div>
    <div class="cs-vital card"><div class="lbl">Strain Threshold</div><div class="v cs-num">${d.st.value}</div>${fLine(d.st)}
      <div class="cs-ladder">${ladder(d.shakes)}</div></div>
    <div class="cs-vital card"><div class="lbl">Max Encumbrance</div><div class="v cs-num">${d.maxEnc.value} <small class="cs-num">· ${d.carried} carried</small></div>${fLine(d.maxEnc)}
      <div class="cs-bar ${d.penalty ? 'over' : ''}"><span style="width:${encPct}%"></span></div>
      ${d.penalty ? `<div class="cs-f" style="color:var(--color-nonogl)">over by <b>${d.penalty}</b> Bulk — Movement &amp; Initiative −${d.penalty}</div>` : ''}</div>`;
}

function skillsHtml(d: any) {
  return d.skills.map((s: any, i: number) => `
    <button class="cs-skill ${s.trained ? 'trained' : 'untrained'}" data-roll="skill" data-i="${i}">
      <span class="chk">${s.trained ? '✓' : ''}</span>
      <span class="nm">${esc(s.name)} <span class="gov">${abLabel(s)}</span> ${s.principal ? '<span class="prin">principal</span>' : ''}</span>
      <span class="calc"><b>${s.mod.value >= 0 ? '+' : ''}${s.mod.value}</b>
        <span class="gov">${s.trained ? `= T${d.tier}+${s.abilityBonus}` : `${s.abilityBonus} untrained`}</span><span class="die">⚄</span></span>
    </button>`).join('');
}

function discHtml(d: any, r: any) {
  const featsFor = (discName: string, degree: number) => r.feats
    .filter((f: any) => (f.facets?.discipline || [])[0] === discName && (f.feat_tier ?? 99) <= degree)
    .sort((a: any, b: any) => (a.feat_tier || 0) - (b.feat_tier || 0));
  return d.disciplines.length ? d.disciplines.map((dd: any) => {
    const fs = featsFor(dd.name, dd.degree);
    return `<div class="cs-eq">
      <div class="et"><b>${esc(dd.name)}</b><span class="cs-pill" style="color:var(--color-gold)">degree ${dd.degree}</span>
        <span class="cs-f" style="margin:0 0 0 auto">cost ${dd.cost.value} = ${esc(dd.cost.formula)}</span></div>
      ${fs.length ? `<div style="margin-top:.5rem;display:grid;gap:.4rem">${fs.map((f: any) => `
        <div style="border-left:2px solid #8a6f45;padding-left:.6rem">
          <div style="font-size:.85rem"><b>${esc(f.name)}</b> <span class="cs-pill">T${f.feat_tier}</span>${f.ap ? `<span class="cs-pill">AP ${esc(f.ap)}</span>` : ''}${f.qualities ? `<span class="cs-pill">${esc(f.qualities)}</span>` : ''}</div>
          <div class="cs-f" style="color:var(--color-muted)">${esc(f.effect || f.desc || '')}</div></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('') : '<div class="cs-eq"><span class="gov" style="color:var(--color-faint)">No disciplines yet.</span></div>';
}

function thresholdHtml(d: any, r: any) {
  const thr: string[] = [];
  for (const a of ['body', 'mind', 'reflex']) {
    const val = d.ability[a].base + d.ability[a].bonus; // Base Ability gates threshold feats (permanent)
    for (const step of [6, 12, 18]) {
      if (val >= step) {
        const tf = r.thresholds.find((t: any) => (t.ability || '').toLowerCase() === a && Number(t.threshold) === step);
        if (tf) thr.push(`<div style="border-left:2px solid var(--color-indigo,#8f8bdc);padding-left:.6rem;margin-bottom:.4rem">
          <div style="font-size:.85rem"><b>${esc(tf.name)}</b> <span class="cs-pill">${a[0].toUpperCase() + a.slice(1)} ${step}</span></div>
          <div class="cs-f" style="color:var(--color-muted)">${esc(tf.effect || tf.desc || '')}</div></div>`);
      }
    }
  }
  return thr;
}

function archHtml(c: any, d: any, arch: any) {
  return arch ? `<div class="cs-eq"><div class="et"><b>Archetype: ${esc(arch.name)}</b>
      ${arch.feat_name ? `<span class="cs-pill" style="color:var(--color-gold)">${esc(arch.feat_name)}</span>` : ''}</div>
    ${arch.feat_effect ? `<div class="cs-f" style="color:var(--color-muted)">${esc(arch.feat_effect)}</div>` : ''}
    ${arch.panic && Object.keys(arch.panic).length ? `<div style="margin-top:.5rem"><div class="cs-f">Panic — ${esc(arch.panic_response || '')} (at your Corruption scale &amp; below)</div>
      ${['Clear', 'Dark', 'Morbid'].filter((k) => arch.panic[k]).map((k) => `<div style="font-size:.8rem;margin-top:.2rem"><span class="cs-pill">${k}</span> <span style="color:var(--color-muted)">${esc(arch.panic[k])}</span></div>`).join('')}</div>` : ''}</div>` : '';
}

function equipHtml(d: any) {
  const kindLabel: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', artifice: 'Artifice', consumable: 'Consumable', material: 'Material', generic: 'Item' };
  return Object.entries(d.byKind).map(([kind, items]: any) =>
    items.map((it: any) => {
      let stats = '';
      if (kind === 'weapon') {
        const wb = weaponBits(it.traits);
        stats = [
          ...wb.dmg.map((x) => `<span class="cs-pill" style="color:var(--color-nonogl)">${esc(x)}</span>`),
          it.accuracy ? `<span class="cs-pill">Acc <b>${it.accuracy >= 0 ? '+' : ''}${it.accuracy}</b></span>` : '',
          it.tier ? `<span class="cs-pill">T${it.tier}</span>` : '',
          ...wb.other.map((x) => `<span class="cs-pill" style="color:var(--color-muted)">${esc(x)}</span>`),
          pill('Bulk', it.bulk),
        ].filter(Boolean).join('');
      } else if (kind === 'armor') {
        const dur = numFrom(it.durability);
        const broken = dur > 0 && (it.notches || 0) > dur;
        stats = [pill('DT+', it.dtPlus),
          `<span class="cs-pill ${broken ? 'broken' : ''}">Notches ${stepBtns('data-notch', it.id, [-1])}<b>${it.notches || 0}</b>${dur ? `/${dur}` : ''}${stepBtns('data-notch', it.id, [1])}${broken ? ' <b style="color:var(--color-nonogl)">BROKEN</b>' : ''}</span>`,
          pill('Move penalty', it.movement_penalty), it.rating ? `<span class="cs-pill">Rating <b>${esc(it.rating)}</b></span>` : '', pill('Bulk', it.bulk), pill('T', it.tier)].filter(Boolean).join('');
      } else if (kind === 'artifice') {
        stats = [pill('Activation', it.activation), it.pattern ? `<span class="cs-pill">Pattern <b>${esc(it.pattern)}</b></span>` : '', pill('Bulk', it.bulk), pill('T', it.tier)].filter(Boolean).join('');
      } else {
        stats = [pill('Bulk', it.bulk), it.qty > 1 ? pill('×', it.qty) : '', pill('T', it.tier)].filter(Boolean).join('');
      }
      const rollBtn = kind === 'weapon' ? `<button class="cs-roll-link" data-roll="weapon" data-id="${esc(it.id)}" style="margin-left:auto">⚄ attack</button>` : '';
      const eff = it.effects ? `<div class="cs-f" style="color:var(--color-muted);margin-top:.35rem">${esc(it.effects)}</div>` : '';
      return `<div class="cs-eq"><div class="et"><span class="ek">${kindLabel[kind] || kind}</span><b>${esc(it.name)}</b>
        ${it.equipped ? '<span class="cs-pill" style="color:var(--color-gold)">equipped</span>' : ''}${rollBtn}</div>
        ${stats ? `<div class="stats">${stats}</div>` : ''}${eff}</div>`;
    }).join('')).join('');
}

function xpHtml(d: any) {
  const xpLine = (label: string, amount: number) =>
    `<div style="display:flex;gap:.6rem;font-size:.82rem"><span style="flex:1;color:var(--color-muted)">${esc(label || '—')}</span>
      <span class="cs-num" style="font-family:var(--font-mono);color:${amount < 0 ? 'var(--color-ogl)' : 'var(--color-ink)'}">${amount >= 0 ? '−' : '+'}${Math.abs(amount)}</span></div>`;
  return `<div class="card" style="padding:.9rem 1.05rem">
    <div style="display:flex;gap:1.6rem;flex-wrap:wrap;align-items:flex-end">
      <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.4rem">${d.exp.earned}</div><div class="cs-f" style="margin:0">Earned</div></div>
      <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.4rem">${d.exp.spent.value}</div><div class="cs-f" style="margin:0">Spent</div></div>
      <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.4rem;color:${d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-gold-strong)'}">${d.exp.remaining}</div><div class="cs-f" style="margin:0">Available</div></div>
    </div>
    <div style="margin-top:.55rem;display:grid;gap:.25rem">
      ${d.exp.breakdown.abilities.value ? xpLine('Abilities', d.exp.breakdown.abilities.value) : ''}
      ${d.exp.breakdown.disciplines.value ? xpLine('Disciplines', d.exp.breakdown.disciplines.value) : ''}
      ${d.exp.breakdown.tier.value ? xpLine('Tier', d.exp.breakdown.tier.value) : ''}
      ${d.exp.ledger.map((e: any) => xpLine(e.label, e.amount)).join('')}
    </div>
    <div class="cs-f" style="margin-top:.4rem">Available = ${d.exp.earned} earned − ${d.exp.spent.value} spent</div></div>`;
}

function notesHtml(c: any) {
  const noteSecs = (c.noteSections && c.noteSections.length ? c.noteSections : (c.notes ? [{ title: 'Notes', body: c.notes }] : []));
  return noteSecs.length ? `<div class="cs-eyebrow">Notes</div><div class="cs-cols" style="grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))">
    ${noteSecs.map((n: any) => `<div class="card" style="padding:.8rem .95rem"><div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint);margin-bottom:.35rem">${esc(n.title)}</div>
      <div style="font-size:.88rem;color:var(--color-muted);white-space:pre-wrap">${esc(n.body)}</div></div>`).join('')}</div>` : '';
}

// ---- render + bind -----------------------------------------------------
function render() {
  const r = ref!;
  const d = derive(char);
  const c = d.char;
  const arch = c.archetype ? r.archetypes.find((a: any) => a.slug === c.archetype) : null;
  const thr = thresholdHtml(d, r);
  const archB = archHtml(c, d, arch);

  mount.innerHTML = `<div class="csheet">
    ${headerHtml(d, c, arch)}
    ${statusHtml(d)}
    <div class="cs-eyebrow">In play — tracked live &amp; saved</div>
    ${playHtml(d)}
    <div class="cs-eyebrow">Abilities</div><div class="cs-abilities">${abilitiesHtml(d)}</div>
    <div class="cs-eyebrow">Combat &amp; vitals — derived</div>
    <div class="cs-vitals" style="grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))">${vitalsHtml(d)}</div>
    <div class="cs-cols">
      <div><div class="cs-eyebrow">Skills — click to roll</div><div class="card">${skillsHtml(d)}</div>
        ${thr.length ? `<div class="cs-eyebrow">Threshold feats — automatic</div><div class="card" style="padding:.8rem .95rem">${thr.join('')}</div>` : ''}
      </div>
      <div><div class="cs-eyebrow">Disciplines &amp; feats</div><div class="card">${discHtml(d, r)}</div>
        ${archB ? `<div class="cs-eyebrow">Archetype</div><div class="card">${archB}</div>` : ''}
      </div>
    </div>
    <div class="cs-eyebrow">Equipment</div><div class="card">${equipHtml(d) || '<div class="cs-eq"><span class="gov" style="color:var(--color-faint)">No equipment yet.</span></div>'}</div>
    <div class="cs-eyebrow">Experience</div>${xpHtml(d)}
    ${notesHtml(c)}
  </div>`;

  bindPlay();
  bindRolls(d);
}

function reRender() { render(); }

function bindPlay() {
  // damage
  mount.querySelectorAll('[data-dmg]').forEach((el) =>
    el.addEventListener('click', () => { char.damage = Math.max(0, (Number(char.damage) || 0) + Number((el as HTMLElement).dataset.d)); markDirty(); reRender(); }));
  // corruption
  mount.querySelectorAll('[data-corr]').forEach((el) =>
    el.addEventListener('click', () => { char.corruption = Math.max(0, (Number(char.corruption) || 0) + Number((el as HTMLElement).dataset.d)); markDirty(); reRender(); }));
  // strain (three types)
  mount.querySelectorAll('[data-strain]').forEach((el) =>
    el.addEventListener('click', () => { const k = (el as HTMLElement).dataset.strain!; char.strain[k] = Math.max(0, (Number(char.strain[k]) || 0) + Number((el as HTMLElement).dataset.d)); markDirty(); reRender(); }));
  // ability temp
  mount.querySelectorAll('[data-atemp]').forEach((el) =>
    el.addEventListener('click', () => { const k = (el as HTMLElement).dataset.atemp!; char.abilities[k].temp = (Number(char.abilities[k].temp) || 0) + Number((el as HTMLElement).dataset.d); markDirty(); reRender(); }));
  // armor notches
  mount.querySelectorAll('[data-notch]').forEach((el) =>
    el.addEventListener('click', () => {
      const it = char.items.find((i: any) => i.id === (el as HTMLElement).dataset.notch);
      if (it) { it.notches = Math.max(0, (Number(it.notches) || 0) + Number((el as HTMLElement).dataset.d)); markDirty(); reRender(); }
    }));
  // conditions: add / remove / x
  const pick = document.getElementById('cs-cond-pick') as HTMLSelectElement | null;
  const eff = document.getElementById('cs-cond-eff');
  const showEff = () => { if (pick && eff) { const k = (ref!.conditions || []).find((x: any) => x.slug === pick.value); eff.textContent = k ? (k.stat?.effects || k.desc || '') : ''; } };
  pick?.addEventListener('change', showEff); showEff();
  document.getElementById('cs-cond-add')?.addEventListener('click', () => {
    if (!pick) return;
    const k = (ref!.conditions || []).find((x: any) => x.slug === pick.value);
    if (!k) return;
    char.conditions.push({ slug: k.slug, name: k.name, severity: k.sub || '', effects: k.stat?.effects || k.desc || '', x: isXCondition(k) ? 1 : null, note: '' });
    markDirty(); reRender();
  });
  mount.querySelectorAll('[data-delcond]').forEach((el) =>
    el.addEventListener('click', () => { char.conditions.splice(Number((el as HTMLElement).dataset.delcond), 1); markDirty(); reRender(); }));
  mount.querySelectorAll('[data-condx]').forEach((el) =>
    el.addEventListener('click', () => { const i = Number((el as HTMLElement).dataset.condx); char.conditions[i].x = Math.max(1, (Number(char.conditions[i].x) || 1) + Number((el as HTMLElement).dataset.d)); markDirty(); reRender(); }));
  // injuries: add / remove
  document.getElementById('cs-inj-add')?.addEventListener('click', () => {
    const sev = (document.getElementById('cs-inj-sev') as HTMLSelectElement).value;
    const name = (document.getElementById('cs-inj-name') as HTMLInputElement).value.trim() || 'Injury';
    const strain = Number((document.getElementById('cs-inj-strain') as HTMLInputElement).value) || 0;
    char.injuries.push({ id: crypto.randomUUID(), name, severity: sev, strain, note: '' });
    markDirty(); reRender();
  });
  mount.querySelectorAll('[data-delinj]').forEach((el) =>
    el.addEventListener('click', () => { char.injuries.splice(Number((el as HTMLElement).dataset.delinj), 1); markDirty(); reRender(); }));
}

function bindRolls(d: any) {
  mount.querySelectorAll('[data-roll="skill"]').forEach((el) =>
    el.addEventListener('click', () => {
      const s = d.skills[Number((el as HTMLElement).dataset.i)];
      openRoll({ label: s.name, mod: s.mod.value, note: s.trained ? `Tier ${d.tier} + ${abLabel(s)} bonus ${s.abilityBonus}` : `untrained · ${abLabel(s)} bonus ${s.abilityBonus}` });
    }));
  mount.querySelectorAll('[data-roll="ability"]').forEach((el) =>
    el.addEventListener('click', () => {
      const a = d.ability[(el as HTMLElement).dataset.a!];
      openRoll({ label: `${a.label} check`, mod: a.bonusVal, note: `${a.label} bonus ${a.bonusVal}${a.temp ? ` (incl. temp ${a.temp >= 0 ? '+' : ''}${a.temp})` : ''}` });
    }));
  const best = bestCombatMod(d);
  mount.querySelectorAll('[data-roll="weapon"]').forEach((el) =>
    el.addEventListener('click', () => {
      const it = (d.byKind.weapon || []).find((w: any) => w.id === (el as HTMLElement).dataset.id);
      const acc = Number(it?.accuracy || 0);
      const skillMod = best ? best.mod.value : 0;
      openRoll({ label: `Attack — ${it?.name || 'Weapon'}`, mod: skillMod + acc,
        note: `${best ? best.name + ' ' + (best.mod.value >= 0 ? '+' : '') + best.mod.value : 'no combat skill'}${acc ? ` + accuracy ${acc >= 0 ? '+' : ''}${acc}` : ''}` });
    }));
}
