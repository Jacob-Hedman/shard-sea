// Kriegsmesser character rules — the single source of truth for every calculation.
// Pure functions, no DOM, no framework: shared by the read-only sheet, the builder,
// and node tests. Every derived value is returned as { value, formula, parts } so
// the UI can always show HOW a number was reached (the project's core requirement).
//
// Rules cross-checked against the PHB (1_Making Characters/e_Tests and Skills,
// f_Ability Thresholds; 2_Survival; ADVANCEMENT economy). Where the group's Google
// Sheet used a manual input that disagreed with the PHB, the PHB wins.

// ---- constants ---------------------------------------------------------
export const ABILITIES = ['body', 'mind', 'reflex'];
export const ABILITY_LABEL = { body: 'Body', mind: 'Mind', reflex: 'Reflex' };

// the 10 Skills in book order, each governed by an Ability (PHB e_Tests §Ability Bonuses)
export const SKILLS = [
  { slug: 'immanence', name: 'Immanence', ability: 'mind' },
  { slug: 'action', name: 'Action', ability: 'reflex' },
  { slug: 'potence', name: 'Potence', ability: 'reflex' },
  { slug: 'vitality', name: 'Vitality', ability: 'body' },
  { slug: 'resolve', name: 'Resolve', ability: 'mind' },
  { slug: 'creation', name: 'Creation', ability: 'mind' },
  { slug: 'traversal', name: 'Traversal', ability: 'body' },
  { slug: 'darkness', name: 'Darkness', ability: 'reflex' },
  { slug: 'luminance', name: 'Luminance', ability: 'mind' },
  { slug: 'unity', name: 'Unity', ability: 'body' },
];
export const SKILL_BY_SLUG = Object.fromEntries(SKILLS.map((s) => [s.slug, s]));
export const PRINCIPAL_SKILLS = ['action', 'potence', 'vitality', 'resolve'];
export const MAX_SKILLS = 5;
export const MAX_PRINCIPAL = 2;

export const ST_BASE = 3;                 // Strain Threshold = Mind + 3
export const INJURY_STEPS = [             // Scrapes / Shakes ladder above the threshold
  { key: 'minor', label: 'Minor', add: 0 },
  { key: 'moderate', label: 'Moderate', add: 10 },
  { key: 'major', label: 'Major', add: 20 },
  { key: 'lethal', label: 'Lethal', add: 30 },
];
export const CORRUPTION_SCALE = [
  { key: 'clear', label: 'Clear', min: 0, max: 5 },
  { key: 'dark', label: 'Dark', min: 6, max: 11 },
  { key: 'morbid', label: 'Morbid', min: 12, max: 17 },
];
export const AP_PER_TURN = 3;               // gain 3 AP at the start of your Turn (PHB Combat)
// Panic Risk pool sizes by severity; reduced by your Mind bonus, minimum one.
export const PANIC_POOL = { minor: 2, moderate: 3, major: 6 };
// EXP economy (PHB advancement + the group's ADVANCEMENT sheet)
export const CREATION_EXP = 500;
export const ABILITY_ADVANCE_PER_TIER = 6;   // ≤ 6 ability advances per Tier
export const TIER_COST_CUMULATIVE = { 1: 0, 2: 300, 3: 1300 };
export const MAX_TIER = 3;

const ex = (value, formula, parts = []) => ({ value, formula, parts });

// ---- primitives --------------------------------------------------------
/** Ability Bonus = floor(Ability / 6): 6→+1, 12→+2, 18→+3 (PHB f_Ability Thresholds). */
export function abilityBonus(adjusted) {
  return Math.max(0, Math.floor(adjusted / 6));
}

/** Adjusted Ability = Base + Permanent bonus + Temp − strain penalty (min 0).
 *  `temp` is a temporary spell/item swing kept separate from the real score.
 *  Strain only bites once it exceeds your Reserve (PHB a_Health), so `penalty`
 *  is that excess. Temp raises everything derived from Adjusted, but by design it
 *  does NOT unlock Threshold feats or change Reserve — those gate on the real score. */
export function adjustedAbility(base, bonus, temp, penalty) {
  const bits = ['Base'];
  if (bonus) bits.push('Bonus');
  if (temp) bits.push('Temp');
  const formula = bits.join(' + ') + (penalty ? ' − strain over Reserve' : '');
  return ex(
    Math.max(0, base + bonus + temp - penalty),
    formula,
    [
      { label: 'Base', value: base },
      { label: 'Bonus', value: bonus },
      { label: 'Temp', value: temp },
      { label: 'strain', value: -penalty },
    ].filter((p) => p.label === 'Base' || p.value !== 0),
  );
}

/** Reserve = Tier + Body Bonus (your capacity to soak Strain before it hurts). */
export function reserve(tier, bodyBonus) {
  return ex(tier + bodyBonus, 'Tier + Body bonus', [{ label: 'Tier', value: tier }, { label: 'Body bonus', value: bodyBonus }]);
}
export const panicPool = (base, mindBonus) => Math.max(1, base - mindBonus);

/** Discipline: total EXP to hold degree D = 50 × (1+2+…+D). */
export function disciplineCost(degree) {
  const total = 50 * (degree * (degree + 1)) / 2;
  return ex(total, `50 × (${Array.from({ length: degree }, (_, i) => i + 1).join('+') || 0})`);
}
export const disciplineNextCost = (degree) => 50 * (degree + 1);
export const disciplineCapPerSkill = (tier) => 2 * tier;   // degree ≤ 2×Tier
export const disciplineCapTotal = (tier) => 6 * tier;      // total degrees ≤ 6×Tier

/** N ability advances cost 100 × the Tier they were bought at; grouped 6-per-tier. */
export function abilityAdvanceCost(advances) {
  let total = 0;
  for (let i = 1; i <= advances; i++) total += 100 * Math.ceil(i / ABILITY_ADVANCE_PER_TIER);
  return total;
}

/** Foundry roll string. Boon = +1 die keep-highest-2; Bane = keep-lowest-2; they cancel. */
export function foundryRoll(mod, boons = 0, banes = 0, flavor = '') {
  const net = (boons | 0) - (banes | 0);
  const dice = 2 + Math.abs(net);
  const pool = net === 0 ? '2d6' : `${dice}d6${net > 0 ? 'kh2' : 'kl2'}`;
  const m = mod > 0 ? ` + ${mod}` : mod < 0 ? ` - ${-mod}` : '';
  const f = flavor ? ` # ${flavor}` : '';
  return `/r ${pool}${m}${f}`;
}

export function corruptionBand(v) {
  return (CORRUPTION_SCALE.find((b) => v >= b.min && v <= b.max) || CORRUPTION_SCALE[CORRUPTION_SCALE.length - 1]).label;
}
