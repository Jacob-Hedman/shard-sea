// The characters list — everyone's sheets (shared collection).
import { api, esc } from './charApi';

export async function initList(mount: HTMLElement) {
  let items: any[] = [];
  try { items = await api.list(); } catch { items = []; }
  if ((items as any).error !== undefined || !Array.isArray(items)) items = [];

  const cards = items.map((c) => `
    <a class="card card-hover" href="/characters/sheet?c=${encodeURIComponent(c.id)}" style="display:block;padding:1rem 1.1rem">
      <div style="display:flex;align-items:baseline;gap:.6rem">
        <span style="font-weight:600;font-size:1.05rem;color:var(--color-ink)">${esc(c.name || 'Unnamed')}</span>
        <span class="cs-pill" style="color:var(--color-gold)">Tier ${esc(c.tier ?? '?')}</span>
      </div>
      <div class="cs-f" style="margin-top:.4rem">updated ${esc((c.updatedAt || '').slice(0, 10) || '—')}</div>
    </a>`).join('');

  mount.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
      <div>
        <h1 style="font-size:1.9rem;letter-spacing:-.02em">Characters</h1>
        <p style="color:var(--color-muted);font-size:.9rem;margin-top:.25rem">Everyone's sheets — build your own or open a friend's.</p>
      </div>
      <a class="cs-copy" style="margin-left:auto;text-decoration:none" href="/characters/build">+ New character</a>
    </div>
    ${items.length
      ? `<div style="display:grid;gap:.7rem;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))">${cards}</div>`
      : `<div class="card" style="padding:2rem;text-align:center;color:var(--color-muted)">No characters yet. <a href="/characters/build" style="color:var(--color-gold)">Build the first one →</a></div>`}`;
}
