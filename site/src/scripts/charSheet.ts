// Renders a read-only character sheet with full formula transparency and
// click-to-roll (Foundry) on every rollable stat.
import { derive } from '../lib/character/derive.mjs';
import { esc, openRoll } from './charApi';

const partsStr = (parts: any[]) =>
  parts && parts.length ? ' = ' + parts.map((p) => `${esc(p.label)} <b>${esc(p.value)}</b>`).join(' + ') : '';
const fLine = (e: any) => `<div class="cs-f">= ${esc(e.formula)}${partsStr(e.parts)}</div>`;

const abLabel = (s: any) => (s.ability ? s.ability[0].toUpperCase() + s.ability.slice(1) : 'Ability');

function bestCombatMod(d: any) {
  const combat = d.skills.filter((s: any) => ['action', 'vitality', 'potence', 'resolve'].includes(s.slug));
  return combat.reduce((best: any, s: any) => (!best || s.mod.value > best.mod.value ? s : best), null);
}

export function sheetHTML(char: any): string {
  const d = derive(char);
  const c = d.char;

  const abilities = ['body', 'mind', 'reflex'].map((k) => {
    const a = d.ability[k];
    return `<div class="cs-ab card">
      <div class="lbl">${a.label}</div>
      <div class="val cs-num">${a.adjusted.value}</div>
      <div class="bonus">+${a.bonusVal}</div>
      ${fLine(a.adjusted)}
      <div class="cs-f">bonus <b>+${a.bonusVal}</b> = ⌊${a.adjusted.value} ÷ 6⌋</div>
    </div>`;
  }).join('');

  const ladder = (steps: any[]) => steps.map((s) =>
    `<span class="cs-sev ${s.key}"><span class="t">${s.label.toLowerCase()}</span> ${esc(s.at)}</span>`).join('');

  const encPct = Math.min(100, d.maxEnc.value ? Math.round((d.carried / d.maxEnc.value) * 100) : 0);
  const vitals = `
    <div class="cs-vital card"><div class="lbl">Movement</div>
      <div class="v cs-num">${d.movement.value} <small>m</small></div>${fLine(d.movement)}</div>
    <div class="cs-vital card"><div class="lbl">Damage Threshold</div>
      <div class="v cs-num">${d.dt.value}</div>${fLine(d.dt)}
      <div class="cs-ladder">${ladder(d.scrapes)}</div></div>
    <div class="cs-vital card"><div class="lbl">Strain Threshold</div>
      <div class="v cs-num">${d.st.value}</div>${fLine(d.st)}
      <div class="cs-ladder">${ladder(d.shakes)}</div></div>
    <div class="cs-vital card"><div class="lbl">Max Encumbrance</div>
      <div class="v cs-num">${d.maxEnc.value} <small class="cs-num">· ${d.carried} carried</small></div>${fLine(d.maxEnc)}
      <div class="cs-bar ${d.penalty ? 'over' : ''}"><span style="width:${encPct}%"></span></div>
      ${d.penalty ? `<div class="cs-f" style="color:var(--color-nonogl)">over by <b>${d.penalty}</b> Bulk</div>` : ''}</div>
    <div class="cs-vital card"><div class="lbl">Corruption</div>
      <div class="v cs-num">${d.corruption.value}</div><div class="cs-f">scale: <b>${esc(d.corruption.band)}</b></div></div>`;

  const skills = d.skills.map((s: any, i: number) => `
    <button class="cs-skill ${s.trained ? 'trained' : 'untrained'}" data-roll="skill" data-i="${i}">
      <span class="chk">${s.trained ? '✓' : ''}</span>
      <span class="nm">${esc(s.name)} ${s.principal ? '<span class="prin">principal</span>' : ''}</span>
      <span class="calc"><b>${s.mod.value >= 0 ? '+' : ''}${s.mod.value}</b>
        <span class="gov">${s.trained ? `= Tier ${d.tier} + ${abLabel(s)} ${s.abilityBonus}` : `${s.abilityBonus} (untrained)`}</span>
        <span class="die">⚄</span></span>
    </button>`).join('');

  const disc = d.disciplines.length ? d.disciplines.map((dd: any) => `
    <div class="cs-eq">
      <div class="et"><span class="ek">Discipline</span><b>${esc(dd.name)}</b>
        <span class="cs-pill">degree <b>${dd.degree}</b></span>
        <span class="cs-f" style="margin:0 0 0 auto">cost ${dd.cost.value} <span style="color:#8a6f45">= ${esc(dd.cost.formula)}</span></span></div>
    </div>`).join('') : '<div class="cs-eq"><span class="gov" style="color:var(--color-faint)">No disciplines yet.</span></div>';

  const feats = c.feats.length ? `<div class="cs-eq"><div class="et"><span class="ek">Feats</span></div>
    <div class="stats">${c.feats.map((f: any) => `<span class="cs-pill">${esc(f.name)}</span>`).join('')}</div></div>` : '';

  const kindLabel: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', artifice: 'Artifice', consumable: 'Consumable', material: 'Material', generic: 'Item' };
  const equip = Object.entries(d.byKind).map(([kind, items]: any) =>
    items.map((it: any) => {
      const stats = [
        it.tier != null && it.tier !== 0 ? `Tier <b>${it.tier}</b>` : '',
        it.dtPlus ? `DT+ <b>${it.dtPlus}</b>` : '',
        it.accuracy ? `Accuracy <b>${it.accuracy >= 0 ? '+' : ''}${it.accuracy}</b>` : '',
        it.damage ? `Damage <b>${esc(it.damage)}</b>` : '',
        it.bulk ? `Bulk <b>${it.bulk}</b>` : '',
        it.traits ? `<span style="color:var(--color-muted)">${esc(it.traits)}</span>` : '',
      ].filter(Boolean).map((s) => `<span class="cs-pill">${s}</span>`).join('');
      const rollBtn = kind === 'weapon'
        ? `<button class="cs-roll-link" data-roll="weapon" data-id="${esc(it.id)}" style="margin-left:auto">⚄ attack roll</button>` : '';
      const feeds = kind === 'armor' && it.equipped && it.dtPlus ? `<span class="cs-f" style="margin:0 0 0 auto">→ feeds Damage Threshold</span>` : '';
      return `<div class="cs-eq"><div class="et"><span class="ek">${kindLabel[kind] || kind}</span><b>${esc(it.name)}</b>
        ${it.equipped ? '<span class="cs-pill" style="color:var(--color-gold)">equipped</span>' : ''}${rollBtn}${feeds}</div>
        ${stats ? `<div class="stats">${stats}</div>` : ''}</div>`;
    }).join('')).join('');

  const warnings = d.warnings.length
    ? `<div class="cs-warn">⚠ ${d.warnings.map((w: string) => esc(w)).join('<br>')}</div>` : '';

  return `<div class="csheet">
    <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:1rem">
      <div>
        <h1 style="font-size:2.1rem;letter-spacing:-.02em;line-height:1;background:linear-gradient(120deg,var(--color-ink),var(--color-gold));-webkit-background-clip:text;background-clip:text;color:transparent">${esc(c.name)}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem;align-items:center">
          <span class="cs-pill" style="color:var(--color-gold);border-color:#8a6f45"><b>Tier ${c.tier}</b></span>
          ${c.archetype ? `<span class="cs-pill">Archetype ${esc(c.archetype)}</span>` : ''}
          ${c.background ? `<span class="cs-pill">Background ${esc(c.background)}</span>` : ''}
        </div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div class="cs-f" style="margin:0">EXP remaining</div>
        <div class="cs-num" style="font-family:var(--font-mono);font-size:1.15rem;color:${d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-gold-strong)'}">${d.exp.remaining} <span style="color:var(--color-faint);font-size:.85rem">/ ${d.exp.earned}</span></div>
      </div>
    </div>
    ${warnings}
    <div class="cs-eyebrow">Abilities</div><div class="cs-abilities">${abilities}</div>
    <div class="cs-eyebrow">Vital statistics — derived</div><div class="cs-vitals">${vitals}</div>
    <div class="cs-cols">
      <div><div class="cs-eyebrow">Skills — click to roll</div><div class="card">${skills}</div></div>
      <div><div class="cs-eyebrow">Disciplines &amp; feats</div><div class="card">${disc}${feats}</div></div>
    </div>
    <div class="cs-eyebrow">Equipment</div><div class="card">${equip || '<div class="cs-eq"><span class="gov" style="color:var(--color-faint)">No equipment yet.</span></div>'}</div>
    <div class="cs-eyebrow">Advancement — EXP</div>
    <div class="card" style="padding:1rem 1.1rem">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:.8rem">
        <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.4rem">${d.exp.earned}</div><div class="cs-f" style="margin:0">Earned</div></div>
        <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.4rem">${d.exp.spent.value}</div><div class="cs-f" style="margin:0">Spent</div></div>
        <div><div class="cs-num" style="font-family:var(--font-mono);font-size:1.4rem;color:${d.exp.remaining < 0 ? 'var(--color-nonogl)' : 'var(--color-ogl)'}">${d.exp.remaining}</div><div class="cs-f" style="margin:0">Remaining</div></div>
      </div>
      <div class="cs-f">abilities <b>${d.exp.breakdown.abilities.value}</b> (${esc(d.exp.breakdown.abilities.formula)}) · disciplines <b>${d.exp.breakdown.disciplines.value}</b> · tier <b>${d.exp.breakdown.tier.value}</b></div>
    </div>
  </div>`;
}

export function mountSheet(mount: HTMLElement, char: any) {
  const d = derive(char);
  mount.innerHTML = sheetHTML(char);
  mount.querySelectorAll('[data-roll="skill"]').forEach((el) =>
    el.addEventListener('click', () => {
      const s = d.skills[Number((el as HTMLElement).dataset.i)];
      openRoll({ label: s.name, mod: s.mod.value, note: s.trained ? `Tier ${d.tier} + ${abLabel(s)} bonus ${s.abilityBonus}` : `untrained · ${abLabel(s)} bonus ${s.abilityBonus}` });
    }));
  const best = bestCombatMod(d);
  mount.querySelectorAll('[data-roll="weapon"]').forEach((el) =>
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.id;
      const it = (d.byKind.weapon || []).find((w: any) => w.id === id);
      const acc = Number(it?.accuracy || 0);
      const skillMod = best ? best.mod.value : 0;
      openRoll({
        label: `Attack — ${it?.name || 'Weapon'}`,
        mod: skillMod + acc,
        note: `${best ? best.name + ' ' + (best.mod.value >= 0 ? '+' : '') + best.mod.value : 'no combat skill'}${acc ? ` + accuracy ${acc >= 0 ? '+' : ''}${acc}` : ''}`,
      });
    }));
}
