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
}

const f = (field: string, label: string): FacetDef => ({ field, label });

export const SECTIONS: Section[] = [
  // ---- Character ----
  { kind: 'archetype', icon: 'ti-mask', route: 'archetypes', label: 'Archetypes', singular: 'Archetype', group: 'Character', blurb: 'The six archetypes — your skill pair, granted feat and Panic responses.', facets: [f('skill', 'Skill')] },
  { kind: 'character', type: 'pages', pageKey: 'character', icon: 'ti-user-plus', route: 'character', label: 'Making Characters', singular: 'Character Rules', group: 'Character', blurb: 'Creation & advancement, backgrounds, activities, tests and abilities.', facets: [] },

  // ---- Rules of Play ----
  { kind: 'survival', type: 'pages', pageKey: 'survival', icon: 'ti-activity-heartbeat', route: 'survival', label: 'Survival', singular: 'Survival Rule', group: 'Rules of Play', blurb: 'Health, attacks & injuries, panic & corruption, rest, disease.', facets: [] },
  { kind: 'play', type: 'pages', pageKey: 'play', icon: 'ti-dice', route: 'play', label: 'Playing the Game', singular: 'Rule', group: 'Rules of Play', blurb: 'Combat & initiative, movement, senses, objects and creatures.', facets: [] },
  { kind: 'action', icon: 'ti-bolt', route: 'actions', label: 'Actions', singular: 'Action', group: 'Rules of Play', blurb: 'What you can do on your turn — by type, with AP cost and effect.', facets: [f('action_type', 'Type')] },
  { kind: 'condition', icon: 'ti-mood-sick', route: 'conditions', label: 'Conditions', singular: 'Condition', group: 'Rules of Play', blurb: 'Temporary states, grouped by severity, with effects and counters.', facets: [f('severity', 'Severity')] },

  // ---- Disciplines & Magic ----
  { kind: 'discipline', icon: 'ti-school', route: 'disciplines', label: 'Disciplines', singular: 'Discipline', group: 'Disciplines & Magic', blurb: 'Trained practices under each Skill, with passive effects and feats.', facets: [f('skill', 'Skill'), f('special', 'Kind')] },
  { kind: 'feat', icon: 'ti-star', route: 'feats', label: 'Feats', singular: 'Feat', group: 'Disciplines & Magic', blurb: 'Every discipline feat (and prayer), by tier — AP cost, qualities and effect.', facets: [f('skill', 'Skill'), f('discipline', 'Discipline'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'rune', icon: 'ti-sparkles', route: 'runes', label: 'Runes', singular: 'Rune', group: 'Disciplines & Magic', blurb: 'Arcane runes a Mage can etch, grouped by class and tier.', facets: [f('rune_class', 'Class'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'spells', type: 'pages', pageKey: 'spells', icon: 'ti-wand', route: 'spells', label: 'Spells', singular: 'Spellcasting', group: 'Disciplines & Magic', blurb: 'How Mages channel Aether and form runes into spells.', facets: [] },
  { kind: 'ritual', icon: 'ti-flame', route: 'rituals', label: 'Rituals', singular: 'Ritual', group: 'Disciplines & Magic', blurb: 'Arcane rituals — runes, reagents, casting time and effect.', facets: [] },
  { kind: 'pact', icon: 'ti-skull', route: 'bindings', label: 'Bindings', singular: 'Pact', group: 'Disciplines & Magic', blurb: 'Demonic pacts a Binder can swear — the Arch-Demons and their prices.', facets: [] },

  // ---- Equipment ----
  { kind: 'items-general', type: 'pages', pageKey: 'items-general', icon: 'ti-package', route: 'items', label: 'Items in General', singular: 'Item Rules', group: 'Equipment', blurb: 'How items work — hands, durability, repairs, traits and currency.', facets: [] },
  { kind: 'weapon', icon: 'ti-sword', route: 'weapons', label: 'Weapons', singular: 'Weapon', group: 'Equipment', blurb: 'Melee & ranged weapons by group, with traits, cost and stats.', facets: [f('weapon_group', 'Group'), f('mode', 'Mode'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'armor', icon: 'ti-shield', route: 'armor', label: 'Armor & Shields', singular: 'Armor', group: 'Equipment', blurb: 'Armor and shields — bulk, durability, movement penalty and rating.', facets: [f('armor_kind', 'Type'), f('tier', 'Tier')], defaultSort: 'tier' },
  { kind: 'consumable', icon: 'ti-flask', route: 'consumables', label: 'Consumables', singular: 'Consumable', group: 'Equipment', blurb: 'Alcohols, tonics, medicines and poisons — expended on use.', facets: [f('category', 'Kind')] },
  { kind: 'artifice', icon: 'ti-tools', route: 'artifice', label: 'Artifice Items', singular: 'Artifice Item', group: 'Equipment', blurb: 'Magical items, automata and augmentations — plus player-made customs.', facets: [f('category', 'Kind'), f('custom', 'Custom')], defaultSort: 'name' },
  { kind: 'material', icon: 'ti-diamond', route: 'materials', label: 'Materials', singular: 'Material', group: 'Equipment', blurb: 'Unique crafting materials that reshape a weapon or armor.', facets: [f('applies_to', 'Applies to')] },
  { kind: 'resources', type: 'pages', pageKey: 'resources', icon: 'ti-pick', route: 'resources', label: 'Resources', singular: 'Resource Rules', group: 'Equipment', blurb: 'Raw resources of the Sea and their traits.', facets: [] },
  { kind: 'residue', type: 'pages', pageKey: 'residue', icon: 'ti-droplet', route: 'residue', label: 'Residue', singular: 'Residue', group: 'Equipment', blurb: 'The kinds of Residue — artificial and natural.', facets: [] },
  { kind: 'ships', type: 'pages', pageKey: 'ships', icon: 'ti-ship', route: 'ships', label: 'Ships', singular: 'Ships', group: 'Equipment', blurb: 'Airships — reading a ship card, and everything they can do.', facets: [] },

  // ---- World ----
  { kind: 'settlements', type: 'pages', pageKey: 'settlements', icon: 'ti-building-castle', route: 'settlements', label: 'Cities & Outposts', singular: 'Settlement Rules', group: 'World', blurb: 'Cities, battles, and building & defending outposts.', facets: [] },
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
