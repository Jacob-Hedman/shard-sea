// Turn a stored character document into a fully-derived, fully-explained view.
// Nothing derived is ever stored — it's all computed here from the character's
// bases + choices, so it always reflects current inputs and current rules.
import {
  ABILITIES, ABILITY_LABEL, SKILLS, PRINCIPAL_SKILLS, ST_BASE, INJURY_STEPS,
  MAX_SKILLS, MAX_PRINCIPAL, TIER_COST_CUMULATIVE, CREATION_EXP, AP_PER_TURN, PANIC_POOL,
  abilityBonus, adjustedAbility, disciplineCost, disciplineNextCost,
  disciplineCapPerSkill, disciplineCapTotal, abilityAdvanceCost, foundryRoll,
  corruptionBand, reserve as reserveFn, panicPool,
} from './rules.mjs';

const ex = (value, formula, parts = []) => ({ value, formula, parts });
const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

/** Strain is stored as three tracked types; older docs stored a single number. */
function normStrain(s) {
  if (s && typeof s === 'object') return { standard: num(s.standard), persistent: num(s.persistent), permanent: num(s.permanent) };
  return { standard: num(s), persistent: 0, permanent: 0 };
}

/** Fill any missing fields so a partial/old document derives without throwing. */
export function normalizeCharacter(c = {}) {
  const ab = c.abilities || {};
  const mk = (a) => ({ base: num(a?.base), bonus: num(a?.bonus), temp: num(a?.temp) });
  return {
    id: c.id || '',
    name: c.name || 'Unnamed',
    tier: num(c.tier) || 1,
    archetype: c.archetype || null,
    background: c.background || null,
    portrait: c.portrait || '',
    abilities: { body: mk(ab.body), mind: mk(ab.mind), reflex: mk(ab.reflex) },
    abilityStart: c.abilityStart || null,
    strain: normStrain(c.strain),
    corruption: num(c.corruption),
    conditions: Array.isArray(c.conditions) ? c.conditions : [],
    injuries: Array.isArray(c.injuries) ? c.injuries : [],
    damage: num(c.damage),
    expEarned: c.expEarned == null ? CREATION_EXP : num(c.expEarned),
    money: num(c.money),
    skills: Array.isArray(c.skills) ? c.skills : [],
    disciplines: Array.isArray(c.disciplines) ? c.disciplines : [],
    feats: Array.isArray(c.feats) ? c.feats : [],
    items: Array.isArray(c.items) ? c.items : [],
    notes: c.notes || '',
    noteSections: Array.isArray(c.noteSections) ? c.noteSections : [],
    expLedger: Array.isArray(c.expLedger) ? c.expLedger : [],
    visibility: c.visibility || 'shared',
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null,
    schemaVersion: c.schemaVersion || 1,
  };
}

export function derive(raw) {
  const c = normalizeCharacter(raw);
  const tier = c.tier;

  // --- Reserve & the strain penalty (strain only hurts once it passes Reserve) ---
  const baseBodyBonus = abilityBonus(c.abilities.body.base + c.abilities.body.bonus);
  const reserve = reserveFn(tier, baseBodyBonus);
  // Injuries each carry Permanent Strain equal to their Damage (PHB a_Health).
  const injuries = c.injuries.map((i) => ({ id: i.id || '', name: String(i.name || 'Injury'), severity: String(i.severity || 'Minor'), strain: num(i.strain), note: String(i.note || '') }));
  const injuryStrain = injuries.reduce((s, i) => s + i.strain, 0);
  const strainTracks = {
    standard: c.strain.standard,
    persistent: c.strain.persistent,
    permanent: c.strain.permanent + injuryStrain,   // permanent strain = manual + all injuries
  };
  const strain = strainTracks.standard + strainTracks.persistent + strainTracks.permanent;
  const strainPenalty = Math.max(0, strain - reserve.value);

  // --- abilities ---
  const ability = {};
  for (const a of ABILITIES) {
    const { base, bonus, temp } = c.abilities[a];
    const adj = adjustedAbility(base, bonus, temp, strainPenalty);
    ability[a] = {
      key: a, label: ABILITY_LABEL[a], base, bonus, temp,
      permanent: base + bonus,              // the "real" score threshold feats gate on
      adjusted: adj,
      bonusVal: abilityBonus(adj.value),
      bonusExplain: ex(`+${abilityBonus(adj.value)}`, `⌊${adj.value} ÷ 6⌋`),
    };
  }
  const B = ability.body.adjusted.value;
  const M = ability.mind.adjusted.value;
  const R = ability.reflex.adjusted.value;

  // --- equipment, grouped by kind ---
  const byKind = {};
  for (const it of c.items) (byKind[it.kind] ??= []).push(it);
  const equippedArmor = (byKind.armor || []).filter((i) => i.equipped);
  const armorDT = equippedArmor.reduce((s, i) => s + num(i.dtPlus), 0);
  const armorNames = equippedArmor.map((i) => i.name).join(' + ');

  // --- derived vitals ---
  const movement = ex(R, 'Reflex', [{ label: 'Reflex', value: R }]);
  const initiative = ex(R, 'Reflex (ties: Body → Mind)', [{ label: 'Reflex', value: R }]);
  const ap = ex(AP_PER_TURN, 'gained at start of Turn (max 3)');
  const mindBonus = ability.mind.bonusVal;
  const panic = {
    minor: panicPool(PANIC_POOL.minor, mindBonus),
    moderate: panicPool(PANIC_POOL.moderate, mindBonus),
    major: panicPool(PANIC_POOL.major, mindBonus),
    formula: `pool − Mind bonus ${mindBonus} (min 1)`,
  };
  const dtVal = B + armorDT;
  const dt = ex(dtVal, armorDT ? 'Body + equipped armor DT+' : 'Body',
    [{ label: 'Body', value: B }, ...(armorDT ? [{ label: armorNames || 'Armor', value: armorDT }] : [])]);
  const stVal = M + ST_BASE;
  const st = ex(stVal, 'Mind + 3', [{ label: 'Mind', value: M }, { label: 'base', value: ST_BASE }]);
  const scrapes = INJURY_STEPS.map((s) => ({ ...s, at: s.add === 0 ? `> ${dtVal}` : dtVal + s.add }));
  const shakes = INJURY_STEPS.map((s) => ({ ...s, at: s.add === 0 ? `> ${stVal}` : stVal + s.add }));
  const maxEncVal = 3 * B;
  const maxEnc = ex(maxEncVal, '3 × Body', [{ label: 'Body', value: B }]);
  const carried = c.items.reduce((s, i) => s + num(i.bulk) * (num(i.qty) || 1), 0);
  const penalty = Math.max(0, carried - maxEncVal);

  // --- live damage vs the DT ladder → current Injury Severity band ---
  const damage = c.damage;
  let dmgBand = null;
  if (damage > dtVal) dmgBand = 'Minor';
  if (damage >= dtVal + 10) dmgBand = 'Moderate';
  if (damage >= dtVal + 20) dmgBand = 'Major';
  if (damage >= dtVal + 30) dmgBand = 'Lethal';
  // Any Ability driven to 0 (usually by Strain over Reserve) = Incapacitated (PHB a_Health).
  const incapacitated = [B, M, R].some((v) => v <= 0);

  // --- skills ---
  const trained = new Set(c.skills);
  const skills = SKILLS.map((s) => {
    const isTrained = trained.has(s.slug);
    const abBonus = ability[s.ability].bonusVal;
    const tierPart = isTrained ? tier : 0;
    const mod = tierPart + abBonus;
    return {
      ...s,
      trained: isTrained,
      principal: PRINCIPAL_SKILLS.includes(s.slug),
      abilityBonus: abBonus,
      mod: ex(mod,
        isTrained ? 'Tier + ability bonus' : 'ability bonus only (untrained)',
        [...(isTrained ? [{ label: 'Tier', value: tier }] : []), { label: `${ABILITY_LABEL[s.ability]} bonus`, value: abBonus }]),
      baseRoll: foundryRoll(mod, 0, 0, s.name),
    };
  });

  // --- disciplines (with cost + feat count) ---
  const disciplines = c.disciplines.map((d) => ({
    slug: d.slug, name: d.name || d.slug, skill: d.skill || null, degree: num(d.degree),
    cost: disciplineCost(num(d.degree)),
    nextCost: disciplineNextCost(num(d.degree)),
    overCap: num(d.degree) > disciplineCapPerSkill(tier),
  }));
  const totalDegrees = disciplines.reduce((s, d) => s + d.degree, 0);

  // --- EXP economy ---
  const start = c.abilityStart || { body: c.abilities.body.base, mind: c.abilities.mind.base, reflex: c.abilities.reflex.base };
  const advances = ABILITIES.reduce((s, a) => s + Math.max(0, c.abilities[a].base - num(start[a])), 0);
  const abilityCostVal = abilityAdvanceCost(advances);
  const disciplineCostVal = disciplines.reduce((s, d) => s + d.cost.value, 0);
  const tierCostVal = TIER_COST_CUMULATIVE[tier] ?? 0;
  const rulesSpentVal = abilityCostVal + disciplineCostVal + tierCostVal;
  // Manual XP log: things the rules engine can't auto-price (feats, gear bought with
  // XP, GM awards). Positive = spent, negative = awarded/refunded. It genuinely moves
  // your Available XP, and never double-counts the auto-tracked abilities/disciplines/tier.
  const ledger = c.expLedger.map((e) => ({ label: String(e.label || ''), amount: num(e.amount), note: String(e.note || '') }));
  const ledgerSpentVal = ledger.reduce((s, e) => s + e.amount, 0);
  const spentVal = rulesSpentVal + ledgerSpentVal;
  const exp = {
    earned: c.expEarned,
    rules: ex(rulesSpentVal, 'abilities + disciplines + tier',
      [{ label: 'abilities', value: abilityCostVal }, { label: 'disciplines', value: disciplineCostVal }, { label: 'tier', value: tierCostVal }]),
    ledger,
    ledgerSpent: ex(ledgerSpentVal, 'sum of your XP log'),
    spent: ex(spentVal, 'rules spend + logged spend',
      [{ label: 'rules', value: rulesSpentVal }, { label: 'logged', value: ledgerSpentVal }]),
    remaining: c.expEarned - spentVal,
    breakdown: {
      abilities: ex(abilityCostVal, `${advances} advances × 100·Tier (6 per tier)`),
      disciplines: ex(disciplineCostVal, disciplines.map((d) => `${d.name} ${d.degree}`).join(' + ') || '—'),
      tier: ex(tierCostVal, tier <= 1 ? 'Tier 1 (free)' : `to Tier ${tier}`),
    },
    advances,
  };

  // --- validation warnings ---
  const warnings = [];
  if (c.skills.length > MAX_SKILLS) warnings.push(`${c.skills.length} skills chosen — a character has ${MAX_SKILLS}.`);
  const prinCount = c.skills.filter((s) => PRINCIPAL_SKILLS.includes(s)).length;
  if (prinCount > MAX_PRINCIPAL) warnings.push(`${prinCount} principal skills — the limit is ${MAX_PRINCIPAL}.`);
  for (const d of disciplines) if (d.overCap) warnings.push(`${d.name} degree ${d.degree} exceeds the 2×Tier cap (${disciplineCapPerSkill(tier)}).`);
  if (totalDegrees > disciplineCapTotal(tier)) warnings.push(`${totalDegrees} total discipline degrees exceed the 6×Tier cap (${disciplineCapTotal(tier)}).`);
  if (spentVal > c.expEarned) warnings.push(`EXP overspent by ${spentVal - c.expEarned}.`);
  if (penalty > 0) warnings.push(`Over-encumbered by ${penalty} Bulk (reduces Movement & Initiative).`);
  if (strainPenalty > 0) warnings.push(`Strain ${strain} exceeds Reserve ${reserve.value} — all abilities & derived stats −${strainPenalty}.`);
  if (incapacitated) warnings.push(`Incapacitated — an ability has fallen to 0.`);
  if (dmgBand === 'Lethal') warnings.push(`Damage ${damage} is past DT+30 — Lethal band.`);

  return {
    char: c, tier,
    ability, movement, initiative, ap, reserve,
    strain, strainTracks, strainPenalty, injuryStrain, injuries, incapacitated,
    conditions: c.conditions, damage, dmgBand,
    dt, st, scrapes, shakes, maxEnc, carried, penalty, panic,
    corruption: { value: c.corruption, band: corruptionBand(c.corruption) },
    armorDT, skills, disciplines, byKind, exp, warnings,
  };
}
