// Turn a stored character document into a fully-derived, fully-explained view.
// Nothing derived is ever stored — it's all computed here from the character's
// bases + choices, so it always reflects current inputs and current rules.
import {
  ABILITIES, ABILITY_LABEL, SKILLS, PRINCIPAL_SKILLS, INJURY_REMOVAL,
  MAX_SKILLS, MAX_PRINCIPAL, TIER_COST_CUMULATIVE, CREATION_EXP, AP_PER_TURN, PANIC_POOL,
  MELEE_SKILLS, SPEEDS, HOUSE_ST_BASE, HOUSE_INJURY_STEPS, DEGREES_PER_TIER,
  ABILITY_ADVANCE_PER_TIER, MAX_TIER, MAJOR_INFECTION_DAYS, INITIATIVE_DIE,
  abilityBonus, adjustedAbility, disciplineCost, disciplineNextCost, disciplineRank,
  disciplineCapPerSkill, disciplineCapTotal, abilityAdvanceCost, foundryRoll,
  corruptionBand, corruptionPool, depravity, reserve as reserveFn, panicPool,
  resistDC, sizeFor, parseBulk, recoveryTime,
} from './rules.mjs';

const ex = (value, formula, parts = []) => ({ value, formula, parts });
const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
const numFrom = (v) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0);

/** Strain is a single number (PHB v19). Pre-v19 docs stored three tracked types; their
 *  manual totals fold into the one track. */
function normStrain(s) {
  if (s && typeof s === 'object') return Math.max(0, num(s.standard) + num(s.persistent) + num(s.permanent));
  return Math.max(0, num(s));
}
const normPenalty = (p) => ({ body: Math.max(0, num(p?.body)), mind: Math.max(0, num(p?.mind)), reflex: Math.max(0, num(p?.reflex)) });
/** Injuries carry the Damage that caused them (sets Recovery Time) and the Ability
 *  losses their result inflicts. Pre-v19 docs stored `strain` — that was the Damage. */
export function normInjury(i = {}) {
  const severity = String(i.severity || 'Minor');
  const damage = Math.max(0, num(i.damage ?? i.strain));
  return {
    id: i.id || '', name: String(i.name || 'Injury'), severity, damage,
    penalty: normPenalty(i.penalty),
    treated: !!i.treated,
    recovery: i.recovery == null ? recoveryTime(severity, damage) : Math.max(0, num(i.recovery)),
    note: String(i.note || ''),
  };
}

/** Fill any missing fields so a partial/old document derives without throwing. */
export function normalizeCharacter(c = {}) {
  const ab = (c && c.abilities) || {};
  const mk = (a) => ({ base: num(a?.base), bonus: num(a?.bonus), temp: num(a?.temp), tax: num(a?.tax) });
  return {
    id: c.id || '',
    name: c.name || 'Unnamed',
    tier: num(c.tier) || 1,
    height: num(c.height) || 1.8,
    archetype: c.archetype || null,
    fixation: c.fixation || null,
    background: c.background || null,
    portrait: c.portrait || '',
    abilities: { body: mk(ab.body), mind: mk(ab.mind), reflex: mk(ab.reflex) },
    abilityStart: c.abilityStart || null,
    strain: normStrain(c.strain),
    noRestDays: Math.max(0, num(c.noRestDays)),
    corruption: num(c.corruption),
    conditions: Array.isArray(c.conditions) ? c.conditions : [],
    injuries: Array.isArray(c.injuries) ? c.injuries.map(normInjury) : [],
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

  // --- Injuries: in v19 they lower Abilities directly, until healed (PHB b_Attacks) ---
  const injuries = c.injuries.map((i) => ({
    ...i,
    removal: INJURY_REMOVAL[i.severity] || '—',
    // an untreated Major injury kills you on a timer (PHB b_Attacks §Treating Injuries)
    infectionDays: i.severity === 'Major' && !i.treated ? MAJOR_INFECTION_DAYS : null,
  }));
  const lowersFor = (a) => {
    const inj = injuries.reduce((s, i) => s + i.penalty[a], 0);
    return [
      ...(inj ? [{ label: 'injuries', value: inj }] : []),
      // "Each Day you spend without Resting at all reduces your Mind by one" (PHB v19 d_Rest)
      ...(a === 'mind' && c.noRestDays ? [{ label: 'no Rest', value: c.noRestDays }] : []),
    ];
  };
  const lowers = Object.fromEntries(ABILITIES.map((a) => [a, lowersFor(a)]));
  const loweredTotal = (a) => lowers[a].reduce((s, l) => s + l.value, 0);
  const naturalOf = (a) => Math.max(0, c.abilities[a].base + c.abilities[a].bonus - loweredTotal(a));

  // --- Reserve & the strain penalty (strain only hurts once it passes Reserve) ---
  const reserve = reserveFn(tier, abilityBonus(naturalOf('body')));
  const strain = c.strain;
  const strainPenalty = Math.max(0, strain - reserve.value);

  // --- abilities ---
  const ability = {};
  for (const a of ABILITIES) {
    const { base, bonus, temp, tax } = c.abilities[a];
    const adj = adjustedAbility(base, bonus, temp, strainPenalty, tax, lowers[a]);
    ability[a] = {
      key: a, label: ABILITY_LABEL[a], base, bonus, temp, tax,
      lowered: loweredTotal(a),
      // Threshold FEATS gate on BASE alone (permanent bonuses like Diablerie raise the
      // value but never grant the Feat — PHB f-Ability Thresholds). The Ability BONUS to
      // Skills DOES count the permanent bonus, so it reads `permanent`.
      permanent: base + bonus,              // the Ability-Bonus score (bonuses count)
      natural: naturalOf(a),                // "Natural" = absent Strain and Taxation (PHB a_Health)
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
  for (const it of c.items) (byKind[it.kind || 'generic'] ??= []).push(it);
  const equippedArmor = (byKind.armor || []).filter((i) => i.equipped);
  const armorNames = equippedArmor.map((i) => i.name).join(' + ');
  // Armor Movement Penalty is a real PHB stat (Cloth 0, Leather 1, Chain 3, Dragon 4).
  const armorMove = equippedArmor.reduce((s, i) => s + numFrom(i.movement_penalty), 0);
  // Armor DT+ is a HOUSE stat (the group's sheet adds it to Damage Threshold).
  const armorDtPlus = equippedArmor.reduce((s, i) => s + numFrom(i.dtPlus), 0);

  // --- encumbrance (needed before Movement/Initiative, which it penalises) ---
  // "all your Abilities and derived statistics fall by the same amount" — a derived
  // statistic drops by the strain penalty ONCE, so build it from the pre-strain Body.
  const bodyPreStrain = B + strainPenalty;
  const maxEncVal = Math.max(0, 3 * bodyPreStrain - strainPenalty);
  const maxEnc = ex(maxEncVal, strainPenalty ? '3 × Body − strain' : '3 × Body',
    [{ label: '3 × Body', value: 3 * bodyPreStrain }, ...(strainPenalty ? [{ label: 'strain', value: -strainPenalty }] : [])]);
  // Items stowed in an Imaginary Pocket (or similar) weigh nothing against Encumbrance.
  const itemBulk = (i) => numFrom(i.bulk) * Math.max(0, num(i.qty) || 1);
  const carried = c.items.filter((i) => !i.stowed).reduce((s, i) => s + itemBulk(i), 0);
  const carriedRounded = Math.round(carried * 100) / 100;
  const stowed = Math.round(c.items.filter((i) => i.stowed).reduce((s, i) => s + itemBulk(i), 0) * 100) / 100;
  const penalty = Math.max(0, Math.ceil(carriedRounded - maxEncVal));

  // --- derived vitals ---
  // "Every point of Bulk over this value counts against your Movement and Initiative by
  // the same amount, until either reaches 0, in which case you must drop something."
  const moveParts = [{ label: 'Reflex', value: R },
    ...(armorMove ? [{ label: armorNames || 'armor', value: -armorMove }] : []),
    ...(penalty ? [{ label: 'over-encumbered', value: -penalty }] : [])];
  const movement = ex(Math.max(0, R - armorMove - penalty),
    armorMove || penalty ? 'Reflex − armor − over-encumbrance' : 'Reflex', moveParts);
  // v19: Initiative is rolled — 1d6 + Reflex, highest first (PHB b_Combat §Who Goes First).
  // `value` is the modifier added to the die.
  const initMod = Math.max(0, R - penalty);
  const initiative = {
    ...ex(initMod,
      penalty ? `${INITIATIVE_DIE} + Reflex − over-encumbrance` : `${INITIATIVE_DIE} + Reflex`,
      [{ label: 'Reflex', value: R }, ...(penalty ? [{ label: 'over-encumbered', value: -penalty }] : [])]),
    die: INITIATIVE_DIE,
    roll: `/r ${INITIATIVE_DIE} + ${initMod} # Initiative`,
  };
  const speeds = SPEEDS.map((s) => ({ ...s, value: Math.floor(movement.value / s.div) }));
  const ap = ex(AP_PER_TURN, 'gained at start of Turn (max 3)');
  const mindBonus = ability.mind.bonusVal;
  const panic = {
    minor: panicPool(PANIC_POOL.minor, mindBonus),
    moderate: panicPool(PANIC_POOL.moderate, mindBonus),
    major: panicPool(PANIC_POOL.major, mindBonus),
    formula: `pool − Mind bonus ${mindBonus} (min 1)`,
  };
  // push / lift (PHB a_Character Creation §Encumbrance)
  const push = ex(maxEncVal * 2, '2 × Encumbrance');
  const lift = ex(Math.floor(maxEncVal / 2), 'half Encumbrance');
  const size = sizeFor(c.height);
  const armorBulk = equippedArmor.reduce((s, i) => s + numFrom(i.bulk), 0);
  const weight = ex(Math.round(c.height * 10 + armorBulk),
    armorBulk ? 'Height × 10 + armor Bulk' : 'Height × 10',
    [{ label: 'Height × 10', value: Math.round(c.height * 10) }, ...(armorBulk ? [{ label: 'armor', value: armorBulk }] : [])]);

  // --- HOUSE RULE vitals (not PHB v17) — kept because the group's sheet used them ---
  const houseStVal = M + HOUSE_ST_BASE;
  const houseSt = ex(houseStVal, 'Mind + 3 (house rule)', [{ label: 'Mind', value: M }, { label: 'base', value: HOUSE_ST_BASE }]);
  const houseDt = ex(B + armorDtPlus,
    armorDtPlus ? 'Body + equipped armor DT+ (house rule)' : 'Body (house rule)',
    [{ label: 'Body', value: B }, ...(armorDtPlus ? [{ label: armorNames || 'armor', value: armorDtPlus }] : [])]);
  const houseShakes = HOUSE_INJURY_STEPS.map((s) => ({ ...s, at: s.add === 0 ? `> ${houseStVal}` : houseStVal + s.add }));

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
      mode: PRINCIPAL_SKILLS.includes(s.slug) ? (MELEE_SKILLS.includes(s.slug) ? 'Melee' : 'Ranged') : null,
      abilityBonus: abBonus,
      mod: ex(mod,
        isTrained ? 'Tier + ability bonus' : 'ability bonus only (untrained)',
        [...(isTrained ? [{ label: 'Tier', value: tier }] : []), { label: `${ABILITY_LABEL[s.ability]} bonus`, value: abBonus }]),
      baseRoll: foundryRoll(mod, 0, 0, s.name),
    };
  });
  // What an attacker must beat to land a Test on you, per Principal Skill (PHB e_Tests §Resistance).
  const defenses = PRINCIPAL_SKILLS.map((slug) => {
    const s = skills.find((x) => x.slug === slug);
    return { slug, name: s.name, mode: s.mode, trained: s.trained, dc: resistDC(tier, s.trained) };
  });

  // --- disciplines (with cost + feat count) ---
  const disciplines = c.disciplines.map((d) => ({
    slug: d.slug, name: d.name || d.slug, skill: d.skill || null, degree: num(d.degree),
    rank: disciplineRank(num(d.degree)),
    cost: disciplineCost(num(d.degree)),
    nextCost: disciplineNextCost(num(d.degree)),
    overCap: num(d.degree) > disciplineCapPerSkill(tier),
    // A Specialized Test rolls the governing Skill and adds your Training (PHB a_Disciplines).
    specialMod: (skills.find((x) => x.slug === (d.skill || '')) || { mod: { value: 0 } }).mod.value + num(d.degree),
  }));
  const totalDegrees = disciplines.reduce((s, d) => s + d.degree, 0);

  // --- EXP economy ---
  const start = c.abilityStart || { body: c.abilities.body.base, mind: c.abilities.mind.base, reflex: c.abilities.reflex.base };
  // Advancing a Tier grants +1 to every Ability for free — don't bill those points.
  const tierGrant = Math.max(0, tier - 1);
  const advances = ABILITIES.reduce((s, a) => s + Math.max(0, c.abilities[a].base - num(start[a]) - tierGrant), 0);
  const abilityCostVal = abilityAdvanceCost(advances, tier);
  const disciplineCostVal = disciplines.reduce((s, d) => s + d.cost.value, 0);
  const tierCostVal = TIER_COST_CUMULATIVE[tier] ?? 0;
  const rulesSpentVal = abilityCostVal + disciplineCostVal + tierCostVal;
  // Manual XP log: things the rules engine can't auto-price (feats, gear bought with
  // XP, GM awards). Positive = spent, negative = awarded/refunded.
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
      abilities: ex(abilityCostVal, `${advances} bought advance${advances === 1 ? '' : 's'} × 100·Tier${tierGrant ? ` (+${tierGrant * 3} free from Tier)` : ''}`),
      disciplines: ex(disciplineCostVal, disciplines.map((d) => `${d.name} ${d.degree}`).join(' + ') || '—'),
      tier: ex(tierCostVal, tier <= 1 ? 'Tier 1 (free)' : `to Tier ${tier}`),
    },
    advances,
    totalDegrees,
    // Gates on advancing to the next Tier: 6 more Ability Advances and 6 more Degrees
    // (PHB a_Character Creation §Advancing your Tier). Counted within the current Tier.
    nextTier: tier < MAX_TIER ? {
      tier: tier + 1, cost: TIER_COST_CUMULATIVE[tier + 1] ?? 0,
      advances: Math.max(0, Math.min(ABILITY_ADVANCE_PER_TIER, advances - ABILITY_ADVANCE_PER_TIER * (tier - 1))),
      advancesNeeded: ABILITY_ADVANCE_PER_TIER,
      degrees: Math.max(0, Math.min(DEGREES_PER_TIER, totalDegrees - DEGREES_PER_TIER * (tier - 1))),
      degreesNeeded: DEGREES_PER_TIER,
    } : null,
  };

  // --- corruption / fixation ---
  const corruption = {
    value: c.corruption,
    band: corruptionBand(c.corruption),
    pool: corruptionPool(c.corruption),
    depravity: depravity(c.corruption),
    terminal: c.corruption >= 18,
  };

  // Any Ability driven to 0 (usually by Strain over Reserve) = Incapacitated (PHB a_Health).
  const incapacitated = [B, M, R].some((v) => v <= 0);

  // --- validation warnings ---
  const warnings = [];
  if (c.skills.length > MAX_SKILLS) warnings.push(`${c.skills.length} skills chosen — a character has ${MAX_SKILLS}.`);
  const prinCount = c.skills.filter((s) => PRINCIPAL_SKILLS.includes(s)).length;
  if (prinCount > MAX_PRINCIPAL) warnings.push(`${prinCount} principal skills — the limit is ${MAX_PRINCIPAL}.`);
  for (const d of disciplines) if (d.overCap) warnings.push(`${d.name} degree ${d.degree} exceeds the 2×Tier cap (${disciplineCapPerSkill(tier)}).`);
  if (totalDegrees > disciplineCapTotal(tier)) warnings.push(`${totalDegrees} total discipline degrees exceed the 6×Tier cap (${disciplineCapTotal(tier)}).`);
  if (advances > ABILITY_ADVANCE_PER_TIER * tier)
    warnings.push(`${advances} ability advances exceed the ${ABILITY_ADVANCE_PER_TIER}-per-Tier limit (${ABILITY_ADVANCE_PER_TIER * tier} at Tier ${tier}).`);
  if (spentVal > c.expEarned) warnings.push(`EXP overspent by ${spentVal - c.expEarned}.`);
  if (penalty > 0) warnings.push(`Over-encumbered by ${penalty} Bulk — Movement ${movement.value}, Initiative ${initiative.value}.`);
  if (penalty > 0 && (movement.value === 0 || initiative.value === 0)) warnings.push(`Movement or Initiative has reached 0 — you must drop something.`);
  if (strainPenalty > 0) warnings.push(`Strain ${strain} exceeds Reserve ${reserve.value} — all abilities & derived stats −${strainPenalty}.`);
  if (incapacitated) warnings.push(`Incapacitated — Unconscious 1d6 minutes, Helpless (all hits land as Lethal). Second Wind: then shed all Strain, suffer 1d6 Corruption.`);
  for (const i of injuries) if (i.infectionDays != null) warnings.push(`${i.name} is an untreated Major Injury — systemic infection kills after ${i.infectionDays} Days without Surgical Treatment.`);
  if (c.noRestDays) warnings.push(`${c.noRestDays} Day${c.noRestDays === 1 ? '' : 's'} without Rest — Mind −${c.noRestDays} until you Rest three Watches.`);
  if (corruption.terminal) warnings.push(`Terminal Corruption (${c.corruption}) — you Fall, or take a Fixation instead.`);

  return {
    char: c, tier, size, height: c.height, weight,
    ability, movement, speeds, initiative, ap, reserve,
    strain, strainPenalty, injuries, incapacitated, noRestDays: c.noRestDays,
    conditions: c.conditions,
    maxEnc, carried: carriedRounded, stowed, penalty, push, lift, panic,
    houseDt, houseSt, houseShakes,
    corruption,
    skills, defenses, disciplines, byKind, exp, warnings,
  };
}
