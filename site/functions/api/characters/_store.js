// Shared helpers for the character API (KV-backed). Files prefixed with `_` are
// not routed by Pages, only imported. Every /api request is already behind the
// site's shared password gate (functions/_middleware.js), so any signed-in
// friend can read and write any character — the group shares its sheets.
export const PREFIX = 'char:';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const numOr = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);

/** Keep only known character fields, coerce types, cap sizes — never trust the body. */
export function sanitize(input) {
  const a = input.abilities || {};
  const ab = (x) => ({ base: numOr(x?.base), bonus: numOr(x?.bonus) });
  return {
    id: String(input.id || ''),
    name: String(input.name || 'Unnamed').slice(0, 80),
    tier: Math.min(3, Math.max(1, numOr(input.tier, 1))),
    archetype: input.archetype ? String(input.archetype).slice(0, 80) : null,
    background: input.background ? String(input.background).slice(0, 80) : null,
    abilities: { body: ab(a.body), mind: ab(a.mind), reflex: ab(a.reflex) },
    abilityStart: input.abilityStart
      ? { body: numOr(input.abilityStart.body), mind: numOr(input.abilityStart.mind), reflex: numOr(input.abilityStart.reflex) }
      : null,
    strain: numOr(input.strain),
    corruption: numOr(input.corruption),
    expEarned: numOr(input.expEarned, 500),
    money: numOr(input.money),
    skills: arr(input.skills).map(String).slice(0, 10),
    disciplines: arr(input.disciplines).slice(0, 30).map((d) => ({
      slug: String(d.slug || ''), name: String(d.name || d.slug || ''),
      skill: d.skill ? String(d.skill) : null, degree: numOr(d.degree, 1),
    })),
    feats: arr(input.feats).slice(0, 200).map((f) => ({
      slug: f.slug ? String(f.slug) : null, name: String(f.name || ''),
      source: f.source ? String(f.source) : 'manual',
    })),
    items: arr(input.items).slice(0, 300).map((i) => ({
      id: String(i.id || crypto.randomUUID()),
      kind: String(i.kind || 'generic'),
      refSlug: i.refSlug ? String(i.refSlug) : null,
      name: String(i.name || '').slice(0, 120),
      bulk: numOr(i.bulk),
      qty: numOr(i.qty, 1),
      equipped: !!i.equipped,
      notches: numOr(i.notches),
      dtPlus: numOr(i.dtPlus),
      accuracy: numOr(i.accuracy),
      damage: i.damage ? String(i.damage).slice(0, 80) : '',
      traits: i.traits ? String(i.traits).slice(0, 200) : '',
      note: i.note ? String(i.note).slice(0, 300) : '',
    })),
    notes: String(input.notes || '').slice(0, 4000),
    visibility: 'shared',
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || null,
    schemaVersion: 1,
  };
}

/** Write a character + a light metadata summary so listing is cheap. */
export async function putCharacter(env, char) {
  await env.CHARACTERS.put(PREFIX + char.id, JSON.stringify(char), {
    metadata: { name: char.name, tier: char.tier, updatedAt: char.updatedAt },
  });
}
