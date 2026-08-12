// The single registry of content sections for the Shard-sea Codex. Adding a kind
// to the site = add one entry here (+ optionally a bespoke detail component).
// Routing, nav, facets, search and the home page are all derived from this.
//
// Two section types:
//   'records' — an extracted entity kind, shown as a filterable browse listing.
//   'pages'   — a set of prose chapters (matched by `pageKey` = page.section),
//               shown as the chapter(s) themselves (or a card list when several).

export type SectionType = 'records' | 'pages';

export interface FacetDef {
  field: string;
  label: string;
}
export interface Section {
  kind: string;            // real entity kind for 'records'; route-name for 'pages'
  icon: string;            // Tabler icon name (ti-*)
  route: string;
  label: string;           // plural
  singular: string;
  group: string;
  blurb: string;
  facets: FacetDef[];
  type?: SectionType;      // default 'records'
  pageKey?: string;        // for 'pages': the page.section value to list
  hidden?: boolean;        // keep for routing, hide from nav
  defaultSort?: 'tier' | 'name';   // browse listing default order
  /** A record section whose rules live in a prose chapter — linked from the listing. */
  rulesPage?: { slug: string; label: string };
  defaultIncludeContent?: string[];
}

const f = (field: string, label: string): FacetDef => ({ field, label });

export const SECTIONS: Section[] = [
  // ---- Character ----
  { kind: 'skill', icon: 'ti-chart-radar', route: 'skills', label: 'Skills', singular: 'Skill', group: 'Character', blurb: 'The ten Skills every character is built from — and what each one does.', facets: [f('principal', 'Kind')] },
  { kind: 'archetype', icon: 'ti-mask', route: 'archetypes', label: 'Archetypes', singular: 'Archetype', group: 'Character', blurb: 'The six archetypes — your skill pair, granted feat and Panic responses.', facets: [f('skill', 'Skill')] },
  { kind: 'background', icon: 'ti-id-badge', route: 'backgrounds', label: 'Backgrounds', singular: 'Background', group: 'Character', blurb: 'Where you come from — starting wealth, contacts and environment.', facets: [] },
  { kind: 'threshold_feat', icon: 'ti-trending-up', route: 'thresholds', label: 'Threshold Feats', singular: 'Threshold Feat', group: 'Character', blurb: 'Permanent feats gained as Body, Mind and Reflex cross 6, 12 and 18.', facets: [f('ability', 'Ability')] },
  { kind: 'character', type: 'pages', pageKey: 'character', icon: 'ti-user-plus', route: 'character', label: 'Making Characters', singular: 'Character Rules', group: 'Character', blurb: 'Creation & advancement, tests, time and activities.', facets: [] },

  // ---- Rules of Play ----
  { kind: 'action', icon: 'ti-bolt', route: 'actions', label: 'Actions', singular: 'Action', group: 'Rules of Play', blurb: 'What you can do on your turn — by type, with AP cost and effect.', facets: [f('action_type', 'Type')] },
  { kind: 'activity', icon: 'ti-hourglass', route: 'activities', label: 'Activities', singular: 'Activity', group: 'Rules of Play', blurb: 'Longer procedures measured in Watches, governed by your Skills.', facets: [f('skill', 'Skill'), f('access', 'Access')] },
  { kind: 'condition', icon: 'ti-mood-sick', route: 'conditions', label: 'Conditions', singular: 'Condition', group: 'Rules of Play', blurb: 'Temporary states, grouped by severity, with effects and counters.', facets: [f('severity', 'Severity')] },
  { kind: 'damage_type', icon: 'ti-droplet-filled', route: 'damage', label: 'Damage & Injuries', singular: 'Damage Type', group: 'Rules of Play', blurb: 'Every damage type with its full Injury Risk table.', facets: [f('category', 'Category')] },
  { kind: 'fixation', icon: 'ti-brain', route: 'fixations', label: 'Fixations', singular: 'Fixation', group: 'Rules of Play', blurb: 'What Corruption becomes — fixations, their feats and panic responses.', facets: [] },
  { kind: 'survival', type: 'pages', pageKey: 'survival', icon: 'ti-activity-heartbeat', route: 'survival', label: 'Survival', singular: 'Survival Rule', group: 'Rules of Play', blurb: 'Health, attacks & injuries, panic & corruption, rest, disease.', facets: [] },
  { kind: 'play', type: 'pages', pageKey: 'play', icon: 'ti-dice', route: 'play', label: 'Playing the Game', singular: 'Rule', group: 'Rules of Play', blurb: 'Combat & initiative, movement, senses, objects and creatures.', facets: [] },

  // ---- Disciplines & Magic ----
  { kind: 'discipline', icon: 'ti-school', route: 'disciplines', label: 'Disciplines', singular: 'Discipline', group: 'Disciplines & Magic', blurb: 'Trained practices under each Skill, with passive effects and feats.', facets: [f('skill', 'Skill'), f('special', 'Kind')] },
  { kind: 'feat', icon: 'ti-star', route: 'feats', label: 'Feats', singular: 'Feat', group: 'Disciplines & Magic', blurb: 'Every discipline feat (and prayer), by tier — AP cost, qualities and effect.', facets: [f('skill', 'Skill'), f('discipline', 'Discipline'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'rune', icon: 'ti-sparkles', route: 'runes', label: 'Runes', singular: 'Rune', group: 'Disciplines & Magic', blurb: 'Arcane runes a Mage can etch, grouped by class and tier.', facets: [f('rune_class', 'Class'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'spells', type: 'pages', pageKey: 'spells', icon: 'ti-wand', route: 'spells', label: 'Spellcasting', singular: 'Spellcasting', group: 'Disciplines & Magic', blurb: 'How Mages channel Aether and form runes into spells.', facets: [] },
  { kind: 'ritual', icon: 'ti-flame', route: 'rituals', label: 'Rituals', singular: 'Ritual', group: 'Disciplines & Magic', blurb: 'Arcane rituals — runes, reagents, casting time and effect.', facets: [] },
  { kind: 'pact', icon: 'ti-skull', route: 'bindings', label: 'Demon Bindings', singular: 'Demon Pact', group: 'Disciplines & Magic', blurb: 'Demonic pacts a Binder can swear — the Arch-Demons and their prices.', facets: [] },
  { kind: 'spirit', icon: 'ti-ghost-2', route: 'spirits', label: 'Spirit Bindings', singular: 'Spirit', group: 'Disciplines & Magic', blurb: 'The Spirits a Binder can Pact with — by Court and rank, with their Powers.', facets: [f('court', 'Court'), f('rank', 'Rank')], defaultSort: 'name' },

  // ---- Equipment ----
  { kind: 'items-general', type: 'pages', pageKey: 'items-general', icon: 'ti-package', route: 'items', label: 'Items in General', singular: 'Item Rules', group: 'Equipment', blurb: 'How items work — hands, durability, repairs, traits and currency.', facets: [] },
  { kind: 'weapon', icon: 'ti-sword', route: 'weapons', label: 'Weapons', singular: 'Weapon', group: 'Equipment', blurb: 'Melee & ranged weapons by group, with traits, cost and stats.', facets: [f('weapon_group', 'Group'), f('mode', 'Mode'), f('origin', 'Origin'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'weapon_trait', icon: 'ti-tags', route: 'weapon-traits', label: 'Weapon Traits', singular: 'Weapon Trait', group: 'Equipment', blurb: 'The trait glossary every weapon references — Vicious, Reach, Reload…', facets: [] },
  { kind: 'weapon_group', icon: 'ti-layout-grid', route: 'weapon-groups', label: 'Weapon Groups', singular: 'Weapon Group', group: 'Equipment', blurb: 'What each weapon family does differently — the Group Effects.', facets: [] },
  { kind: 'armor', icon: 'ti-shield', route: 'armor', label: 'Armor & Shields', singular: 'Armor', group: 'Equipment', blurb: 'Armor and shields — bulk, durability, movement penalty and rating.', facets: [f('armor_kind', 'Type'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'consumable', icon: 'ti-flask', route: 'consumables', label: 'Consumables', singular: 'Consumable', group: 'Equipment', blurb: 'Alcohols, tonics, medicines and poisons — expended on use.', facets: [f('category', 'Kind')] },
  { kind: 'artifice', icon: 'ti-tools', route: 'artifice', label: 'Artifice Items', singular: 'Artifice Item', group: 'Equipment', blurb: 'Magical items, automata and augmentations — plus player-made customs.', facets: [f('category', 'Kind'), f('custom', 'Custom')], defaultSort: 'name' },
  { kind: 'magic_item', icon: 'ti-crystal-ball', route: 'magic-items', label: 'Magic Items', singular: 'Magic Item', group: 'Equipment', blurb: 'Arcane items and enchantments — magic that is not the work of Artifice.', facets: [f('category', 'Kind'), f('type', 'Type'), f('origin', 'Origin'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'martech', icon: 'ti-cpu', route: 'martech', label: 'Martech', singular: 'Martech Mod', group: 'Equipment', blurb: 'Cybernetic Moduli — surgically-implanted, Residue-fuelled body augmentations.', facets: [f('category', 'System'), f('origin', 'Origin'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'material', icon: 'ti-diamond', route: 'materials', label: 'Materials', singular: 'Material', group: 'Equipment', blurb: 'Unique crafting materials that reshape a weapon or armor.', facets: [f('applies_to', 'Applies to')] },
  { kind: 'resource', icon: 'ti-pick', route: 'resources', label: 'Resources', singular: 'Resource', group: 'Equipment', blurb: 'What things are made of — resource types and their Bulk values.', facets: [f('category', 'Kind')], rulesPage: { slug: 'resources', label: 'How Resources & Bulk values work' } },
  { kind: 'residue', icon: 'ti-droplet', route: 'residue', label: 'Residue', singular: 'Residue', group: 'Equipment', blurb: 'Crystalline Aether in all its forms — artificial, natural and elemental.', facets: [f('category', 'Kind')], rulesPage: { slug: 'the-kinds-of-residue', label: 'The Kinds of Residue (full chapter)' } },
  { kind: 'ship', icon: 'ti-ship', route: 'ships', label: 'Ships', singular: 'Ship', group: 'Equipment', blurb: 'Vessels, ship weapons, expansions, crew and ship combat actions.', facets: [f('category', 'Card type'), f('tier', 'Tier')], defaultSort: 'tier', rulesPage: { slug: 'ships', label: 'Ship rules: reading a card, combat & travel' } },

  // ---- World ----
  { kind: 'city_zone', icon: 'ti-building-arch', route: 'city-zones', label: 'City Zones', singular: 'City Zone', group: 'World', blurb: 'Every zone and structure a City can build, by Spoke of Civilization.', facets: [f('spoke', 'Spoke'), f('region', 'Region')], defaultSort: 'tier', rulesPage: { slug: 'cities', label: 'How Cities work: spokes, stats & regions' } },
  { kind: 'structure', icon: 'ti-building-castle', route: 'structures', label: 'Structures', singular: 'Structure', group: 'World', blurb: 'Outpost buildings, institutions, supplements and emplacements.', facets: [f('category', 'Kind')], rulesPage: { slug: 'building-an-outpost', label: 'Building an Outpost' } },
  { kind: 'battle_card', icon: 'ti-swords', route: 'battle-cards', label: 'Battle Cards', singular: 'Battle Card', group: 'World', blurb: 'Commanders and units you can field in mass battle.', facets: [f('category', 'Kind'), f('tier', 'Tier')], defaultSort: 'tier', rulesPage: { slug: 'battles', label: 'Battle rules: cards, rounds & resolution' } },
  { kind: 'settlements', type: 'pages', pageKey: 'settlements', icon: 'ti-map-2', route: 'settlements', label: 'Cities & Outposts', singular: 'Settlement Rules', group: 'World', blurb: 'Cities, battles, and building & defending outposts.', facets: [] },
  { kind: 'lore', type: 'pages', pageKey: 'lore', icon: 'ti-world', route: 'lore', label: 'World & Lore', singular: 'Lore', group: 'World', blurb: 'Gaia, the Sea, and the Wheel of Wheels.', facets: [] },

  // ---- hidden: the page detail route (prose sections link here) ----
  { kind: 'page', icon: 'ti-book-2', route: 'pages', label: 'Pages', singular: 'Page', group: 'World', blurb: '', facets: [], hidden: true },
];

export const GROUP_ORDER = ['Character', 'Rules of Play', 'Disciplines & Magic', 'Equipment', 'World'];

const byKind = new Map(SECTIONS.map((s) => [s.kind, s]));
const byRoute = new Map(SECTIONS.map((s) => [s.route, s]));

export const sectionByKind = (k: string) => byKind.get(k);
export const sectionByRoute = (r: string) => byRoute.get(r);
export const isPages = (s: Section) => s.type === 'pages';
export const isRecords = (s: Section) => (s.type ?? 'records') === 'records';
// Provenance is uniform (one game, one source), so browse facets are the
// kind-specific ones only — no pointless "content type: official" filter.
export const allFacets = (s: Section): FacetDef[] => [...s.facets];
export const hrefFor = (kind: string, slug: string) => `/${byKind.get(kind)?.route ?? kind}/${slug}`;
export const routeMap: Record<string, string> = Object.fromEntries(SECTIONS.map((s) => [s.kind, s.route]));
export const labelMap: Record<string, string> = Object.fromEntries(SECTIONS.map((s) => [s.kind, s.singular]));

export function sectionsByGroup() {
  return GROUP_ORDER.map((group) => ({
    group,
    sections: SECTIONS.filter((s) => s.group === group && !s.hidden),
  }));
}
