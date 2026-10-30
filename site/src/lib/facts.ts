// The facts shown in an entry's header, as a glance grid under the title: the numbers and short
// values people look up first (the D&D 3.5 Codex's structure). Longer values stay in the body.
import { loadFull } from './data';
import { tidyValue } from './format';

export interface Fact {
  label: string;
  value: string;
  /** Long values take two cells. */
  wide?: boolean;
}

const has = (v: any) => v != null && String(v).trim() !== '' && !/^none$/i.test(String(v).trim());
const WIDE = 34;
const mk = (rows: [string, any][]): Fact[] =>
  rows
    .filter(([, v]) => has(v))
    // one cell per label (a record's own attributes can repeat a field we already show)
    .filter(([label], i, all) => all.findIndex(([l]) => l.toLowerCase() === label.toLowerCase()) === i)
    .map(([label, v]) => {
      const value = tidyValue(String(v).replace(/\s*\n+\s*/g, ' '));
      return { label, value, wide: value.length > WIDE };
    });
const tier = (rec: any) => (rec.tier != null ? String(rec.tier) : '');

// Generic records: every short attribute is a fact; long ones render as sections (GenericDetail).
export const GENERIC_SKIP = new Set([
  'description', 'panic_flavor', 'Record', 'record_type', 'injuries', 'spoke', 'unlocks_at', 'notes', 'examples',
  // provenance stamped on custom items by the importer: shown as badges instead
  'custom', 'made_on', 'status', 'origin', 'outdated', 'Made On',
]);
export const SHORT = 30;
// A Structure's resource yield, written two ways in the book: "Resources_F:0/G:6" (which the
// attribute parser splits at its first colon into key "Resources_F", value "0/G:6") and
// "Resources-F: 1| G: -". Both become one fact, "F 0 · G 6".
const RESOURCE_KEYS = new Set(['Resources_F', 'Resources-F', 'G']);
function resources(attrs: Record<string, any>): string {
  let f = attrs['Resources-F'], g = attrs.G;
  const joined = /^([^/]*)\/G:(.*)$/.exec(String(attrs.Resources_F ?? ''));
  if (joined) [f, g] = [joined[1], joined[2]];
  const show = (v: any) => (v == null || /^\s*-?\s*$/.test(String(v)) ? '–' : String(v).trim());
  return f == null && g == null ? '' : `F ${show(f)} · G ${show(g)}`;
}

function genericRows(rec: any): [string, any][] {
  const attrs = rec.attrs ?? {};
  return [
    ['Resources', resources(attrs)],
    ['Class', rec.rune_class],
    ['Multiplier', rec.multiplier],
    ['Applies to', rec.applies_to],
    ['Skill', rec.kind === 'activity' ? rec.group : ''],
    ...Object.entries(attrs)
      .filter(([k, v]) => !GENERIC_SKIP.has(k) && !['Class', 'Multipier', 'Multiplier', 'applies_to'].includes(k) && v && typeof v !== 'object' && String(v).length <= SHORT)
      .filter(([k]) => !RESOURCE_KEYS.has(k))
      .map(([k, v]) => [k.replace(/_/g, ' '), v] as [string, any]),
  ];
}

export function factsFor(rec: any): Fact[] {
  const a = rec.attrs ?? {};
  switch (rec.kind) {
    case 'action':
      return mk([['Type', rec.action_type], ['AP', rec.ap], ['Duration', a.Duration], ['Range', a.Range], ['Resist', a.Resist], ['Traits', a.Traits ?? a.Qualities]]);
    case 'armor':
      return mk([['Type', rec.armor_kind], ['Tier', tier(rec)], ['Cost', rec.cost], ['Bulk', rec.bulk], ['Durability', rec.durability], ['Movement penalty', rec.movement_penalty], ['Resources', rec.resources], ['Rating', rec.rating]]);
    case 'artifice':
      return mk([['Kind', rec.category], ['Fits', a.Equipment], ['Bulk', rec.bulk], ['Cost', rec.cost], ['Activation', rec.activation], ['Made on', rec.custom ? rec.made_on : '']]);
    case 'consumable':
      return mk([['Kind', rec.group], ['Tier', tier(rec)], ['Cost', rec.cost]]);
    case 'feat':
      return mk([['Discipline', rec.discipline_name], ['Skill', rec.skill], [rec.record === 'Prayer' ? 'Prayer' : 'Tier', rec.feat_tier != null ? String(rec.feat_tier) : ''], ['AP', rec.ap], ['Traits', rec.qualities]]);
    case 'material':
      return mk([['Applies to', rec.applies_to], ['Value ×', rec.multiplier]]);
    case 'ritual':
      return mk([['Runes', rec.runes], ['Reagents', rec.reagents], ['Casting time', rec.time]]);
    case 'spirit':
      return mk([['Court', rec.court], ['Rank', rec.rank], ['Name', rec.spirit_name]]);
    case 'weapon':
      return mk([['Group', rec.weapon_group], ['Mode', rec.mode], ['Tier', tier(rec)], ['Cost', rec.cost], ['Accuracy', rec.accuracy], ['Bulk', rec.bulk], ['Durable', rec.durable]]);
    case 'condition':
      return mk([['Severity', rec.severity]]);
    case 'discipline':
      return mk([['Skill', rec.skill], ['Feats', String((rec.feats ?? []).length)], ['Runes', (rec.runes ?? []).length ? String(rec.runes.length) : ''], ['Kind', rec.is_special ? 'Special discipline' : '']]);
    case 'skill': {
      const name = rec.name;
      const n = (kind: string, f: (x: any) => boolean) => String((loadFull(kind) as any[]).filter(f).length);
      return mk([
        ['Kind', rec.principal ? 'Principal Skill' : 'Skill'],
        ['Attacks', rec.attack],
        ['Disciplines', n('discipline', (d) => d.skill === name)],
        ['Feats', n('feat', (f) => f.skill === name)],
        ['Activities', n('activity', (x) => x.group === name)],
      ]);
    }
    case 'archetype':
      return mk([['Skills', rec.skills], ['Granted feat', rec.feat_name]]);
    case 'page':
      return mk([['Chapter', rec.chapter]]);
    case 'damage_type':
      return mk([['Base damage', rec['Base Damage']], ['Category', rec.group]]);
    case 'pact':
      return [];
    default:
      return mk([['Tier', tier(rec)], ...genericRows(rec)]);
  }
}
