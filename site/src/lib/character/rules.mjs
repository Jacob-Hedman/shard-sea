// Kriegsmesser character rules — the single source of truth for every calculation.
// Pure functions, no DOM, no framework: shared by the read-only sheet, the builder,
// and node tests. Every derived value is returned as { value, formula, parts } so
// the UI can always show HOW a number was reached (the project's core requirement).
//
// Rules cross-checked line-by-line against the PHB v17 vault. Where the group's
// Google Sheet used a manual input that disagreed with the PHB, the PHB wins.
// Anything the PHB does NOT define is marked HOUSE RULE and labelled as such in the UI.

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
// Attacks: Melee uses Action/Vitality, Ranged uses Potence/Resolve (PHB b_Attacks §Melee/Ranged).
export const MELEE_SKILLS = ['action', 'vitality'];
export const RANGED_SKILLS = ['potence', 'resolve'];
export const ATTACK_MODE_SKILLS = { Melee: MELEE_SKILLS, Ranged: RANGED_SKILLS };
export const MAX_SKILLS = 5;
export const MAX_PRINCIPAL = 2;

export const DEFAULT_DC = 8;                // PHB e_Tests: "Difficulty has a default value of 8"
// The tier difficulty ladder (PHB e_Tests). "If you lack the Skill, default T to 0 for this chart."
export const DIFFICULTY_LADDER = [
  { key: 'minor', label: 'Minor', add: 6, approx: '80%' },
  { key: 'moderate', label: 'Moderate', add: 8, approx: '60%' },
  { key: 'major', label: 'Major', add: 10, approx: '30%' },
  { key: 'extreme', label: 'Extreme', add: 12, approx: '10%' },
];

// Base Damage per Damage Type (PHB b_Attacks §Types of Damage). Used when a weapon's
// trait string names a type without an explicit "(n)".
export const BASE_DAMAGE = {
  cutting: 1, crushing: 1, piercing: 2, frost: 2, impaling: 3, rending: 3,
  traumatic: 3, voltaic: 3, incendiary: 3, chaos: 3, order: 3, explosive: 4, catastrophic: 6,
};
export const DAMAGE_TYPES = Object.keys(BASE_DAMAGE);
// Damage Types group into categories, and Armor Ratings are written using either
// (e.g. "Physical, Incendiary" covers every Physical type plus Incendiary).
export const DAMAGE_CATEGORY = {
  cutting: 'Physical', crushing: 'Physical', piercing: 'Physical', impaling: 'Physical',
  rending: 'Physical', traumatic: 'Physical', explosive: 'Physical', catastrophic: 'Physical',
  frost: 'Energy', voltaic: 'Energy', incendiary: 'Energy', chaos: 'Energy', order: 'Energy',
};
/** Does this armor Rating negate that damage type? (PHB a_Health §Armor) */
export function ratingCovers(rating, type) {
  const r = String(rating || '').toLowerCase();
  if (!r) return false;
  const t = String(type || '').toLowerCase();
  if (r.includes('all')) return true;
  return r.includes(t) || r.includes(String(DAMAGE_CATEGORY[t] || '').toLowerCase());
}

// Strain comes in three types, tracked separately below your Reserve (PHB a_Health).
// Their total, in excess of Reserve, is what drops your abilities.
export const STRAIN_TYPES = [
  { key: 'standard', label: 'Standard', mark: '/', sheds: 'expires in 10 minutes' },
  { key: 'persistent', label: 'Persistent', mark: '✕', sheds: 'shed by Resting' },
  { key: 'permanent', label: 'Permanent', mark: '✱', sheds: 'from Injuries — needs healing' },
];
// How each Injury Severity is removed (PHB b_Attacks §Treating Injuries).
export const INJURY_REMOVAL = {
  Minor: 'First-Aid, or Rest',
  Moderate: 'Recovery — 10× Injury Strain',
  Major: 'Surgery, then Recovery ×3',
  Lethal: 'unrecoverable — you are dead',
};
export const INJURY_SEVERITIES = ['Minor', 'Moderate', 'Major', 'Lethal'];
// How each Condition is ended (the PHB's *Counter-Action* notes, f_Conditions / a_Health).
export const CONDITION_COUNTERS = {
  restrained: 'Struggle (Action or Vitality vs the holder)',
  prone: 'Maneuver to Get Up (+1 AP)',
  bleeding: 'First-Aid',
  suffocating: 'Hold your Breath',
  'on-fire': 'DC 12 Potence or Action (DC 8 with water; instant if submerged)',
  blind: 'Spot to Target beyond Touch range',
  linked: 'break the link, or Struggle',
};
// Only Doomed_x stacks with itself: "All applications of this Condition stack."
// Everything else: "The same Condition does not Stack with itself" (PHB f_Conditions).
export const STACKING_CONDITIONS = ['doomed-x'];
/** Untreated Major injuries kill you: "Days in excess of 10 minus the Injury Strain". */
export const majorInfectionDays = (strain) => Math.max(0, 10 - (Number(strain) || 0));

export const CORRUPTION_SCALE = [
  { key: 'clear', label: 'Clear', min: 0, max: 5, pool: 3 },
  { key: 'dark', label: 'Dark', min: 6, max: 11, pool: 5 },
  { key: 'morbid', label: 'Morbid', min: 12, max: 17, pool: 7 },
  { key: 'terminal', label: 'Terminal', min: 18, max: Infinity, pool: 7 },
];
export const AP_PER_TURN = 3;               // gain 3 AP at the start of your Turn (PHB b_Combat)
// Panic Risk pool sizes by severity; reduced by your Mind bonus, minimum one.
export const PANIC_POOL = { minor: 2, moderate: 3, major: 6 };
// EXP economy (PHB a_Character Creation and Advancement)
export const CREATION_EXP = 500;
export const ABILITY_ADVANCE_PER_TIER = 6;   // ≤ 6 ability advances per Tier
export const TIER_COST_CUMULATIVE = { 1: 0, 2: 300, 3: 1300 };
export const MAX_TIER = 3;
export const DEGREES_PER_TIER = 6;           // 6 total Degrees required to advance Tier

// Movement Speeds derived from your Movement (PHB c_Movement §Universal Speeds).
export const SPEEDS = [
  { key: 'run', label: 'Run / Walk', div: 1 },
  { key: 'climb', label: 'Climb', div: 2 },
  { key: 'swim', label: 'Swim', div: 3 },
];
// Size categories by height in Meters (PHB a_Character Creation §Tertiary Values).
export const SIZES = [
  { label: 'Small', min: 0.5, max: 1.5 },
  { label: 'Medium', min: 1.5, max: 2.5 },
  { label: 'Large', min: 2.5, max: 3.5 },
  { label: 'Huge and Above', min: 3.5, max: Infinity },
];
export const sizeFor = (h) => (SIZES.find((s) => h >= s.min && h < s.max) || SIZES[SIZES.length - 1]).label;

// HOUSE RULES — these are NOT in the PHB v17. They come from the group's original
// spreadsheet. The UI must label them as house rules so nobody mistakes them for canon.
// The PHB resolves harm with a per-damage-type Injury Risk roll, not a threshold ladder.
export const HOUSE_ST_BASE = 3;              // "Strain Threshold = Mind + 3"
export const HOUSE_INJURY_STEPS = [
  { key: 'minor', label: 'Minor', add: 0 },
  { key: 'moderate', label: 'Moderate', add: 10 },
  { key: 'major', label: 'Major', add: 20 },
  { key: 'lethal', label: 'Lethal', add: 30 },
];

const ex = (value, formula, parts = []) => ({ value, formula, parts });

// ---- primitives --------------------------------------------------------
/** Ability Bonus = floor(Ability / 6): 6→+1, 12→+2, 18→+3 (PHB f_Ability Thresholds). */
export function abilityBonus(adjusted) {
  return Math.max(0, Math.floor(adjusted / 6));
}

/** Adjusted Ability = Base + Bonus + Temp − Tax − strain penalty, floored at 0.
 *  `temp` is a temporary spell/item swing kept separate from the real score.
 *  `tax`  is Taxing an Ability to auto-succeed a Test; cleared by Catching your Breath.
 *  Strain only bites once it exceeds your Reserve (PHB a_Health), so `penalty` is that
 *  excess. The returned `parts` ALWAYS sum to `value`, including when the floor applies. */
export function adjustedAbility(base, bonus, temp, penalty, tax = 0) {
  const raw = base + bonus + temp - tax - penalty;
  const value = Math.max(0, raw);
  const bits = ['Base'];
  if (bonus) bits.push('Bonus');
  if (temp) bits.push('Temp');
  if (tax) bits.push('− Tax');
  const parts = [
    { label: 'Base', value: base },
    { label: 'Bonus', value: bonus },
    { label: 'Temp', value: temp },
    { label: 'Tax', value: -tax },
    { label: 'strain', value: -penalty },
  ].filter((p) => p.label === 'Base' || p.value !== 0);
  // keep the printed sum honest when the floor clamps a negative result
  if (raw < 0) parts.push({ label: 'floor at 0', value: -raw });
  return ex(
    value,
    bits.join(' + ').replace('+ − Tax', '− Tax') + (penalty ? ' − strain over Reserve' : '') + (raw < 0 ? ' (min 0)' : ''),
    parts,
  );
}

/** Reserve = Tier + your PERMANENT Body Bonus (not the strain-adjusted one, or strain
 *  would spiral). PHB a_Health: "Reserve=(Your Tier)+(Your Body Bonus)". */
export function reserve(tier, bodyBonus) {
  return ex(tier + bodyBonus, 'Tier + permanent Body bonus',
    [{ label: 'Tier', value: tier }, { label: 'permanent Body bonus', value: bodyBonus }]);
}
export const panicPool = (base, mindBonus) => Math.max(1, base - mindBonus);
/** Depravity = 1 + one per six Corruption — scales a Fixation's effects (PHB c_Panic). */
export const depravity = (corruption) => 1 + Math.floor(Math.max(0, corruption) / 6);

/** Discipline: total EXP to hold degree D = 50 × (1+2+…+D). */
export function disciplineCost(degree) {
  const total = 50 * (degree * (degree + 1)) / 2;
  return ex(total, `50 × (${Array.from({ length: degree }, (_, i) => i + 1).join('+') || 0})`);
}
export const disciplineNextCost = (degree) => 50 * (degree + 1);
export const disciplineCapPerSkill = (tier) => 2 * tier;   // degree ≤ 2×Tier
export const disciplineCapTotal = (tier) => 6 * tier;      // total degrees ≤ 6×Tier
// Training ladder used when the GM calls for a Specialized Test (PHB a_Disciplines).
export const DISCIPLINE_RANKS = ['—', 'Novice', 'Initiate', 'Expert', 'Master'];
export const disciplineRank = (degree) => DISCIPLINE_RANKS[Math.min(degree, DISCIPLINE_RANKS.length - 1)] || '—';

/** N ability advances cost 100 × the Tier they were bought at ("INTEGRATION COST:
 *  100(your Tier)"), assuming the legal 6-per-Tier pacing. Never prices an advance
 *  above the character's current Tier — an over-cap character is flagged by a
 *  warning instead of being charged at a Tier they have not reached. */
export function abilityAdvanceCost(advances, tier = MAX_TIER) {
  let total = 0;
  for (let i = 1; i <= advances; i++) total += 100 * Math.min(tier, Math.ceil(i / ABILITY_ADVANCE_PER_TIER));
  return total;
}

/** The DC an attacker must beat to land a Test on you (PHB e_Tests §Resistance):
 *  8 + their target's Tier, +Tier again when the target is Skilled in the resisting Skill. */
export const resistDC = (tier, skilled) => DEFAULT_DC + tier * (skilled ? 2 : 1);

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
  if (!(v > 0)) return CORRUPTION_SCALE[0].label;          // negative/NaN reads as Clear, not Morbid
  return (CORRUPTION_SCALE.find((b) => v >= b.min && v <= b.max) || CORRUPTION_SCALE[CORRUPTION_SCALE.length - 1]).label;
}
export const corruptionPool = (v) =>
  (CORRUPTION_SCALE.find((b) => b.label === corruptionBand(v)) || CORRUPTION_SCALE[0]).pool;

/** Parse a codex Bulk value, which may be a formula rather than a number.
 *  Real examples: "3", "1/3", "T", "T+3", "10+T", "(2 times Your Height)",
 *  "10+(5 times your Height)". Substitutes the character's Tier and Height, so a
 *  Chain and Gambeson on a 1.8 m character is 19 Bulk, not 105.
 *  Returns { value, formula } — formula is the original text when it wasn't a plain number. */
export function parseBulk(raw, tier = 1, height = 1.8) {
  if (typeof raw === 'number') return { value: Number.isFinite(raw) ? raw : 0, formula: '' };
  const src = String(raw ?? '').trim();
  if (!src) return { value: 0, formula: '' };
  if (/^\d+(\.\d+)?$/.test(src)) return { value: Number(src), formula: '' };
  let s = src.toLowerCase()
    .replace(/(\d+(?:\.\d+)?)\s*times\s+(?:your\s+)?height/g, '($1*H)')
    .replace(/\byour\s+height\b|\bheight\b/g, 'H')
    .replace(/\bt\b/g, 'T')
    .replace(/[×x]/g, '*')
    .replace(/\s+/g, '');
  s = s.replace(/T/g, `(${tier})`).replace(/H/g, `(${height})`);
  if (!/^[\d.+\-*/()]+$/.test(s)) return { value: 0, formula: src };
  try {
    // eslint-disable-next-line no-new-func -- input is codex data already restricted to arithmetic
    const v = Function(`"use strict";return (${s})`)();
    return Number.isFinite(v) ? { value: Math.round(v * 100) / 100, formula: src } : { value: 0, formula: src };
  } catch { return { value: 0, formula: src }; }
}

/** Damage chips for a weapon's trait string, applying the PHB base-damage table,
 *  the "bare Vicious means Vicious_1" rule, and the Blunted floor. */
export function weaponDamage(traits) {
  const t = String(traits || '');
  const vm = /\bVicious(?:[_ -](-?\d+))?/i.exec(t);
  const vicious = vm ? (vm[1] != null ? Number(vm[1]) : 1) : 0;
  const types = Object.keys(BASE_DAMAGE).map((k) => k[0].toUpperCase() + k.slice(1)).join('|');
  const re = new RegExp(`\\b(${types})\\b\\s*(?:\\((\\d+)\\))?`, 'gi');
  const dmg = [];
  for (const m of t.matchAll(re)) {
    const key = m[1].toLowerCase();
    const base = m[2] != null ? Number(m[2]) : (BASE_DAMAGE[key] ?? 1);
    const total = base + vicious;
    const label = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    // "If an instance of Damage would be less than one, it is Blunted instead."
    dmg.push({ type: label, value: total, blunted: total < 1, text: total < 1 ? `${label} Blunted` : `${label} ${total}` });
  }
  const other = t.split(',').map((s) => s.trim()).filter((s) =>
    s && !new RegExp(`^(${types})\\b`, 'i').test(s) && !/^Vicious/i.test(s));
  return { dmg, vicious, viciousImplicit: !!vm && vm[1] == null, other };
}
