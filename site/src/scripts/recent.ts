// Recently viewed entries, newest first, kept in this browser only (localStorage). Entry pages
// record themselves; the search palette and the home page list them. The palette reads the same
// key from its inline script, so keep KEY and the row shape in step with GlobalSearch.astro.
export const KEY = 'codex-recent';
const MAX = 12;

export interface Recent {
  k: string; // kind
  n: string; // name
  h: string; // href
}

export function getRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    // only paths on this site: whatever sits in storage becomes a link
    return Array.isArray(v) ? v.filter((r) => r && typeof r.h === 'string' && /^\/(?![/\\])/.test(r.h) && r.n) : [];
  } catch {
    return [];
  }
}

export function addRecent(r: Recent): void {
  try {
    const list = [r, ...getRecent().filter((x) => x.h !== r.h)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: nothing to remember */
  }
}

/** Records the entry on this page, if it is one (EntityDetail marks its <article>). */
export function recordPage(): void {
  const el = document.querySelector<HTMLElement>('article.file[data-rk]');
  if (el) addRecent({ k: el.dataset.rk!, n: el.dataset.rn!, h: location.pathname });
}
