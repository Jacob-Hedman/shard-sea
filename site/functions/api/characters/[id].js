// /api/characters/:id — read (GET), update (PUT), delete (DELETE).
import { PREFIX, json, sanitize, putCharacter } from './_store.js';

export async function onRequestGet({ env, params }) {
  if (!env.CHARACTERS) return json({ error: 'storage not configured' }, 503);
  const raw = await env.CHARACTERS.get(PREFIX + params.id);
  if (!raw) return json({ error: 'not found' }, 404);
  return new Response(raw, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestPut({ env, params, request }) {
  if (!env.CHARACTERS) return json({ error: 'storage not configured' }, 503);
  const existing = await env.CHARACTERS.get(PREFIX + params.id);
  if (!existing) return json({ error: 'not found' }, 404);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  const prev = JSON.parse(existing);
  const now = new Date().toISOString();
  const char = sanitize({ ...prev, ...body, id: params.id, createdAt: prev.createdAt, updatedAt: now });
  await putCharacter(env, char);
  return json({ ok: true, updatedAt: now });
}

export async function onRequestDelete({ env, params }) {
  if (!env.CHARACTERS) return json({ error: 'storage not configured' }, 503);
  await env.CHARACTERS.delete(PREFIX + params.id);
  return json({ ok: true });
}
