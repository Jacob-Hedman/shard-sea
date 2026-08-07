// Rich, playable read-only character sheet: full formula transparency, combat
// quick-reference, panic pools, discipline feats with their effects, threshold
// feats, archetype panic responses, detailed equipment, and sectioned notes.
// Click any skill or weapon to build a copy-paste Foundry roll.
import { derive } from '../lib/character/derive.mjs';
import { esc, openRoll } from './charApi';

const partsStr = (parts: any[]) =>
  parts && parts.length ? ' = ' + parts.map((p) => `${esc(p.label)} <b>${esc(p.value)}</b>`).join(' + ') : '';
const fLine = (e: any) => `<div class="cs-f">= ${esc(e.formula)}${partsStr(e.parts)}</div>`;
const pill = (label: string, v: any) => (v != null && v !== '' && v !== 0) ? `<span class="cs-pill">${label} <b>${esc(v)}</b></span>` : '';
const abLabel = (s: any) => (s.ability ? s.ability[0].toUpperCase() + s.ability.slice(1) : 'Ability');

// reference data (loaded once)
let ref: { feats: any[]; thresholds: any[]; archetypes: any[] } | null = null;
async function loadRef() {
  if (ref) return ref;
  const [feats, thresholds, archetypes] = await Promise.all(
    ['feat', 'threshold_feat', 'archetype'].map((k) => fetch(`/data/${k}.index.json`).then((r) => r.json()).catch(() => [])),
  );
  ref = { feats, thresholds, archetypes };
  return ref;
}

/** Parse a weapon `traits` string into playable damage + trait chips. */
function weaponBits(traits: string) {
  const t = String(traits || '');
  const vicious = Number((/Vicious_?(-?\d+)/i.exec(t) || [])[1] || 0);
  const dmg: string[] = [];
  for (const m of t.matchAll(/(Cutting|Piercing|Crushing|Rending|Impaling|Incendiary|Chaos|Energy|Physical)\s*\(?(\d+)?\)?/gi)) {
    const base = Number(m[2] || 1);
    dmg.push(`${m[1]} ${base + vicious}`);
  }
  const other = t.split(',').map((s) => s.trim()).filter((s) =>
    s && !/^(Cutting|Piercing|Crushing|Rending|Impaling|Incendiary|Chaos|Energy|Physical)\b/i.test(s) && !/^Vicious/i.test(s));
  return { dmg, vicious, other };
}

function bestCombatMod(d: any) {
  const combat = d.skills.filter((s: any) => ['action', 'vitality', 'potence', 'resolve'].includes(s.slug));
  return combat.reduce((best: any, s: any) => (!best || s.mod.value > best.mod.value ? s : best), null);
}

export async function mountSheet(mount: HTMLElement, char: any) {
  const r = await loadRef();
  const d = derive(char);
  const c = d.char;

  // ---- abilities (click for a raw ability check) ----
  const abilities = ['body', 'mind', 'reflex'].map((k) => {
    const a = d.ability[k];
    return `<div class="cs-ab card"><div class="lbl">${a.label}</div>
      <div class="val cs-num">${a.adjusted.value}</div><div class="bonus">+${a.bonusVal}</div>
      ${a.temp ? `<div style="margin-top:.3rem"><span class="cs-pill" style="color:var(--color-gold-strong);border-color:#8a6f45">temp ${a.temp >= 0 ? '+' : ''}${a.temp}</span></div>` : ''}
      ${fLine(a.adjusted)}<div class="cs-f">bonus <b>+${a.bonusVal}</b> = ⌊${a.adjusted.value} ÷ 6⌋</div>
      <button class="cs-roll-link" data-roll="ability" data-a="${k}" style="margin-top:.4rem">⚄ ${a.label} check</button></div>`;
  }).join('');

  const ladder = (steps: any[]) => steps.map((s) =>
    `<span class="cs-sev ${s.key}"><span class="t">${s.label.toLowerCase()}</span> ${esc(s.at)}</span>`).join('');
  const mini = (label: string, val: any, e: any) =>
    `<div class="cs-vital card" style="padding:.65rem .8rem"><div class="lbl">${label}</div>
      <div class="v cs-num" style="font-size:1.5rem">${esc(val)}</div>${e ? fLine(e) : ''}</div>`;

  const encPct = Math.min(100, d.maxEnc.value ? Math.round((d.carried / d.maxEnc.value) * 100) : 0);
  const vitals = `
    ${mini('Movement', `${d.movement.value} m`, d.movement)}
    ${mini('Initiative', d.initiative.value, d.initiative)}
    ${mini('AP / turn', d.ap.value, d.ap)}
    <div class="cs-vital card"><div class="lbl">Strain / Reserve</div>
      <div class="v cs-num">${d.strain} <small>/ ${d.reserve.value}</small></div>${fLine(d.reserve)}
      ${d.strainPenalty ? `<div class="cs-f" style="color:var(--color-nonogl)">over by <b>${d.strainPenalty}</b> → all abilities −${d.strainPenalty}</div>` : `<div class="cs-f">within Reserve — no ability penalty</div>`}</div>
    <div class="cs-vital card"><div class="lbl">Damage Threshold</div><div class="v cs-num">${d.dt.value}</div>${fLine(d.dt)}
      <div class="cs-ladder">${ladder(d.scrapes)}</div></div>
    <div class="cs-vital card"><div class="lbl">Strain Threshold</div><div class="v cs-num">${d.st.value}</div>${fLine(d.st)}
      <div class="cs-ladder">${ladder(d.shakes)}</div></div>
    <div class="cs-vital card"><div class="lbl">Max Encumbrance</div><div class="v cs-num">${d.maxEnc.value} <small class="cs-num">· ${d.carried} carried</small></div>${fLine(d.maxEnc)}
      <div class="cs-bar ${d.penalty ? 'over' : ''}"><span style="width:${encPct}%"></span></div>
      ${d.penalty ? `<div class="cs-f" style="color:var(--color-nonogl)">over by <b>${d.penalty}</b> Bulk — Movement &amp; Initiative −${d.penalty}</div>` : ''}</div>
    <div class="cs-vital card"><div class="lbl">Corruption &amp; Panic</div>
      <div class="v cs-num">${d.corruption.value} <small>${esc(d.corruption.band)}</small></div>
      <div class="cs-ladder"><span class="cs-sev minor">minor ${d.panic.minor}</span><span class="cs-sev moderate">mod ${d.panic.moderate}</span><span class="cs-sev major">major ${d.panic.major}</span></div>
      <div class="cs-f">Panic Risk pool (Chaos dice) · ${esc(d.panic.formula)}</div></div>`;

  // ---- skills ----
  const skills = d.skills.map((s: any, i: number) => `
    <button class="cs-skill ${s.trained ? 'trained' : 'untrained'}" data-roll="skill" data-i="${i}">
      <span class="chk">${s.trained ? '✓' : ''}</span>
      <span class="nm">${esc(s.name)} <span class="gov">${abLabel(s)}</span> ${s.principal ? '<span class="prin">principal</span>' : ''}</span>
      <span class="calc"><b>${s.mod.value >= 0 ? '+' : ''}${s.mod.value}</b>
        <span class="gov">${s.trained ? `= T${d.tier}+${s.abilityBonus}` : `${s.abilityBonus} untrained`}</span><span class="die">⚄</span></span>
    </button>`).join('');

  // ---- disciplines with their feats (from the codex) ----
  const featsFor = (discName: string, degree: number) => r.feats
    .filter((f: any) => (f.facets?.discipline || [])[0] === discName && (f.feat_tier ?? 99) <= degree)
    .sort((a: any, b: any) => (a.feat_tier || 0) - (b.feat_tier || 0));
  const disc = d.disciplines.length ? d.disciplines.map((dd: any) => {
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

  // ---- threshold feats (auto from ability values) + archetype ----
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
  const arch = c.archetype ? r.archetypes.find((a: any) => a.slug === c.archetype) : null;
  const archBlock = arch ? `<div class="cs-eq"><div class="et"><b>Archetype: ${esc(arch.name)}</b>
      ${arch.feat_name ? `<span class="cs-pill" style="color:var(--color-gold)">${esc(arch.feat_name)}</span>` : ''}</div>
    ${arch.feat_effect ? `<div class="cs-f" style="color:var(--color-muted)">${esc(arch.feat_effect)}</div>` : ''}
    ${arch.panic && Object.keys(arch.panic).length ? `<div style="margin-top:.5rem"><div class="cs-f">Panic — ${esc(arch.panic_response || '')} (at your Corruption scale &amp; below)</div>
      ${['Clear', 'Dark', 'Morbid'].filter((k) => arch.panic[k]).map((k) => `<div style="font-size:.8rem;margin-top:.2rem"><span class="cs-pill ${d.corruption.band === k || (k === 'Clear') || (k === 'Dark' && d.corruption.band === 'Morbid') ? '' : ''}">${k}</span> <span style="color:var(--color-muted)">${esc(arch.panic[k])}</span></div>`).join('')}</div>` : ''}</div>` : '';

  // ---- equipment (rich) ----
  const kindLabel: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', artifice: 'Artifice', consumable: 'Consumable', material: 'Material', generic: 'Item' };
  const equip = Object.entries(d.byKind).map(([kind, items]: any) =>
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
        stats = [pill('DT+', it.dtPlus), pill('Durability', it.durability), pill('Notches', it.notches),
          pill('Move penalty', it.movement_penalty), it.rating ? `<span class="cs-pill">Rating <b>${esc(it.rating)}</b></span>` : '', pill('Bulk', it.bulk), pill('T', it.tier)].filter(Boolean).join('');
      } else if (kind === 'artifice') {
        stats = [pill('Activation', it.activation), it.pattern ? `<span class="cs-pill">Pattern <b>${esc(it.pattern)}</b></span>` : '', pill('Bulk', it.bulk), pill('T', it.tier)].filter(Boolean).join('');
      } else {
        stats = [pill('Bulk', it.bulk), it.qty > 1 ? pill('×', it.qty) : '', pill('T', it.tier)].filter(Boolean).join('');
      }
      const rollBtn = kind === 'weapon' ? `<button class="cs-roll-link" data-roll="weapon" data-id="${esc(it.id)}" style="margin-left:auto">⚄ attack</button>` : '';
      const feeds = kind === 'armor' && it.equipped && it.dtPlus ? `<span class="cs-f" style="margin:0 0 0 auto">→ feeds DT</span>` : '';
      const eff = it.effects ? `<div class="cs-f" style="color:var(--color-muted);margin-top:.35rem">${esc(it.effects)}</div>` : '';
      return `<div class="cs-eq"><div class="et"><span class="ek">${kindLabel[kind] || kind}</span><b>${esc(it.name)}</b>
        ${it.equipped ? '<span class="cs-pill" style="color:var(--color-gold)">equipped</span>' : ''}${rollBtn}${feeds}</div>
        ${stats ? `<div class="stats">${stats}</div>` : ''}${eff}</div>`;
    }).join('')).join('');

  // ---- notes (sectioned) ----
  const noteSecs = (c.noteSections && c.noteSections.length ? c.noteSections : (c.notes ? [{ title: 'Notes', body: c.notes }] : []));
  const notes = noteSecs.length ? `<div class="cs-cols" style="grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))">
    ${noteSecs.map((n: any) => `<div class="card" style="padding:.8rem .95rem"><div class="lbl" style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-faint);margin-bottom:.35rem">${esc(n.title)}</div>
      <div style="font-size:.88rem;color:var(--color-muted);white-space:pre-wrap">${esc(n.body)}</div></div>`).join('')}</div>` : '';

  const warnings = d.warnings.length ? `<div class="cs-warn">⚠ ${d.warnings.map((w: string) => esc(w)).join('<br>')}</div>` : '';

  // ---- experience (earned, rules spend, manual XP log → available) ----
  const xpLine = (label: string, amount: number) =>
    `<div style="display:flex;gap:.6rem;font-size:.82rem"><span style="flex:1;color:var(--color-muted)">${esc(label || '—')}</span>
      <span class="cs-num" style="font-family:var(--font-mono);color:${amount < 0 ? 'var(--color-ogl)' : 'var(--color-ink)'}">${amount >= 0 ? '−' : '+'}${Math.abs(amount)}</span></div>`;
  const xpLedger = `<div class="card" style="padding:.9rem 1.05rem">
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
    <div class="cs-f" style="margin-top:.4rem">Available = ${d.exp.earned} earned − ${d.exp.spent.value} spent</div>
  </div>`;

  mount.innerHTML = `<div class="csheet">
    <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:1rem">
      <div><h1 style="font-size:2rem;letter-spacing:-.02em;line-height:1;background:linear-gradient(120deg,var(--color-ink),var(--color-gold));-webkit-background-clip:text;background-clip:text;color:transparent">${esc(c.name)}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem;align-items:center">
          <span class="cs-pill" style="color:var(--color-gold);border-color:#8a6f45"><b>Tier ${c.tier}</b></span>
          ${c.archetype ? `<a class="cs-pill" href="/archetypes/${esc(c.archetype)}">Archetype ${esc(arch?.name || c.archetype)}</a>` : ''}
          ${c.background ? `<a class="cs-pill" href="/backgrounds/${esc(c.background)}">Background ${esc(c.background)}</a>` : ''}
        </div></div>
      <div style="margin-left:auto;text-align:right"><div class="cs-f" style="margin:0">EXP · spent ${d.exp.spent.value}</div>
        <div class="cs-num" style="font-family:var(--font-mono);font-size:1.15rem;color:${d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-gold-strong)'}">${d.exp.remaining} <span style="color:var(--color-faint);font-size:.85rem">left / ${d.exp.earned}</span></div>
        <div class="cs-f">Money ${c.money}</div></div>
    </div>
    ${warnings}
    <div class="cs-eyebrow">Abilities</div><div class="cs-abilities">${abilities}</div>
    <div class="cs-eyebrow">Combat &amp; vitals — derived</div>
    <div class="cs-vitals" style="grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))">${vitals}</div>
    <div class="cs-cols">
      <div><div class="cs-eyebrow">Skills — click to roll</div><div class="card">${skills}</div>
        ${thr.length ? `<div class="cs-eyebrow">Threshold feats — automatic</div><div class="card" style="padding:.8rem .95rem">${thr.join('')}</div>` : ''}
      </div>
      <div><div class="cs-eyebrow">Disciplines &amp; feats</div><div class="card">${disc}</div>
        ${archBlock ? `<div class="cs-eyebrow">Archetype</div><div class="card">${archBlock}</div>` : ''}
      </div>
    </div>
    <div class="cs-eyebrow">Equipment</div><div class="card">${equip || '<div class="cs-eq"><span class="gov" style="color:var(--color-faint)">No equipment yet.</span></div>'}</div>
    <div class="cs-eyebrow">Experience</div>${xpLedger}
    ${notes ? `<div class="cs-eyebrow">Notes</div>${notes}` : ''}
  </div>`;

  // ---- roll wiring ----
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
