// Export shardsea.db -> JSON the wiki consumes.
//
//   src/data/<kind>.json          full records (build-time import for detail pages)
//   public/data/<kind>.index.json compact records (client fetch for browse/filter)
//   src/data/meta.json            section counts + version list
//   src/data/changes.json         version list + detailed changelog (change_entry)
//   public/data/search.json       slim global search index
//
// Reads the DB read-only via Node's built-in node:sqlite (no native deps).
// Re-run whenever the DB changes: `npm run export` (also runs before dev/build).

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(__dirname, '..');
const REPO = resolve(SITE, '..'); // shard-sea repo root (holds shardsea.db)

const DB_CANDIDATES = [
  process.env.SHARDSEA_DB,
  join(REPO, 'shardsea.db'),
  join(REPO, 'shard-sea', 'shardsea.db'),
].filter(Boolean);
const DB_PATH = DB_CANDIDATES.find((p) => existsSync(p)) ?? DB_CANDIDATES[DB_CANDIDATES.length - 1];
const SRC_DATA = resolve(SITE, 'src', 'data');
const PUB_DATA = resolve(SITE, 'public', 'data');

// ---------------------------------------------------------------- helpers
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const q = (sql, ...p) => db.prepare(sql).all(...p);
const clean = (s) => (s == null ? '' : String(s).replace(/\r\n/g, '\n').trim());
const parseJson = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };
function snippet(s, n = 200) {
  const t = clean(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}
const arr = (v) => (v == null || v === '' ? [] : [String(v)]);

// Provenance is uniform (one game, one source) but the site's card/search
// plumbing expects these fields — set them to sensible constants.
const CT = 'official';
const LICENSE = 'homebrew';
function provFacets(source) {
  return { content_type: [CT], license: [LICENSE], source: [source] };
}

const sections = [];
const searchAll = [];
const sourcesSet = new Set();
function emit(kind, full, index) {
  writeFileSync(join(SRC_DATA, `${kind}.json`), JSON.stringify(full));
  writeFileSync(join(PUB_DATA, `${kind}.index.json`), JSON.stringify(index));
  for (const r of index) {
    for (const s of r.facets.source || []) sourcesSet.add(s);
    searchAll.push({ n: r.name, k: kind, s: r.slug, b: r.sub });
  }
  sections.push({ kind, count: full.length });
  console.log(`  ${kind.padEnd(12)} ${full.length}`);
}

// reset output dirs
for (const d of [SRC_DATA, PUB_DATA]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
console.log(`Exporting from ${DB_PATH}`);

// ---------------------------------------------------------------- load raw
const version =
  q('SELECT version FROM import_run WHERE is_current=1 ORDER BY id DESC LIMIT 1')[0]?.version ||
  q('SELECT version FROM import_run ORDER BY id DESC LIMIT 1')[0]?.version ||
  'current';
const SOURCE = `PHB ${version}`;

const pages = q('SELECT * FROM page');
const entities = q('SELECT * FROM entity');

// typed side-tables keyed by entity_id
const typed = {};
for (const t of ['feat', 'discipline', 'weapon', 'armor', 'archetype', 'condition', 'game_action']) {
  typed[t] = new Map(q(`SELECT * FROM ${t}`).map((r) => [r.entity_id, r]));
}

// Assign each prose page to a browsable "section", and drop the redundant
// per-discipline pages (their prose already lives in the discipline records).
function pageSection(sp) {
  if (sp.startsWith('custom/')) return null;
  if (sp.startsWith('1_')) return 'character';
  if (sp.startsWith('2_')) return 'survival';
  if (sp.startsWith('3_')) return 'play';
  if (/Arcane Magic\.md$|\/ARCANE\.md$/i.test(sp)) return 'spells';
  if (sp.startsWith('5_Equipment/a_')) return 'items-general';
  if (sp.startsWith('5_Equipment/e_')) return 'resources';
  if (sp.startsWith('5_Equipment/f_')) return 'residue';
  if (sp.startsWith('5_Equipment/h_')) return 'ships';
  if (sp.startsWith('6_')) return 'settlements';
  if (/^Appendix\/(a_|b_|c_)/.test(sp)) return 'lore';
  return null;
}
const keptPages = pages.filter((p) => !(p.role === 'discipline' && pageSection(p.source_path) === null));
// lookups: source_path -> page; source_path -> discipline entity
const pageByPath = new Map(keptPages.map((p) => [p.source_path, p]));
const discByPath = new Map();
for (const e of entities) if (e.kind === 'discipline') discByPath.set(e.source_path, e);

// group feats/runes under their discipline (same source file)
const featsByPath = new Map();
const runesByPath = new Map();
for (const e of entities) {
  if (e.kind === 'feat') (featsByPath.get(e.source_path) ?? featsByPath.set(e.source_path, []).get(e.source_path)).push(e);
  if (e.kind === 'rune') (runesByPath.get(e.source_path) ?? runesByPath.set(e.source_path, []).get(e.source_path)).push(e);
}

// common shape for every entity record
function baseRec(e) {
  const attrs = parseJson(e.attrs_json, {});
  const page = pageByPath.get(e.source_path);
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    slug: e.slug,
    source: SOURCE,
    content_type: CT,
    license: LICENSE,
    tier: e.tier ?? null,
    group: e.group_name ?? null,
    summary: e.summary ?? '',
    effects: e.effects ?? '',
    attrs,
    text: e.effects || e.summary || '',
    page_slug: page ? page.slug : null,
    page_title: page ? page.title : null,
  };
}

// ---------------------------------------------------------------- per-kind exporters
function exportKind(kind, build) {
  const rows = entities.filter((e) => e.kind === kind);
  const full = [];
  const index = [];
  for (const e of rows) {
    const rec = baseRec(e);
    const { facets = {}, sub = '', desc } = build(rec, e) || {};
    // build() may override rec.content_type (e.g. custom artifice items).
    rec.facets = { ...provFacets(SOURCE), content_type: [rec.content_type], ...facets };
    full.push(rec);
    index.push({
      id: e.id, slug: e.slug, name: e.name, kind,
      sub, desc: snippet(desc ?? rec.summary ?? rec.effects),
      tier: rec.tier ?? null,
      source: SOURCE, content_type: rec.content_type, license: LICENSE, facets: rec.facets,
    });
  }
  emit(kind, full, index);
}

// DISCIPLINE — attach its feats + runes
exportKind('discipline', (rec, e) => {
  const t = typed.discipline.get(e.id) || {};
  rec.skill = t.skill || rec.attrs.skill || '';
  rec.skill_no = t.skill_no ?? null;
  rec.passive = t.passive || rec.attrs.passive || '';
  rec.is_special = !!t.is_special;
  const kids = (featsByPath.get(e.source_path) || [])
    .map((fe) => {
      const ft = typed.feat.get(fe.id) || {};
      return { name: fe.name, slug: fe.slug, tier: ft.feat_tier ?? fe.tier, ap: ft.ap, qualities: ft.qualities, effect: ft.effect || fe.effects, flavor: ft.flavor, record: parseJson(fe.attrs_json, {}).Record || 'Feat', group: fe.group_name };
    })
    .sort((a, b) => (a.tier || 0) - (b.tier || 0));
  rec.feats = kids;
  rec.runes = (runesByPath.get(e.source_path) || []).map((re) => ({ name: re.name, slug: re.slug, group: re.group_name, rune_class: parseJson(re.attrs_json, {}).Class || '', effect: re.effects }));
  return {
    facets: { skill: arr(rec.skill), special: [rec.is_special ? 'Special' : 'Standard'] },
    sub: [rec.skill, `${kids.length} feats`].filter(Boolean).join(' · '),
    desc: rec.summary || rec.passive,
  };
});

// FEAT
exportKind('feat', (rec, e) => {
  const t = typed.feat.get(e.id) || {};
  const disc = discByPath.get(e.source_path);
  rec.discipline_name = t.discipline_name || (disc ? disc.name : '');
  rec.discipline_slug = disc ? disc.slug : null;
  rec.skill = t.skill || '';
  rec.feat_tier = t.feat_tier ?? rec.tier ?? null;
  rec.ap = t.ap || '';
  rec.qualities = t.qualities || '';
  rec.flavor = t.flavor || rec.summary || '';
  rec.effect = t.effect || rec.effects || '';
  rec.limits = t.limits || '';
  rec.record = rec.attrs.Record || 'Feat';
  return {
    facets: { skill: arr(rec.skill), discipline: arr(rec.discipline_name), tier: arr(rec.feat_tier != null ? `Tier ${rec.feat_tier}` : '') },
    sub: [rec.discipline_name, rec.feat_tier != null ? `Tier ${rec.feat_tier}` : ''].filter(Boolean).join(' · '),
    desc: rec.effect || rec.flavor,
  };
});

// RUNE
exportKind('rune', (rec, e) => {
  rec.rune_class = rec.attrs.Class || '';
  rec.description = rec.attrs.description || '';
  const disc = discByPath.get(e.source_path);
  rec.discipline_name = disc ? disc.name : '';
  rec.discipline_slug = disc ? disc.slug : null;
  const tierMatch = /(\d+)/.exec(rec.group || '');   // "Tier 1 Runes" -> 1
  if (tierMatch) rec.tier = Number(tierMatch[1]);
  return {
    facets: { rune_class: arr(rec.rune_class), tier: arr(rec.tier != null ? `Tier ${rec.tier}` : rec.group) },
    sub: [rec.rune_class, rec.group].filter(Boolean).join(' · '),
    desc: rec.effects || rec.description,
  };
});

// ARCHETYPE
exportKind('archetype', (rec, e) => {
  const t = typed.archetype.get(e.id) || {};
  rec.skills = t.skills || '';
  rec.feat_name = t.feat_name || '';
  rec.feat_effect = t.feat_effect || rec.effects || '';
  rec.quote = t.quote || rec.summary || '';
  rec.panic_response = t.panic_response || '';
  rec.panic = parseJson(t.panic_json, {});
  rec.panic_flavor = rec.attrs.panic_flavor || '';
  const skills = String(rec.skills).replace(/\band\b/gi, ',').split(/[,;.]+/).map((s) => s.trim()).filter(Boolean);
  return {
    facets: { skill: skills },
    sub: rec.skills,
    desc: rec.feat_effect || rec.quote,
  };
});

// WEAPON
exportKind('weapon', (rec, e) => {
  const t = typed.weapon.get(e.id) || {};
  Object.assign(rec, {
    weapon_group: t.weapon_group || rec.group || '', mode: t.mode || '', tier: t.tier ?? rec.tier,
    cost: t.cost || '', accuracy: t.accuracy || '', bulk: t.bulk || '', durable: t.durable || '',
    traits: t.traits || '', special: t.special || '',
  });
  return {
    facets: { weapon_group: arr(rec.weapon_group), mode: arr(rec.mode), tier: arr(rec.tier != null ? `Tier ${rec.tier}` : '') },
    sub: [rec.weapon_group, rec.tier != null ? `Tier ${rec.tier}` : ''].filter(Boolean).join(' · '),
    desc: rec.summary || rec.traits,
  };
});

// ARMOR
exportKind('armor', (rec, e) => {
  const t = typed.armor.get(e.id) || {};
  Object.assign(rec, {
    armor_kind: t.armor_kind || '', tier: t.tier ?? rec.tier, cost: t.cost || '',
    bulk: t.bulk || '', durability: t.durability || '', movement_penalty: t.movement_penalty || '',
    resources: t.resources || '', rating: t.rating || '', special: t.special || '',
  });
  return {
    facets: { armor_kind: arr(rec.armor_kind), tier: arr(rec.tier != null ? `Tier ${rec.tier}` : '') },
    sub: [rec.armor_kind, rec.tier != null ? `Tier ${rec.tier}` : ''].filter(Boolean).join(' · '),
    desc: rec.summary || rec.rating,
  };
});

// MATERIAL
exportKind('material', (rec) => {
  rec.multiplier = rec.attrs.Multiplier || rec.attrs.Multipier || '';
  rec.applies_to = rec.attrs.applies_to || '';
  rec.pricing_formula = rec.attrs.pricing_formula || 'Price + Bulk × (Material Value Multiplier)';
  rec.pricing_example = rec.attrs.pricing_example || (rec.multiplier ? `Price + Bulk × ${rec.multiplier}` : '');
  return {
    facets: { applies_to: arr(rec.applies_to) },
    sub: [rec.applies_to, rec.multiplier].filter(Boolean).join(' · '),
    desc: rec.effects,
  };
});

// RITUAL
exportKind('ritual', (rec) => {
  rec.runes = rec.attrs.Runes || '';
  rec.reagents = rec.attrs.Reagents || '';
  rec.time = rec.attrs.Time || '';
  return {
    facets: {},
    sub: [rec.time ? `Ritual · ${rec.time}` : 'Ritual'].filter(Boolean).join(' · '),
    desc: rec.summary || rec.effects,
  };
});

// PACT (bindings)
exportKind('pact', (rec) => {
  rec.invocation = rec.attrs.invocation || '';
  rec.lore = rec.attrs.lore || '';
  return {
    facets: {},
    sub: 'Binding',
    desc: rec.lore || rec.summary || rec.effects,
  };
});

// CONSUMABLE
exportKind('consumable', (rec) => {
  rec.cost = rec.attrs.Cost || '';
  rec.traits = rec.attrs.Traits || '';
  rec.effect = rec.effects || '';
  return {
    facets: { category: arr(rec.group) },
    sub: [rec.group, rec.cost ? `Cost ${rec.cost}` : ''].filter(Boolean).join(' · '),
    desc: rec.effect || rec.summary,
  };
});

// ARTIFICE (magical items, automata, augmentations — plus player-made customs)
exportKind('artifice', (rec) => {
  rec.pattern = rec.attrs.Pattern || '';
  rec.bulk = rec.attrs.Bulk || '';
  rec.cost = rec.attrs.Cost || '';
  rec.activation = rec.attrs.Activation || '';
  rec.category = rec.attrs.category || rec.group || 'Artifice';
  rec.description = rec.attrs.description || '';
  rec.custom = rec.attrs.custom === true;
  rec.made_on = rec.attrs.made_on || '';
  rec.status = rec.attrs.status || '';
  rec.outdated = rec.status === 'outdated';
  if (rec.custom) rec.content_type = 'custom';
  return {
    facets: { category: arr(rec.category), custom: rec.custom ? ['Custom'] : [] },
    sub: [rec.category, rec.custom ? (rec.outdated ? 'custom · outdated' : 'custom') : ''].filter(Boolean).join(' · '),
    desc: rec.summary || rec.description || rec.effects,
  };
});

// CONDITION
exportKind('condition', (rec, e) => {
  const t = typed.condition.get(e.id) || {};
  rec.severity = t.severity || rec.group || '';
  rec.effect = t.effect || rec.effects || rec.summary || '';
  rec.extra = parseJson(t.extra_json, {});
  return {
    facets: { severity: arr(rec.severity) },
    sub: rec.severity,
    desc: rec.effect,
  };
});

// ACTION
exportKind('action', (rec, e) => {
  const t = typed.game_action.get(e.id) || {};
  rec.action_type = t.action_type || rec.group || '';
  rec.ap = t.ap || rec.attrs.AP || '';
  rec.effect = t.effect || rec.effects || '';
  rec.extra = parseJson(t.extra_json, {});
  return {
    facets: { action_type: arr(rec.action_type) },
    sub: [rec.action_type, rec.ap ? `AP ${rec.ap}` : ''].filter(Boolean).join(' · '),
    desc: rec.effect,
  };
});

// PAGE (prose chapters + lore) — from the page table, not entity. Each carries
// a `section` (see pageSection) so the site's prose sections can filter them.
{
  const full = [];
  const index = [];
  const ordered = keptPages.slice().sort((a, b) =>
    (a.chapter_no || 99) - (b.chapter_no || 99) || (a.section_order || 99) - (b.section_order || 99));
  for (const p of ordered) {
    const chapter = p.chapter || 'Appendix';
    const section = pageSection(p.source_path);
    const rec = {
      id: p.id, kind: 'page', name: p.title, slug: p.slug,
      source: SOURCE, content_type: CT, license: LICENSE,
      chapter, chapter_no: p.chapter_no, section_order: p.section_order, section,
      role: p.role, source_path: p.source_path, record_count: p.record_count,
      summary: p.summary || '', body_md: p.body_md || '', text: p.body_md || '',
      facets: { ...provFacets(SOURCE), chapter: arr(chapter) },
    };
    full.push(rec);
    index.push({
      id: p.id, slug: p.slug, name: p.title, kind: 'page',
      sub: chapter, desc: snippet(p.summary || p.body_md), section,
      source: SOURCE, content_type: CT, license: LICENSE, facets: rec.facets,
    });
  }
  emit('page', full, index);
  // prose-section counts (kind == pageKey in sections.ts) for the nav.
  const secCounts = {};
  for (const p of ordered) {
    const s = pageSection(p.source_path);
    if (s) secCounts[s] = (secCounts[s] || 0) + 1;
  }
  for (const [k, c] of Object.entries(secCounts)) sections.push({ kind: k, count: c });
}

// ---------------------------------------------------------------- changelog + versions
const versions = q('SELECT version, imported_at, page_count, entity_count, is_current, notes FROM import_run ORDER BY id DESC');
const changeRows = q('SELECT version_from, version_to, kind, slug, name, change_type, field, old_value, new_value, summary, seq FROM change_entry ORDER BY version_to DESC, seq ASC');

// group into per-version buckets, and per-entity for modifications
const byVersion = new Map();
for (const c of changeRows) {
  if (!byVersion.has(c.version_to)) {
    const ir = versions.find((v) => v.version === c.version_to);
    byVersion.set(c.version_to, {
      version_to: c.version_to, version_from: c.version_from,
      imported_at: ir?.imported_at || null,
      baseline: [], added: [], removed: [], modified: [],
    });
  }
  const b = byVersion.get(c.version_to);
  if (c.change_type === 'modified') b.modified.push(c);
  else if (c.change_type === 'added') b.added.push(c);
  else if (c.change_type === 'removed') b.removed.push(c);
  else b.baseline.push(c);
}
// collapse modified rows by entity for readable display
for (const b of byVersion.values()) {
  const perEntity = new Map();
  for (const m of b.modified) {
    const key = `${m.kind}:${m.slug}`;
    if (!perEntity.has(key)) perEntity.set(key, { kind: m.kind, slug: m.slug, name: m.name, changes: [] });
    perEntity.get(key).changes.push({ field: m.field, old_value: m.old_value, new_value: m.new_value, summary: m.summary });
  }
  b.modifiedGrouped = [...perEntity.values()];
}
const changelog = [...byVersion.values()];

writeFileSync(join(SRC_DATA, 'changes.json'), JSON.stringify({
  current: version,
  versions,
  changelog,
}));

// ---------------------------------------------------------------- meta + search
writeFileSync(join(SRC_DATA, 'meta.json'), JSON.stringify({
  builtAt: new Date().toISOString(),
  db: DB_PATH,
  version,
  sections: sections.sort((a, b) => b.count - a.count),
  sources: [...sourcesSet].sort((a, b) => a.localeCompare(b)),
}));
writeFileSync(join(PUB_DATA, 'search.json'), JSON.stringify(searchAll));

console.log(`\nDone. ${sections.length} sections, ${searchAll.length} entries, version ${version}.`);
db.close();
