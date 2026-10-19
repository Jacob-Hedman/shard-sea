// @ts-nocheck — geometry, alphabets and drawing are ported verbatim from the D&D 3.5 Codex
// (dnd35-site src/lib/sigil.ts, itself from its redesign prototype); the reading of an entry
// (sigilRow / spec) is Shard-sea's own. Colours are inverted: a white plate with black strokes.
/* Sigil grammar v1.0: every entry's plate is generated from its own data, and every mark means something.

   Plate anatomy (400 × 400; the same position always means the same thing):
     CODE      top line            file number, plus hit die, level, price or similar in the corner
     CORE      centre (200,180)    what it is: the power family / school / discipline / type / category
     COUNT     copies or rings     how much: BAB, level, prerequisite depth, caster level, cost, size
     INNER     centre              how it works: casting depth, reach, what it unlocks, aura, damage type
     ABILITY   row at y = 312      Body · Mind · Reflex: the Ability that governs it (its Skill's, or its own)
     THEMES    right column        up to 3 theme glyphs from one shared alphabet
     FRAME     border style        the group: Character solid · Rules of Play dashed · Disciplines & Magic double · Equipment brackets · World heavy
     POWER     edges               a Tier 3 entry earns a corona

   Build time only: sigilRow() reads full records (node:fs). The browser gets finished SVG plus
   src/scripts/sigil.ts for the motion. */
import { loadFull } from './data';
import { sectionByKind } from './sections';
import { SKILLS } from './character/rules.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const f1 = (n) => (+n).toFixed(2);
const num = (s) => { const m = String(s ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };

// ------------------------------------------------------------ geometry helpers (unit space, −1..1)
const P = (pts, close = true) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L') + (close ? ' Z' : '');
const poly = (n, r = 1, rot = -Math.PI / 2, cx = 0, cy = 0) => P(Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + (i * 2 * Math.PI) / n), cy + r * Math.sin(rot + (i * 2 * Math.PI) / n)]));
const star = (n, R, r, cx = 0, cy = 0) => P(Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; }));
const circ = (r, cx = 0, cy = 0) => `M${f1(cx - r)} ${f1(cy)} a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0 a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
const line = (x1, y1, x2, y2) => `M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}`;
const lens = (w = 1, h = 0.55) => `M${-w} 0 Q0 ${-h * 1.8} ${w} 0 Q0 ${h * 1.8} ${-w} 0 Z`;
const tri = (s = 1) => P([[-s, -0.58 * s], [s, -0.58 * s], [0, 1.15 * s]]); // inverted, centred on its centroid
const triUp = (s = 1) => P([[0, -1.1 * s], [s, 0.62 * s], [-s, 0.62 * s]]);
const square = (s = 0.82) => P([[-s, -s], [s, -s], [s, s], [-s, s]]);
const spiral = (r = 1, turns = 2.2) => { const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * turns * 2 * Math.PI; pts.push([Math.cos(a) * r * t, Math.sin(a) * r * t]); } return P(pts, false); };
const arrow = (x1, y1, x2, y2, h = 0.22) => { const a = Math.atan2(y2 - y1, x2 - x1); return line(x1, y1, x2, y2) + ' ' + P([[x2 + h * Math.cos(a + 2.6), y2 + h * Math.sin(a + 2.6)], [x2, y2], [x2 + h * Math.cos(a - 2.6), y2 + h * Math.sin(a - 2.6)]], false); };

// ------------------------------------------------------------ the four powers
const FAMILY = {
  martial: { label: 'Martial', d: square(0.8) },
  arcane: { label: 'Arcane', d: tri(0.95) },
  divine: { label: 'Divine', d: circ(0.86) },
  psionic: { label: 'Psionic', d: lens(1, 0.55) },
};

// ------------------------------------------------------------ core alphabets
const SCHOOL = {
  Abjuration: poly(6, 0.9, 0), Conjuration: circ(0.8) + ' ' + [0, 1, 2, 3].map((i) => { const a = (i * Math.PI) / 2; return arrow(Math.cos(a) * 1.05, Math.sin(a) * 1.05, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.16); }).join(' '),
  Divination: lens(1, 0.5) + ' ' + circ(0.26), Enchantment: circ(0.9) + ' ' + spiral(0.7), Evocation: star(8, 1, 0.42),
  Illusion: triUp(0.72).replace(/^M/, 'M') + ' ' + P([[0.2, -0.8], [0.95, 0.72], [-0.55, 0.72]]), Necromancy: P([[-0.7, -0.9], [0.7, -0.9], [-0.7, 0.9], [0.7, 0.9]]),
  Transmutation: circ(0.95) + ' ' + triUp(0.72), Universal: circ(0.95) + ' ' + P([[-0.67, -0.67], [0.67, -0.67], [0.67, 0.67], [-0.67, 0.67]]),
};
const DISC = {
  Clairsentience: lens(1, 0.5) + ' ' + circ(0.22) + ' ' + [-0.5, 0, 0.5].map((x) => line(x * 1.2, -0.62, x * 1.6, -1)).join(' '),
  Metacreativity: lens(1, 0.5) + ' ' + P([[-0.28, -0.28], [0.28, -0.28], [0.28, 0.28], [-0.28, 0.28]]),
  Psychokinesis: lens(1, 0.5) + ' ' + arrow(0, 0, 0.9, -0.9) + ' ' + arrow(0, 0, -0.9, 0.9),
  Psychometabolism: lens(1, 0.5) + ' ' + line(-0.3, 0, 0.3, 0) + ' ' + line(0, -0.3, 0, 0.3),
  Psychoportation: lens(1, 0.5) + ' ' + arrow(-1.1, 0.5, 1.1, -0.5),
  Telepathy: lens(0.55, 0.5).replace(/-0\.55 0/g, '-0.55 0') + ' ' + `M-0.1 0 Q-0.55 -0.55 -1 0 Q-0.55 0.55 -0.1 0 Z M0.1 0 Q0.55 -0.55 1 0 Q0.55 0.55 0.1 0 Z`,
};
const FEAT = {
  General: square(0.8), Fighter: square(0.8) + ' ' + line(-0.8, -0.8, 0.8, 0.8) + ' ' + line(0.8, -0.8, -0.8, 0.8),
  Metamagic: tri(0.95) + ' ' + star(4, 0.34, 0.1, 0, -0.1), 'Item Creation': square(0.8) + ' ' + tri(0.66).replace(/(-?\d+\.\d+) (-?\d+\.\d+)/g, (m, x, y) => `${x} ${f1(+y - 0.12)}`),
  Divine: circ(0.86), Wild: circ(0.86) + ' ' + [-0.35, 0, 0.35].map((x) => `M${x - 0.15} -0.45 Q${x + 0.2} 0 ${x - 0.1} 0.45`).join(' '),
  Psionic: lens(1, 0.55), Metapsionic: lens(1, 0.55) + ' ' + star(4, 0.3, 0.09), Epic: square(0.8) + ' ' + P([[-0.8, -0.8], [-0.8, -1.25], [-0.4, -0.98], [0, -1.3], [0.4, -0.98], [0.8, -1.25], [0.8, -0.8]], false), Special: poly(4, 1, 0),
};
const ITEM = {
  Armor: P([[-0.7, -0.85], [-0.25, -0.85], [0, -0.6], [0.25, -0.85], [0.7, -0.85], [0.6, 0.85], [-0.6, 0.85]]), Shield: circ(0.9) + ' ' + circ(0.2),
  Weapon: line(0, -1, 0, 0.55) + ' ' + line(-0.45, 0.55, 0.45, 0.55) + ' ' + line(0, 0.55, 0, 1) + ' ' + P([[-0.12, -0.75], [0, -1.05], [0.12, -0.75]], false),
  Ring: circ(0.8) + ' ' + circ(0.55), Rod: line(0, -0.6, 0, 1) + ' ' + circ(0.28, 0, -0.85), Staff: line(0, -0.55, 0, 1.05) + ' ' + triUp(0.32).replace(/(-?\d+\.\d+) (-?\d+\.\d+)/g, (m, x, y) => `${x} ${f1(+y - 0.8)}`),
  Wand: line(-0.8, 0.8, 0.45, -0.45) + ' ' + star(4, 0.38, 0.1, 0.6, -0.6), Wondrous: circ(0.95) + ' ' + star(4, 0.8, 0.22),
  Artifact: P([[-0.9, 0.6], [-0.9, -0.5], [-0.45, 0], [0, -0.8], [0.45, 0], [0.9, -0.5], [0.9, 0.6]]) + ' ' + star(4, 0.22, 0.07, 0, 0.25),
  Potion: circ(0.6, 0, 0.3) + ' ' + P([[-0.18, -0.3], [-0.18, -0.85], [0.18, -0.85], [0.18, -0.3]], false), Oil: `M0 -1 C0.75 -0.1 0.7 0.9 0 0.9 C-0.7 0.9 -0.75 -0.1 0 -1 Z`,
  Scroll: P([[-0.7, -0.6], [0.7, -0.6], [0.7, 0.6], [-0.7, 0.6]]) + ' ' + circ(0.15, -0.7, -0.6) + ' ' + circ(0.15, 0.7, 0.6),
  Cursed: circ(0.9) + ' ' + line(-0.6, -0.6, 0.6, 0.6) + ' ' + line(0.6, -0.6, -0.6, 0.6), Psicrown: P([[-0.9, 0.4], [-0.9, -0.6], [-0.45, -0.15], [0, -0.85], [0.45, -0.15], [0.9, -0.6], [0.9, 0.4]]) + ' ' + lens(0.4, 0.2).replace('M-0.4 0', 'M-0.4 0.15'),
  Universal: circ(0.95) + ' ' + square(0.66),
};
const EQUIP = { Weapons: ITEM.Weapon, 'Armor and Shields': `M-0.75 -0.85 H0.75 V0 C0.75 0.5 0 0.95 0 0.95 C0 0.95 -0.75 0.5 -0.75 0 Z`, 'Goods and Services': circ(0.9) + ' ' + square(0.28), 'Trade Goods': square(0.8) + ' ' + line(-0.8, -0.8, 0.8, 0.8) + ' ' + line(-0.8, 0.8, 0.8, -0.8) };
const ABIL = { Str: square(0.8), Dex: arrow(-0.8, 0.8, 0.8, -0.8, 0.4), Con: `M0 0.9 C-1 0.1 -0.8 -0.9 0 -0.35 C0.8 -0.9 1 0.1 0 0.9 Z`, Int: tri(0.95), Wis: circ(0.86), Cha: star(5, 1, 0.42) };
const CHAPTER = { Combat: square(0.8) + ' ' + line(-0.55, -0.55, 0.55, 0.55) + ' ' + line(0.55, -0.55, -0.55, 0.55), 'Creating Magic Items': FEAT['Item Creation'] };

// ------------------------------------------------------------ the theme alphabet (42, shared by every kind)
const T = {
  Fire: triUp(0.9), Water: tri(0.85), Air: triUp(0.9) + ' ' + line(-0.55, 0.1, 0.55, 0.1), Earth: tri(0.85) + ' ' + line(-0.5, -0.05, 0.5, -0.05),
  Cold: [0, 1, 2].map((i) => { const a = (i * Math.PI) / 3; return line(Math.cos(a) * 0.95, Math.sin(a) * 0.95, -Math.cos(a) * 0.95, -Math.sin(a) * 0.95); }).join(' '),
  Electricity: P([[-0.25, -1], [0.3, -0.1], [-0.25, 0.1], [0.3, 1]], false), Acid: `M0 -0.95 C0.7 -0.1 0.65 0.9 0 0.9 C-0.65 0.9 -0.7 -0.1 0 -0.95 Z ` + circ(0.16, 0, 0.35),
  Sonic: [0.35, 0.65, 0.95].map((r) => `M${f1(r * 0.6)} ${f1(-r * 0.8)} A${r} ${r} 0 0 1 ${f1(r * 0.6)} ${f1(r * 0.8)}`).join(' ') + ' ' + circ(0.12, -0.3, 0),
  Force: poly(4, 1, 0) + ' ' + poly(4, 0.45, 0), Light: circ(0.4) + ' ' + Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return line(Math.cos(a) * 0.62, Math.sin(a) * 0.62, Math.cos(a) * 0.98, Math.sin(a) * 0.98); }).join(' '),
  Shadow: `M0.2 -0.9 A0.9 0.9 0 1 0 0.2 0.9 A0.65 0.65 0 1 1 0.2 -0.9 Z`, Poison: `M0 -0.95 C0.7 -0.1 0.65 0.9 0 0.9 C-0.65 0.9 -0.7 -0.1 0 -0.95 Z ` + line(-0.25, 0.15, 0.25, 0.55) + ' ' + line(0.25, 0.15, -0.25, 0.55),
  Death: line(-0.8, -0.8, 0.8, 0.8) + ' ' + line(0.8, -0.8, -0.8, 0.8), Disease: circ(0.9) + ' ' + circ(0.14, 0, -0.4) + ' ' + circ(0.14, -0.35, 0.3) + ' ' + circ(0.14, 0.35, 0.3),
  Good: star(4, 1, 0.3), Evil: P([[-0.85, -0.9], [0, 0.95], [0.85, -0.9]], false) + ' ' + line(-0.45, -0.1, 0.45, -0.1), Lawful: square(0.75) + ' ' + circ(0.14), Chaotic: Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return arrow(0, 0, Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.2); }).join(' '),
  Undead: circ(0.6, 0, -0.25) + ' ' + line(-0.35, 0.55, -0.35, 0.95) + ' ' + line(0, 0.4, 0, 0.95) + ' ' + line(0.35, 0.55, 0.35, 0.95) + ' ' + circ(0.12, -0.22, -0.3) + ' ' + circ(0.12, 0.22, -0.3),
  Dragon: P([[-1, 0.6], [0, -0.9], [1, 0.6], [0.4, 0.15], [0, 0.6], [-0.4, 0.15]]), Animal: circ(0.38, 0, 0.35) + ' ' + circ(0.17, -0.55, -0.3) + ' ' + circ(0.17, 0, -0.62) + ' ' + circ(0.17, 0.55, -0.3),
  Plant: `M0 0.95 C-0.95 0 -0.4 -0.95 0 -0.95 C0.4 -0.95 0.95 0 0 0.95 Z ` + line(0, -0.6, 0, 0.95), Construct: circ(0.55) + ' ' + Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return line(Math.cos(a) * 0.55, Math.sin(a) * 0.55, Math.cos(a) * 0.95, Math.sin(a) * 0.95); }).join(' ') + ' ' + circ(0.18),
  Giant: circ(0.22, 0, -0.75) + ' ' + line(0, -0.5, 0, 0.4) + ' ' + line(-0.55, -0.25, 0.55, -0.25) + ' ' + line(0, 0.4, -0.4, 1) + ' ' + line(0, 0.4, 0.4, 1), Aberration: circ(0.42, 0, -0.35) + ' ' + circ(0.14, 0, -0.35) + ' ' + [-0.4, 0, 0.4].map((x) => `M${x} 0.1 q0.2 0.3 0 0.45 q-0.2 0.2 0 0.4`).join(' '),
  Celestial: circ(0.45, 0, 0.3) + ' ' + `M-0.6 -0.65 A0.6 0.22 0 1 0 0.6 -0.65 A0.6 0.22 0 1 0 -0.6 -0.65`, Fey: `M0 0 C-0.9 -1 -1 0.2 0 0 C1 0.2 0.9 -1 0 0 M0 0 C-0.6 0.9 -0.1 0.9 0 0 C0.1 0.9 0.6 0.9 0 0`,
  Fiendish: `M-0.35 0.9 C-0.35 0 -0.9 -0.3 -0.8 -0.95 M0.35 0.9 C0.35 0 0.9 -0.3 0.8 -0.95 M-0.35 0.9 H0.35`,
  Defense: `M-0.75 -0.85 H0.75 V0 C0.75 0.5 0 0.95 0 0.95 C0 0.95 -0.75 0.5 -0.75 0 Z`, Debuff: arrow(0, -0.95, 0, 0.9, 0.4), Mind: spiral(0.95), 'Mind-Affecting': spiral(0.6) + ' ' + circ(0.95),
  Stealth: Array.from({ length: 8 }, (_, i) => { const a1 = (i * Math.PI) / 4, a2 = a1 + Math.PI / 8; return `M${f1(Math.cos(a1) * 0.85)} ${f1(Math.sin(a1) * 0.85)} A0.85 0.85 0 0 1 ${f1(Math.cos(a2) * 0.85)} ${f1(Math.sin(a2) * 0.85)}`; }).join(' '),
  Mobility: P([[-0.8, -0.7], [-0.1, 0], [-0.8, 0.7]], false) + ' ' + P([[0.05, -0.7], [0.75, 0], [0.05, 0.7]], false), Healing: line(0, -0.9, 0, 0.9) + ' ' + line(-0.9, 0, 0.9, 0),
  Summoning: circ(0.9) + ' ' + arrow(0, -0.9, 0, -0.15, 0.2) + ' ' + circ(0.1, 0, 0.25), Divination: lens(1, 0.5) + ' ' + circ(0.24), Blasting: star(8, 1, 0.42), 'Battlefield control': line(-0.35, -0.9, -0.35, 0.9) + ' ' + line(0.35, -0.9, 0.35, 0.9) + ' ' + line(-0.9, -0.35, 0.9, -0.35) + ' ' + line(-0.9, 0.35, 0.9, 0.35),
  Illusion: SCHOOL.Illusion, Fear: line(0, -0.95, 0, 0.35) + ' ' + circ(0.12, 0, 0.75) + ' ' + circ(0.95), Necromantic: SCHOOL.Necromancy,
};
const THEMES = Object.keys(T);

// ------------------------------------------------------------ Shard-sea alphabets (built from the shared shapes)
ITEM.Tool = line(-0.75, 0.75, 0.3, -0.3) + ' ' + circ(0.32, 0.5, -0.5);
const SEAL = circ(0.95) + ' ' + star(5, 0.8, 0.32);
const DOC = P([[-0.7, -0.95], [0.4, -0.95], [0.7, -0.65], [0.7, 0.95], [-0.7, 0.95]]) + ' ' + [-0.45, -0.1, 0.25, 0.6].map((y) => line(-0.45, y, 0.45, y)).join(' ');
const ACTION = square(0.8) + ' ' + arrow(-0.5, 0, 0.55, 0, 0.3);
const ACTIVITY = P([[-0.6, -0.95], [0.6, -0.95], [-0.6, 0.95], [0.6, 0.95]]) + ' ' + line(-0.75, -0.95, 0.75, -0.95) + ' ' + line(-0.75, 0.95, 0.75, 0.95);
const CRYSTAL = P([[0, -1], [0.62, -0.3], [0.4, 0.9], [-0.4, 0.9], [-0.62, -0.3]]) + ' ' + line(0, -1, 0, 0.9) + ' ' + line(-0.62, -0.3, 0.62, -0.3);
const MECH = square(0.85) + ' ' + circ(0.42) + ' ' + Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return line(Math.cos(a) * 0.42, Math.sin(a) * 0.42, Math.cos(a) * 0.62, Math.sin(a) * 0.62); }).join(' ');
const BUILDING = P([[-0.8, 0.9], [-0.8, -0.2], [0, -0.9], [0.8, -0.2], [0.8, 0.9]]) + ' ' + P([[-0.22, 0.9], [-0.22, 0.35], [0.22, 0.35], [0.22, 0.9]], false);
const DISTRICT = square(0.85) + ' ' + line(-0.85, 0, 0.85, 0) + ' ' + line(0, -0.85, 0, 0.85);
const SHIP = `M-0.95 0.15 H0.95 L0.6 0.7 H-0.6 Z ` + line(0, 0.15, 0, -0.95) + ' ' + P([[0, -0.85], [0.6, -0.1], [0, -0.1]]);
const TRADE = square(0.8) + ' ' + line(-0.8, -0.8, 0.8, 0.8) + ' ' + line(-0.8, 0.8, 0.8, -0.8);
const TAG = P([[-0.9, -0.5], [0.4, -0.5], [0.95, 0], [0.4, 0.5], [-0.9, 0.5]]) + ' ' + circ(0.12, 0.35, 0);
const GROUPW = ITEM.Weapon + ' ' + square(0.95);
const THRESHOLD = P([[-0.9, 0.8], [-0.3, 0.8], [-0.3, 0.1], [0.3, 0.1], [0.3, -0.6], [0.9, -0.6]], false);
const BACKGROUND = circ(0.9) + ' ' + arrow(-0.6, 0.6, 0.55, -0.55, 0.3);

// The three Abilities take the old power families' shapes: Body the square, Mind the
// inverted triangle, Reflex the lens.
const ABILITY = {
  body: { label: 'Body', d: FAMILY.martial.d },
  mind: { label: 'Mind', d: FAMILY.arcane.d },
  reflex: { label: 'Reflex', d: FAMILY.psionic.d },
};
const SKILL_ABILITY = Object.fromEntries(SKILLS.map((s) => [s.name.toLowerCase(), s.ability]));
const abilityOfSkill = (skill) => SKILL_ABILITY[String(skill ?? '').toLowerCase().trim()] || '';

// Themes: read from the entry's own words (damage types and the setting's recurring forces).
const THEME_WORDS = [
  ['Fire', /\b(incendiary|fire|flame|burn)/i], ['Cold', /\b(frost|cold|ice|freez)/i],
  ['Electricity', /\b(voltaic|lightning|spark)/i], ['Poison', /\b(poison|venom|toxin)/i],
  ['Good', /\bholy\b/i], ['Evil', /\bunholy\b|\bdemon/i], ['Chaotic', /\bchaos\b/i], ['Lawful', /\border\b(?! to)/i],
  ['Shadow', /\b(shadow|darkness)\b/i], ['Light', /\blight\b(?! armor| weapon)/i], ['Healing', /\b(heal|mend|recover)/i],
  ['Fear', /\b(panic|fear)\b/i], ['Mind', /\b(corruption|fixation|sanity)\b/i], ['Water', /\b(water|sea|swim)/i],
  ['Air', /\b(wind|air|sky|fly)/i], ['Earth', /\b(earth|stone)\b/i], ['Force', /\bforce\b/i],
  ['Stealth', /\b(hidden|stealth|unseen|invisible)/i], ['Mobility', /\b(movement|leap|climb)\b/i], ['Defense', /\b(armor rating|negate|block)\b/i],
];
const textOf = (rec) => [rec.effect, rec.effects, rec.summary, rec.text, rec.description, rec.special, rec.passive].filter((x) => typeof x === 'string').join(' ');

// ------------------------------------------------------------ reading a full record into a compact sigil row
const tierOf = (rec) => { const t = num(rec.tier ?? rec.feat_tier); return isFinite(t) ? t : NaN; };
export function sigilRow(rec) {
  const fc = rec.facets ?? {};
  return {
    k: rec.kind, s: rec.slug, n: rec.name, i: rec.id ?? 0, fc, t: tierOf(rec),
    ab: rec.kind === 'skill' ? abilityOfSkill(rec.name) : rec.kind === 'threshold_feat' ? String(fc.ability?.[0] ?? '').toLowerCase()
      : abilityOfSkill(rec.skill ?? fc.skill?.[0]),
    ab2: rec.kind === 'archetype' ? (fc.skill ?? []).map(abilityOfSkill).filter(Boolean) : [],
    ap: num(rec.ap), mode: rec.mode ?? fc.mode?.[0] ?? '', sev: rec.severity ?? fc.severity?.[0] ?? '',
    cat: fc.category?.[0] ?? rec.category ?? '', grp: rec.weapon_group ?? '', court: rec.court ?? '', rank: rec.rank ?? '',
    rc: rec.rune_class ?? '', ak: rec.armor_kind ?? '', principal: rec.principal === true || /principal/i.test(String(rec.principal ?? fc.principal?.[0] ?? '')),
    feats: Array.isArray(rec.feats) ? rec.feats.length : 0, special: !!rec.is_special,
    rt: rec.record_type ?? '', custom: !!rec.custom,
    th: (() => { const t = textOf(rec); return THEME_WORDS.filter(([, re]) => re.test(t)).map(([n]) => n).slice(0, 3); })(),
  };
}

// ------------------------------------------------------------ the spec: which glyph, how many copies, what inner mark
export const families = (r) => (r.ab2.length ? [...new Set(r.ab2)] : r.ab ? [r.ab] : []);
export const themes = (r) => r.th.filter((x) => T[x]);
const SEV = { Minor: 1, Moderate: 2, Major: 3, Lethal: 4, Severe: 3 };
const COURT = { Elemental: T.Air, Forces: T.Force, Memories: T.Mind, Nymphs: T.Plant, Faeyer: T.Fey };
const DMG = { Incendiary: T.Fire, Frost: T.Cold, Voltaic: T.Electricity, Chaos: T.Chaotic, Order: T.Lawful, Explosive: T.Blasting, Catastrophic: T.Death, Traumatic: T.Debuff };
const RUNE = { Aether: SEAL, Force: T.Force, Matter: T.Earth, Mind: T.Mind, Time: ACTIVITY, Space: T.Mobility };

export function spec(r) {
  const s = { kind: r.k, fams: families(r), themes: themes(r), reading: [] };
  const add = (zone, label) => s.reading.push({ zone, label });
  const copies = (d, n) => { s.cores = [d]; s.count = Math.max(1, Math.min(4, n || 1)); s.countMode = 'copies'; };
  const tiered = (d, label) => {
    copies(d, isFinite(r.t) ? r.t : 1); add('core', label);
    add('count', isFinite(r.t) ? `Tier ${r.t} — ${r.t} outline${r.t > 1 ? 's' : ''}` : 'No Tier — 1 outline');
    if (isFinite(r.t)) s.corner = `T${r.t}`;
  };
  const ability = (ab) => {
    s.saves = { F: ab.includes('body'), R: ab.includes('mind'), W: ab.includes('reflex') };
    s.saveLabels = { F: 'BODY', R: 'MIND', W: 'REFLEX' };
    s.saveMode = 'good';
    add('saves', ab.length ? `Governed by ${ab.map((a) => ABILITY[a].label).join(' + ')}` : 'No governing Ability');
  };
  const byAbility = (label) => {
    const fams = s.fams.length ? s.fams : ['body'];
    s.cores = fams.map((a) => ABILITY[a].d);
    add('core', `${label}: ${fams.map((a) => ABILITY[a].label).join(' + ')} — ${fams.length > 1 ? 'overlaid shapes' : { body: 'square', mind: 'inverted triangle', reflex: 'lens' }[fams[0]]}`);
    ability(s.fams);
  };
  const k = r.k;
  if (k === 'skill') {
    byAbility('Skill'); s.count = 1; s.countMode = 'copies'; s.code = 'SKL';
    if (r.principal) { s.inner = { t: 'target' }; add('inner', 'A Principal Skill: attacks are made with it — dot with arrow'); }
    else add('inner', 'Not an attack Skill — empty centre');
  } else if (k === 'discipline') {
    byAbility('Discipline of a Skill'); s.count = Math.max(1, Math.min(4, Math.ceil(r.feats / 4))); s.countMode = 'copies'; s.code = 'DSC';
    add('count', `${r.feats} feat${r.feats === 1 ? '' : 's'} — ${s.count} outline${s.count > 1 ? 's' : ''}`);
    if (r.special) { s.inner = { t: 'glyph', d: star(4, 1, 0.3) }; add('inner', 'A special Discipline — star'); }
  } else if (k === 'feat') {
    byAbility('Feat of a Skill'); s.count = isFinite(r.t) ? Math.max(1, Math.min(4, r.t)) : 1; s.countMode = 'copies'; s.code = 'FEA';
    add('count', isFinite(r.t) ? `Tier ${r.t} — ${s.count} outline${s.count > 1 ? 's' : ''}` : 'No Tier — 1 outline');
    if (isFinite(r.t)) s.corner = `T${r.t}`;
    if (isFinite(r.ap) && r.ap > 0) { s.inner = { t: 'rays', n: Math.min(8, r.ap) }; add('inner', `${r.ap} AP — ${Math.min(8, r.ap)} ray${r.ap > 1 ? 's' : ''}`); }
    else add('inner', 'No AP cost — empty centre');
  } else if (k === 'threshold_feat') {
    byAbility('Threshold of an Ability'); copies(s.cores[0], 1); s.cores = [s.cores[0]]; s.code = 'THR';
    s.inner = { t: 'glyph', d: THRESHOLD }; add('inner', 'Threshold — the stepped line');
  } else if (k === 'archetype') {
    byAbility('Archetype of two Skills'); s.count = 1; s.countMode = 'copies'; s.code = 'ARC';
  } else if (k === 'background') { copies(BACKGROUND, 1); add('core', 'Background — where you come from'); s.code = 'BKG'; }
  else if (k === 'action') {
    copies(ACTION, isFinite(r.ap) ? r.ap : 1); add('core', `Action${r.cat ? '' : ''} — square with arrow`);
    add('count', isFinite(r.ap) ? `${r.ap} AP — ${Math.max(1, Math.min(4, r.ap))} outline${r.ap > 1 ? 's' : ''}` : 'AP varies — 1 outline');
    if (isFinite(r.ap)) s.corner = `${r.ap} AP`; s.code = 'ACT';
  } else if (k === 'activity') { copies(ACTIVITY, 1); add('core', 'Activity — the hourglass'); ability([abilityOfSkill(r.fc.skill?.[0])].filter(Boolean)); s.code = 'ACV'; }
  else if (k === 'condition') {
    const n = SEV[r.sev] || 1; copies(T.Debuff, n); add('core', 'Condition — the falling arrow'); add('count', `${r.sev || 'Unrated'} — ${n} outline${n > 1 ? 's' : ''}`); s.code = 'CON';
  } else if (k === 'damage_type') { copies(DMG[r.n] || ITEM.Weapon, 1); add('core', `Damage: ${r.n}`); add('count', r.cat || 'Damage type'); s.code = 'DMG'; }
  else if (k === 'fixation') { copies(T.Mind, 1); add('core', 'Fixation — the troubled mind'); s.code = 'FIX'; }
  else if (k === 'rune') { tiered(RUNE[r.rc] || SEAL, `Rune of ${r.rc || 'the Aether'}`); s.code = 'RUN'; }
  else if (k === 'ritual') { copies(SEAL, 1); add('core', 'Ritual — the sealed star'); s.code = 'RIT'; }
  else if (k === 'pact') { copies(T.Fiendish, 1); add('core', 'Demon Pact — the horns'); s.code = 'PCT'; }
  else if (k === 'spirit') {
    const n = /akthe/i.test(r.rank) ? 2 : 1; copies(COURT[r.court] || T.Celestial, n);
    add('core', `Spirit of the ${r.court || 'unknown'} Court`); add('count', `${r.rank || 'Unranked'} — ${n} outline${n > 1 ? 's' : ''}`); s.code = 'SPR';
  } else if (k === 'weapon') {
    tiered(ITEM.Weapon, `Weapon${r.grp ? ` · ${r.grp}` : ''}`); s.code = 'WPN';
    if (/ranged/i.test(r.mode)) { s.inner = { t: 'target' }; add('inner', 'Ranged — dot with arrow'); }
    else { s.inner = { t: 'touch' }; add('inner', 'Melee — solid dot'); }
  } else if (k === 'weapon_group') { copies(GROUPW, 1); add('core', 'Weapon Group — the boxed blade'); s.code = 'WGR'; }
  else if (k === 'weapon_trait') { copies(TAG, 1); add('core', 'Weapon Trait — the tag'); s.code = 'WTR'; }
  else if (k === 'armor') { tiered(/shield/i.test(r.ak) ? ITEM.Shield : ITEM.Armor, r.ak || 'Armor'); s.code = 'ARM'; }
  else if (k === 'consumable') { tiered(ITEM.Potion, `Consumable${r.cat ? ` · ${r.cat}` : ''}`); s.code = 'CNS'; }
  else if (k === 'artifice') { tiered(ITEM.Tool, `Artifice${r.cat ? ` · ${r.cat}` : ''}`); s.code = 'ART'; }
  else if (k === 'magic_item') {
    const enchant = /enchantment/i.test(r.rt); const ring = /\b(ring|band)\b/i.test(r.n);
    tiered(enchant ? ITEM.Wand : ring ? ITEM.Ring : ITEM.Wondrous, enchant ? r.rt : ring ? 'Magic ring' : 'Magic item'); s.code = 'MGI';
  } else if (k === 'martech') { tiered(MECH, `Martech${r.cat ? ` · ${r.cat}` : ''}`); s.code = 'MTC'; }
  else if (k === 'material') { copies(CRYSTAL, 1); add('core', 'Unique Material — the crystal'); s.code = 'MAT'; }
  else if (k === 'resource') { copies(/unique/i.test(r.cat) ? CRYSTAL : TRADE, 1); add('core', r.cat || 'Resource'); s.code = 'RES'; }
  else if (k === 'residue') { copies(CRYSTAL, 1); s.inner = { t: 'glyph', d: circ(0.5) }; add('core', `Residue${r.cat ? ` · ${r.cat}` : ''}`); s.code = 'RSD'; }
  else if (k === 'ship') { tiered(SHIP, r.cat || 'Ship'); s.code = 'SHP'; }
  else if (k === 'city_zone') { copies(DISTRICT, 1); add('core', 'City District'); s.code = 'CTY'; }
  else if (k === 'structure') { tiered(BUILDING, r.cat || 'Structure'); s.code = 'STR'; }
  else { copies(DOC, 1); add('core', 'Rules chapter — the page'); s.code = 'PAG'; }
  add('themes', s.themes.length ? 'Themes: ' + s.themes.join(', ') : 'No theme marks');
  if (isFinite(r.t) && r.t >= 3 && !['action'].includes(k)) { s.power = 'mighty'; add('power', 'Tier 3 — corona of rays around the core'); }
  return s;
}
// ------------------------------------------------------------ drawing
const WING_BY_GROUP = { Character: 'solid', 'Rules of Play': 'dashed', 'Disciplines & Magic': 'double', Equipment: 'brackets', World: 'heavy' };
const wingOf = (k) => WING_BY_GROUP[sectionByKind(k)?.group] || 'solid';
const CX = 200, CY = 180, R = 92;
/** A theme glyph as a small inline SVG (1em), for rules text: fire, cold, acid… */
export function themeGlyph(name: string): string {
  const d = (T as Record<string, string>)[name];
  return d ? `<svg class="rl-g" viewBox="-1.25 -1.25 2.5 2.5" width="1em" height="1em" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width=".22" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
}

const g = (d, sw = 2, extra = '') => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const at = (x, y, s, inner) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">${inner.replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${(+w / s).toFixed(4)}"`)}</g>`;

/** The finished plate as SVG markup. `r` comes from sigilRow(). */
export function plate(r, opts = {}) {
  const s = spec(r);
  const col = { ink: '#fff', line: '#000', hot: '#e01b0c', dim: 'rgba(0,0,0,.28)', ...(opts.colors || {}) };
  const zones = [];
  const Z = (zone, content, hit) => { zones.push(zone); return `<g class="z" data-zone="${zone}">${hit}${content}</g>`; };
  const tip = (zone) => s.reading.filter((x) => x.zone === zone).map((x) => x.label).join(' · ');
  let o = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(r.n)} sigil: ${esc(s.reading.map((x) => x.label).join('; '))}" style="color:${col.line}">`;
  o += `<rect width="400" height="400" fill="${col.ink}"/>`;
  const w = wingOf(r.k);
  if (w === 'solid') o += `<rect x="10" y="10" width="380" height="380" fill="none" stroke="currentColor" stroke-width="2"/>`;
  if (w === 'double') o += `<rect x="10" y="10" width="380" height="380" fill="none" stroke="currentColor" stroke-width="2"/><rect x="17" y="17" width="366" height="366" fill="none" stroke="currentColor" stroke-width="1"/>`;
  if (w === 'brackets') o += ['M10 44 V10 H44', 'M356 10 H390 V44', 'M390 356 V390 H356', 'M44 390 H10 V356'].map((d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3"/>`).join('');
  if (w === 'heavy') o += `<rect x="12" y="12" width="376" height="376" fill="none" stroke="currentColor" stroke-width="7"/>`;
  if (w === 'dashed') o += `<rect x="10" y="10" width="380" height="380" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="10 7"/>`;
  // code line
  const fileNo = `${s.code}-${String(r.i).padStart(4, '0')}`;
  let code = `<text x="30" y="46" fill="currentColor" font-family="IBM Plex Mono, monospace" font-size="15" letter-spacing="2">${esc(fileNo)}</text>`;
  if (s.corner) code += `<text x="370" y="46" fill="${col.hot}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="15">${esc(s.corner)}</text>`;
  if (s.lists) code += s.lists.map((f, i) => at(338 - (s.corner ? 64 : 0) + i * 0 - i * 24, 41, 8, g(FAMILY[f].d, 1.6))).join('');
  o += Z('code', code, `<rect class="hit" fill="transparent" x="18" y="22" width="364" height="34"/>`);
  // core + count
  let core = '';
  const cs = s.coreScale || 1;
  if (s.countMode === 'rings') {
    for (let i = 0; i < s.count; i++) core += `<circle class="draw" cx="${CX}" cy="${CY}" r="${f1(R * 0.62 + i * 4.6)}" fill="none" stroke="currentColor" stroke-width="${i === s.count - 1 ? 2 : 1.2}"/>`;
    core += at(CX, CY, R * cs * 0.9, s.cores.map((d) => g(d, 2.4, ' class="draw"')).join(''));
  } else {
    const scales = [1, 0.8, 0.62, 0.46].slice(0, Math.max(1, s.count));
    s.cores.forEach((d, j) => { const sc = j === 0 ? scales : [1]; sc.forEach((k, i) => (core += at(CX, CY, R * k * (j ? 0.86 : 1), g(d, i === 0 ? 3 : 1.6, ' class="draw"')))); });
  }
  o += Z('core', core, `<circle class="hit" fill="transparent" cx="${CX}" cy="${CY}" r="${R + 14}"/>`);
  // inner
  let inner = '';
  const I = s.inner;
  if (I) {
    if (I.t === 'depth') inner = `<circle class="draw" cx="${CX}" cy="${CY}" r="${I.r}" fill="none" stroke="currentColor" stroke-width="2.4"${I.dash ? ' stroke-dasharray="6 5"' : ''}/>`;
    if (I.t === 'adv') inner = `<circle class="draw" cx="${CX}" cy="${CY}" r="16" fill="none" stroke="currentColor" stroke-width="2"/><path class="draw" d="M${CX - 8} ${CY + 4} L${CX} ${CY - 5} L${CX + 8} ${CY + 4}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
    if (I.t === 'self') inner = `<circle cx="${CX}" cy="${CY}" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
    if (I.t === 'touch') inner = `<circle cx="${CX}" cy="${CY}" r="7" fill="currentColor"/>`;
    if (I.t === 'area') inner = `<circle cx="${CX}" cy="${CY}" r="15" fill="currentColor"/><circle cx="${CX}" cy="${CY}" r="21" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    if (I.t === 'effect') inner = `<rect x="${CX - 11}" y="${CY - 11}" width="22" height="22" fill="currentColor"/>`;
    if (I.t === 'target') inner = `<circle cx="${CX - 10}" cy="${CY}" r="6" fill="currentColor"/><path d="M${CX - 4} ${CY} H${CX + 20} M${CX + 13} ${CY - 6} L${CX + 20} ${CY} L${CX + 13} ${CY + 6}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
    if (I.t === 'rays') { inner = `<circle cx="${CX}" cy="${CY}" r="5" fill="currentColor"/>`; for (let i = 0; i < I.n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / I.n; inner += `<path d="M${f1(CX + Math.cos(a) * 10)} ${f1(CY + Math.sin(a) * 10)} L${f1(CX + Math.cos(a) * 26)} ${f1(CY + Math.sin(a) * 26)}" stroke="currentColor" stroke-width="2.4"/>`; } }
    if (I.t === 'glyph') inner = at(CX, CY, 20, g(I.d, 2));
    if (I.t === 'dmg') { if (I.b) inner += `<circle cx="${CX - 14}" cy="${CY}" r="6" fill="currentColor"/>`; if (I.p) inner += `<path d="M${CX} ${CY - 14} V${CY + 14}" stroke="currentColor" stroke-width="3"/>`; if (I.sl) inner += `<path d="M${CX + 6} ${CY + 12} L${CX + 22} ${CY - 12}" stroke="currentColor" stroke-width="3"/>`; }
  }
  o += Z('inner', inner, `<circle class="hit" fill="transparent" cx="${CX}" cy="${CY}" r="30"/>`);
  // saves
  if (s.saves) {
    let sv = '';
    [['F', 150], ['R', 200], ['W', 250]].forEach(([k, x]) => {
      const on = s.saves[k];
      sv += on ? `<circle cx="${x}" cy="312" r="8" fill="currentColor"/>` : `<circle cx="${x}" cy="312" r="7" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/>`;
      sv += `<text x="${x}" y="338" text-anchor="middle" fill="currentColor" opacity=".7" font-family="IBM Plex Mono, monospace" font-size="11">${(s.saveLabels || { F: 'FORT', R: 'REF', W: 'WILL' })[k]}</text>`;
    });
    o += Z('saves', sv, `<rect class="hit" fill="transparent" x="126" y="298" width="148" height="46"/>`);
  }
  // themes (right column)
  let th = '';
  s.themes.forEach((t, i) => { th += `<g data-theme="${esc(t)}">${at(356, 96 + i * 34, 9.5, g(T[t], 1.8))}<rect class="hit" fill="transparent" x="340" y="${80 + i * 34}" width="32" height="32"/></g>`; });
  o += Z('themes', th, `<rect class="hit" fill="transparent" x="338" y="78" width="36" height="${Math.max(36, s.themes.length * 34)}"/>`);
  // meter
  if (s.meter) {
    const n = s.meter, cw = 348 / n; let m = '';
    for (let i = 0; i < n; i++) m += `<rect class="lamp" data-l="${i + 1}" x="${f1(26 + i * cw + 1)}" y="352" width="${f1(cw - 2)}" height="22" fill="${col.ink}" stroke="currentColor" stroke-width="1.4"/>`;
    o += Z('meter', m, `<rect class="hit" fill="transparent" x="22" y="348" width="356" height="30"/>`);
    s.reading.push({ zone: 'meter', label: `${n} class levels — one cell each` });
  }
  // power marks
  let pw = '';
  if (s.prestige) pw += `<path class="draw" d="M${CX - 78} ${CY - R - 6} Q${CX} ${CY - R - 44} ${CX + 78} ${CY - R - 6}" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M${CX - 9} ${CY - R - 31} L${CX + 9} ${CY - R - 31} L${CX + 6} ${CY - R - 18} L${CX - 6} ${CY - R - 18} Z" fill="currentColor"/>`;
  if (s.power) {
    const rr = s.countMode === 'rings' ? R * 0.62 + Math.max(0, s.count - 1) * 4.6 + 12 : R + 16;
    let rays = '';
    const n = s.power === 'epic' ? 36 : 24;
    for (let i = 0; i < n; i++) { const a = (i * 2 * Math.PI) / n, len = s.power === 'epic' && i % 3 === 0 ? 14 : 8; rays += `<path d="M${f1(CX + Math.cos(a) * rr)} ${f1(CY + Math.sin(a) * rr)} L${f1(CX + Math.cos(a) * (rr + len))} ${f1(CY + Math.sin(a) * (rr + len))}" stroke="currentColor" stroke-width="1.6"/>`; }
    pw += `<g class="corona" style="transform-origin:${CX}px ${CY}px">${rays}</g>`;
    if (s.power === 'epic') {
      pw += `<rect x="3" y="3" width="394" height="394" fill="none" stroke="currentColor" stroke-width="1"/>`;
      [[3, 3], [200, 3], [397, 3], [3, 200], [397, 200], [3, 397], [200, 397], [397, 397]].forEach(([x, y]) => (pw += at(x, y, 7, `<path d="${star(4, 1, 0.28)}" fill="${col.ink}" stroke="currentColor" stroke-width="1.6"/>`)));
    }
  }
  if (pw) o += Z('power', pw, s.prestige ? `<rect class="hit" fill="transparent" x="${CX - 80}" y="${CY - R - 46}" width="160" height="40"/>` : '');
  return o + '</svg>';
}

export { FAMILY, T, THEMES };

// ------------------------------------------------------------ small marks and kin

// ------------------------------------------------------------ small marks and kin
/** The core glyph alone, black on a white square: the sigil's "what it is" at list size. */
export function mark(r, size = 40) {
  const s = spec(r);
  const paths = s.cores.map((d) => `<path d="${d}" fill="none" stroke="#000" stroke-width="0.09" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg class="mark" viewBox="-1.45 -1.45 2.9 2.9" width="${size}" height="${size}" aria-hidden="true"><rect x="-1.45" y="-1.45" width="2.9" height="2.9" fill="#fff"/>${paths}</svg>`;
}

// Kin: the entries of the same section whose sigils share the most marks. Tables are built once per
// section per build; each page then scores its section.
const kinTables = new Map();
function kinTable(kind) {
  if (!kinTables.has(kind)) {
    kinTables.set(
      kind,
      loadFull(kind).map((rec) => {
        const row = sigilRow(rec);
        const s = spec(row);
        const lab = (z) => (s.reading.find((x) => x.zone === z)?.label ?? '').split(' — ')[0];
        return {
          rec, row, core: s.cores.join('|'), count: s.count, inner: s.inner?.t ?? '', themes: s.themes,
          saves: s.saves ? ['F', 'R', 'W'].filter((k) => s.saves[k]).join('') : '', power: s.power ?? '',
          coreLabel: lab('core'), countLabel: lab('count'), innerLabel: lab('inner'),
        };
      }),
    );
  }
  return kinTables.get(kind);
}
/** Up to n kin for an entry, each with the marks it shares, in words. */
export function kinOf(rec, n = 6) {
  if (rec.kind === 'page') return [];
  const table = kinTable(rec.kind);
  const me = table.find((x) => x.rec.slug === rec.slug);
  if (!me) return [];
  const out = [];
  for (const o of table) {
    if (o === me) continue;
    let score = 0;
    const why = [];
    if (o.coreLabel === me.coreLabel) { score += 4; if (me.coreLabel) why.push(me.coreLabel); }
    if (o.count === me.count) { score += 2; if (me.countLabel) why.push(me.countLabel); }
    else if (Math.abs(o.count - me.count) === 1) score += 0.5;
    if (me.innerLabel && o.innerLabel === me.innerLabel) { score += 1; why.push(me.innerLabel); }
    const shared = o.themes.filter((t) => me.themes.includes(t));
    if (shared.length) { score += 1.5 * shared.length; why.push(shared.join(', ')); }
    if (me.saves && o.saves === me.saves) score += 0.5;
    if (score >= 4) out.push({ rec: o.rec, row: o.row, score, why: why.join(' · ') });
  }
  // Best first; ties go to book material, then to the shorter (more central) name.
  const rank = (x) => (x.rec.custom ? 1 : 0);
  return out.sort((a, b) => b.score - a.score || rank(a) - rank(b) || a.rec.name.length - b.rec.name.length).slice(0, n);
}
