// The single registry of content sections for the Shard-sea Codex. Adding a kind
// to the site = add one entry here (+ optionally a bespoke detail component).
// Routing, nav, facets, search and the home page are all derived from this.

export type Kind =
  | 'discipline' | 'feat' | 'rune'
  | 'archetype'
  | 'weapon' | 'armor' | 'material'
  | 'condition' | 'action' | 'page';

export interface FacetDef {
  field: string;
  label: string;
}
export interface Section {
  kind: Kind;
  icon: string; // Tabler icon name (ti-*)
  route: string;
  label: string; // plural
  singular: string;
  group: string;
  blurb: string;
  facets: FacetDef[];
  defaultIncludeContent?: string[];
}

const f = (field: string, label: string): FacetDef => ({ field, label });

export const SECTIONS: Section[] = [
  { kind: 'archetype', icon: 'ti-mask', route: 'archetypes', label: 'Archetypes', singular: 'Archetype', group: 'Character', blurb: 'The six archetypes — your skill pair, granted feat and Panic responses.', facets: [f('skill', 'Skill')] },

  { kind: 'discipline', icon: 'ti-school', route: 'disciplines', label: 'Disciplines', singular: 'Discipline', group: 'Disciplines', blurb: 'Trained practices under each Skill, with their passive effects and feats.', facets: [f('skill', 'Skill'), f('special', 'Kind')] },
  { kind: 'feat', icon: 'ti-star', route: 'feats', label: 'Feats', singular: 'Feat', group: 'Disciplines', blurb: 'Every discipline feat (and prayer), by tier — AP cost, qualities and effect.', facets: [f('skill', 'Skill'), f('discipline', 'Discipline'), f('tier', 'Tier')] },
  { kind: 'rune', icon: 'ti-sparkles', route: 'runes', label: 'Runes', singular: 'Rune', group: 'Disciplines', blurb: 'Arcane runes a Mage can etch, grouped by class and tier.', facets: [f('rune_class', 'Class'), f('tier', 'Tier')] },

  { kind: 'weapon', icon: 'ti-sword', route: 'weapons', label: 'Weapons', singular: 'Weapon', group: 'Equipment', blurb: 'Melee & ranged weapons by group, with traits, cost and stats.', facets: [f('weapon_group', 'Group'), f('mode', 'Mode'), f('tier', 'Tier')] },
  { kind: 'armor', icon: 'ti-shield', route: 'armor', label: 'Armor & Shields', singular: 'Armor', group: 'Equipment', blurb: 'Armor and shields — bulk, durability, movement penalty and rating.', facets: [f('armor_kind', 'Type'), f('tier', 'Tier')] },
  { kind: 'material', icon: 'ti-diamond', route: 'materials', label: 'Materials', singular: 'Material', group: 'Equipment', blurb: 'Unique crafting materials that reshape a weapon or armor.', facets: [f('applies_to', 'Applies to')] },

  { kind: 'condition', icon: 'ti-mood-sick', route: 'conditions', label: 'Conditions', singular: 'Condition', group: 'Rules & Lore', blurb: 'Temporary states, grouped by severity, with effects and counters.', facets: [f('severity', 'Severity')] },
  { kind: 'action', icon: 'ti-bolt', route: 'actions', label: 'Actions', singular: 'Action', group: 'Rules & Lore', blurb: 'What you can do on your turn — by type, with AP cost and effect.', facets: [f('action_type', 'Type')] },
  { kind: 'page', icon: 'ti-book-2', route: 'pages', label: 'Rules & Lore', singular: 'Page', group: 'Rules & Lore', blurb: 'The full rules chapters and setting lore, rendered faithfully.', facets: [f('chapter', 'Chapter')] },
];

export const GROUP_ORDER = ['Character', 'Disciplines', 'Equipment', 'Rules & Lore'];

const byKind = new Map(SECTIONS.map((s) => [s.kind, s]));
const byRoute = new Map(SECTIONS.map((s) => [s.route, s]));

export const sectionByKind = (k: string) => byKind.get(k as Kind);
export const sectionByRoute = (r: string) => byRoute.get(r);
// Provenance is uniform here (one game, one source), so browse facets are the
// kind-specific ones only — no pointless "content type: official" filter.
export const allFacets = (s: Section): FacetDef[] => [...s.facets];
export const hrefFor = (kind: string, slug: string) => `/${byKind.get(kind as Kind)?.route ?? kind}/${slug}`;
export const routeMap: Record<string, string> = Object.fromEntries(SECTIONS.map((s) => [s.kind, s.route]));
export const labelMap: Record<string, string> = Object.fromEntries(SECTIONS.map((s) => [s.kind, s.singular]));

export function sectionsByGroup() {
  return GROUP_ORDER.map((group) => ({ group, sections: SECTIONS.filter((s) => s.group === group) }));
}
