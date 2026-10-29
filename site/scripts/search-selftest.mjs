// Self-test for the search core (src/lib/searchcore.js): name matching and the phrase parser,
// against the committed data. Run: npm run test:search
import { readFileSync } from 'node:fs';
import { NameIndex, parseQuery } from '../src/lib/searchcore.js';

const data = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), 'utf8'));
const index = new NameIndex(data('search.json'));
// the same vocabulary GlobalSearch.astro builds (a small hand-written subset is enough here)
const kindWords = { feats: 'feat', feat: 'feat', weapons: 'weapon', 'magic items': 'magic_item', armor: 'armor', armour: 'armor', conditions: 'condition', 'spirit bindings': 'spirit', spirits: 'spirit', actions: 'action', action: 'action', 'artifice items': 'artifice', artifice: 'artifice' };
const facets = {};
for (const [kind, fields] of Object.entries({ feat: ['skill', 'discipline', 'tier'], weapon: ['weapon_group', 'mode', 'tier'], armor: ['armor_kind', 'tier'], condition: ['severity'], spirit: ['court', 'rank'], artifice: ['category', 'custom'] })) {
  const by = {};
  for (const r of data(`${kind}.index.json`)) for (const f of fields) for (const v of r.facets?.[f] ?? []) (by[f] ??= new Set()).add(v);
  facets[kind] = Object.fromEntries(Object.entries(by).map(([f, v]) => [f, [...v]]));
}

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('FAIL', msg); } else console.log('ok  ', msg); };
const cues = (q) => { const p = parseQuery(q, facets, kindWords); return `${p.kind}|${p.cues.map((c) => `${c.field}=${c.value}`).join(',')}|${p.rest}`; };

ok(index.search('imperial sabre')[0]?.e.n === 'Imperial Saber', 'typo: imperial sabre -> Imperial Saber');
ok(index.search('saber imperial')[0]?.e.n === 'Imperial Saber', 'any word order');
ok(cues('vitality feats') === 'feat|skill=Vitality|', 'vitality feats -> Feats, Skill Vitality');
ok(cues('feats tier 2') === 'feat|tier=Tier 2|', 'feats tier 2 -> Tier 2');
ok(cues('t3 armour') === 'armor|tier=Tier 3|', 't3 armour -> Armor, Tier 3');
ok(cues('ranged weapons') === 'weapon|mode=Ranged|', 'ranged weapons -> Mode Ranged');
ok(cues('major conditions') === 'condition|severity=Major|', 'major conditions -> Severity Major');
ok(cues('action feats') === 'feat|skill=Action|', 'action feats: Feats wins, Action is the Skill');
ok(cues('custom artifice') === 'artifice|custom=Custom|', 'custom artifice -> Custom');
ok(cues('feats with cleave') === 'feat||cleave', 'unknown words stay as text');
ok(!parseQuery('vitality', facets, kindWords).structured, 'a plain name is never turned into filters');
const bare = parseQuery('spirits', facets, kindWords);
ok(bare.kind === 'spirit' && !bare.structured, 'a bare section word names the section without filtering');

if (fail) { console.error(`${fail} failed`); process.exit(1); }
console.log('all passed');
