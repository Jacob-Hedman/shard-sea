// /api/characters — list all (GET) and create (POST).
import { PREFIX, json, sanitize, putCharacter } from './_store.js';

export async function onRequestGet({ env }) {
  if (!env.CHARACTERS) return json({ error: 'storage not configured' }, 503);
  const out = [];
  let cursor;
  do {
    const list = await env.CHARACTERS.list({ prefix: PREFIX, cursor });
    for (const k of list.keys) out.push({ id: k.name.slice(PREFIX.length), ...(k.metadata || {}) });
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return json(out);
}

export async function onRequestPost({ env, request }) {
  if (!env.CHARACTERS) return json({ error: 'storage not configured' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  const now = new Date().toISOString();
  const char = sanitize({ ...body, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
  if (!char.name.trim()) return json({ error: 'name required' }, 400);
  await putCharacter(env, char);
  return json({ id: char.id, updatedAt: now }, 201);
}
