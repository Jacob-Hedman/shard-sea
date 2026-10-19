// Compare: up to four entries from one section, picked from entry pages or browse rows, kept in
// this browser (localStorage) and shown side by side on /compare. A tray at the bottom of every
// page lists the picks. Picking from another section starts a new comparison.
const KEY = 'codex-compare';
export const MAX = 4;

export interface Pick {
  k: string; // kind
  s: string; // slug
  n: string; // name
  h: string; // href
}

export function getPicks(): Pick[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    // only paths on this site: /compare fetches each pick's page and shows parts of it
    return Array.isArray(v) ? v.filter((p) => p && p.k && p.s && typeof p.h === 'string' && /^\/(?![/\\])/.test(p.h)).slice(0, MAX) : [];
  } catch {
    return [];
  }
}
export function setPicks(list: Pick[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage blocked: the tray just stays empty */
  }
  sync();
}

/** Adds or removes an entry; a pick from another section replaces the list, a fifth drops the oldest. */
export function toggle(p: Pick): void {
  p = { ...p, h: slash(p.h) };
  const list = getPicks();
  if (list.some((x) => x.h === p.h)) return setPicks(list.filter((x) => x.h !== p.h));
  const same = list.filter((x) => x.k === p.k);
  setPicks([...same, p].slice(-MAX));
}

export const compareHref = (list: Pick[]) =>
  list.length ? `/compare?kind=${encodeURIComponent(list[0].k)}&e=${list.map((p) => encodeURIComponent(p.s)).join(',')}` : '/compare';

const slash = (h: string) => h.replace(/\/?$/, '/');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Reflects the picks on every compare button and in the tray. */
export function sync(): void {
  const list = getPicks();
  const on = new Set(list.map((p) => p.h));
  document.querySelectorAll<HTMLElement>('[data-cmp]').forEach((b) => {
    const picked = on.has(slash(b.dataset.cmpH ?? ''));
    b.setAttribute('aria-pressed', String(picked));
    const t = b.querySelector('[data-cmp-t]');
    if (t) t.textContent = picked ? 'Comparing' : 'Compare';
  });
  const tray = document.getElementById('cmp-tray');
  if (!tray) return;
  const onPage = location.pathname.replace(/\/$/, '') === '/compare';
  tray.hidden = !list.length || onPage;
  if (tray.hidden) return;
  tray.innerHTML = `<span class="cmp-h">Compare <b>${list.length}/${MAX}</b></span>
    <ul>${list.map((p) => `<li><a href="${esc(p.h)}">${esc(p.n)}</a><button type="button" data-cmp-rm="${esc(p.h)}" aria-label="Remove ${esc(p.n)}">×</button></li>`).join('')}</ul>
    <a class="cmp-go${list.length < 2 ? ' is-off' : ''}" href="${compareHref(list)}">${list.length < 2 ? 'Pick one more' : 'Compare side by side →'}</a>
    <button type="button" class="cmp-clear" data-cmp-clear>Clear</button>`;
}

let bound = false;
/** Delegated clicks for compare buttons and the tray; call on every page load. */
export function initCompare(): void {
  sync();
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const b = t.closest<HTMLElement>('[data-cmp]');
    if (b) {
      e.preventDefault();
      const d = b.dataset;
      toggle({ k: d.cmpK!, s: d.cmpS!, n: d.cmpN!, h: d.cmpH! });
      return;
    }
    const rm = t.closest<HTMLElement>('[data-cmp-rm]');
    if (rm) return setPicks(getPicks().filter((p) => p.h !== rm.dataset.cmpRm));
    if (t.closest('[data-cmp-clear]')) setPicks([]);
  });
  // Another tab changed the picks.
  window.addEventListener('storage', (e) => e.key === KEY && sync());
}
