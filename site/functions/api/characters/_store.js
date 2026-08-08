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
const str = (v, n) => (v == null ? '' : String(v).slice(0, n));
/** Ids end up in HTML attributes and selectors — keep them to a known-safe charset. */
const safeId = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : crypto.randomUUID());
/** Only http(s) images — never javascript:/data: in an img src. */
const safeUrl = (v) => {
  const s = str(v, 600).trim();
  return /^https?:\/\//i.test(s) ? s : '';
};

/** Keep only known character fields, coerce types, cap sizes — never trust the body. */
export function sanitize(input) {
  const a = input.abilities || {};
  const ab = (x) => ({ base: numOr(x?.base), bonus: numOr(x?.bonus), temp: numOr(x?.temp), tax: Math.max(0, numOr(x?.tax)) });
  return {
    id: String(input.id || ''),
    name: str(input.name, 80) || 'Unnamed',
    tier: Math.min(3, Math.max(1, Math.round(numOr(input.tier, 1)))),
    height: Math.min(12, Math.max(0.3, numOr(input.height, 1.8))),
    archetype: input.archetype ? str(input.archetype, 80) : null,
    fixation: input.fixation ? str(input.fixation, 80) : null,
    background: input.background ? str(input.background, 80) : null,
    portrait: safeUrl(input.portrait),
    abilities: { body: ab(a.body), mind: ab(a.mind), reflex: ab(a.reflex) },
    abilityStart: input.abilityStart
      ? { body: numOr(input.abilityStart.body), mind: numOr(input.abilityStart.mind), reflex: numOr(input.abilityStart.reflex) }
      : null,
    strain: (input.strain && typeof input.strain === 'object')
      ? { standard: Math.max(0, numOr(input.strain.standard)), persistent: Math.max(0, numOr(input.strain.persistent)), permanent: Math.max(0, numOr(input.strain.permanent)) }
      : { standard: Math.max(0, numOr(input.strain)), persistent: 0, permanent: 0 },
    corruption: Math.max(0, numOr(input.corruption)),
    conditions: arr(input.conditions).slice(0, 40).map((k) => ({
      slug: k.slug ? str(k.slug, 60) : null,
      name: str(k.name, 60),
      severity: str(k.severity, 20),
      effects: str(k.effects, 600),
      x: k.x == null ? null : numOr(k.x),
      note: str(k.note, 200),
    })),
    injuries: arr(input.injuries).slice(0, 40).map((i) => ({
      id: safeId(i.id),
      name: str(i.name, 80) || 'Injury',
      severity: str(i.severity, 20) || 'Minor',
      strain: Math.max(0, numOr(i.strain)),
      note: str(i.note, 200),
    })),
    expEarned: numOr(input.expEarned, 500),
    money: numOr(input.money),
    skills: arr(input.skills).map(String).slice(0, 10),
    disciplines: arr(input.disciplines).slice(0, 30).map((d) => ({
      slug: str(d.slug, 80), name: str(d.name || d.slug, 80),
      skill: d.skill ? str(d.skill, 40) : null, degree: numOr(d.degree, 1),
    })),
    feats: arr(input.feats).slice(0, 200).map((f) => ({
      slug: f.slug ? str(f.slug, 80) : null, name: str(f.name, 80),
      source: f.source ? str(f.source, 40) : 'manual',
    })),
    items: arr(input.items).slice(0, 300).map((i) => ({
      id: safeId(i.id),
      kind: str(i.kind, 20) || 'generic',
      refSlug: i.refSlug ? str(i.refSlug, 80) : null,
      name: str(i.name, 120),
      bulk: numOr(i.bulk),
      bulkFormula: str(i.bulkFormula, 60),
      qty: Math.max(0, numOr(i.qty, 1)),
      equipped: !!i.equipped,
      notches: Math.max(0, numOr(i.notches)),
      accuracy: numOr(i.accuracy),
      tier: i.tier == null ? null : numOr(i.tier),
      mode: str(i.mode, 20),
      weapon_group: str(i.weapon_group, 40),
      damage: str(i.damage, 80),
      traits: str(i.traits, 240),
      durability: str(i.durability, 40),
      movement_penalty: str(i.movement_penalty, 40),
      rating: str(i.rating, 120),
      activation: str(i.activation, 40),
      pattern: str(i.pattern, 160),
      effects: str(i.effects, 600),
      note: str(i.note, 300),
    })),
    notes: str(input.notes, 4000),
    noteSections: arr(input.noteSections).slice(0, 20).map((n) => ({
      title: str(n.title, 60) || 'Note',
      body: str(n.body, 4000),
    })),
    expLedger: arr(input.expLedger).slice(0, 100).map((e) => ({
      label: str(e.label, 80),
      amount: numOr(e.amount),
      note: str(e.note, 200),
    })),
    visibility: 'shared',
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || null,
    schemaVersion: 2,
  };
}

/** Write a character + a light metadata summary so listing is cheap. */
export async function putCharacter(env, char) {
  await env.CHARACTERS.put(PREFIX + char.id, JSON.stringify(char), {
    metadata: { name: char.name, tier: char.tier, updatedAt: char.updatedAt },
  });
}
