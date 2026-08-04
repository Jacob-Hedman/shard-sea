// Persistent, site-wide content-visibility preference (e.g. hide homebrew /
// third-party). Stored in localStorage; read by the browse listings + search.
const KEY = 'dnd-exclude-ct';
// Homebrew is opt-IN: most tables don't allow it, so first-time visitors
// (no stored preference) browse with homebrew hidden.
const DEFAULT_EXCLUDED = ['homebrew'];

export function getExcluded(): Set<string> {
  try {
    const v = localStorage.getItem(KEY);
    return new Set(v == null ? DEFAULT_EXCLUDED : JSON.parse(v));
  } catch {
    return new Set(DEFAULT_EXCLUDED);
  }
}
export function setExcluded(s: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}
export function toggleExcluded(ct: string): Set<string> {
  const s = getExcluded();
  s.has(ct) ? s.delete(ct) : s.add(ct);
  setExcluded(s);
  return s;
}
