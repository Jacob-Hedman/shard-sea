// Client-side faceted browse/filter for a section listing page (the Codex ledger).
// Reads /data/<kind>.index.json once and filters live: AND across categories,
// OR within a category (AND for tag facets, see below), plus free-text search.
// The UI is a form band of category buttons with drop-down menus, removable
// active-filter chips, and results as numbered ledger rows.
// Filters can be preset from the URL: /spells?school=Evocation&level=3&q=fire.
import { facetValueLabel, tidyValue, titleCase } from '../lib/format';
import { getExcluded, toggleExcluded } from './prefs';
import { sync as syncCompare } from './compare';
import { makeTextFilter, hayTokens } from '../lib/searchcore.js';

interface Rec {
  id: number;
  slug: string;
  name: string;
  kind: string;
  sub?: string;
  desc?: string;
  source: string;
  content_type: string;
  license: string;
  tier?: number | null;
  facets: Record<string, string[]>;
}
interface FacetDef {
  field: string;
  label: string;
  range?: boolean;
}

const PAGE = 60;
const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function skeleton(): string {
  const row = `<tr class="sk"><td><div class="skeleton" style="height:14px;width:60%"></div><div class="skeleton" style="height:10px;width:35%;margin-top:6px"></div></td><td class="hide-sm"><div class="skeleton" style="height:10px;width:90%"></div></td><td class="hide-md"><div class="skeleton" style="height:10px;width:70%"></div></td></tr>`;
  return Array.from({ length: 12 }, () => row).join('');
}

// Bound once on document (survives View-Transition re-inits of #browse): close
// any open category menu on outside-click or Escape.
let docBound = false;
function bindGlobalClose() {
  if (docBound) return;
  docBound = true;
  const closeAll = () => {
    document.querySelectorAll('.cat-menu').forEach((m) => m.classList.add('hidden'));
    document.querySelectorAll('.cat-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.cat.is-open').forEach((c) => c.classList.remove('is-open'));
  };
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t?.closest?.('.cat')) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}

export async function initBrowse() {
  const root = document.getElementById('browse');
  if (!root || root.dataset.init) return; // guard: one init per (re-rendered) element
  root.dataset.init = '1';
  bindGlobalClose();
  const kind = root.dataset.kind!;
  const route = root.dataset.route!;
  const facetDefs: FacetDef[] = JSON.parse(root.dataset.facets || '[]');
  const defaultInclude = new Set(
    (root.dataset.defaultInclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const pageHidden = new Set<string>(); // user unchecked a default-included type on this page only

  const contentVisible = (ct: string) =>
    defaultInclude.has(ct) ? !pageHidden.has(ct) : !getExcluded().has(ct);

  const catsEl = document.getElementById('browse-cats')!;
  const chipsEl = document.getElementById('browse-chips')!;
  const resultsEl = document.getElementById('browse-results')!;
  const countEl = document.getElementById('browse-count')!;
  const moreBtn = document.getElementById('browse-more') as HTMLButtonElement;
  const qInput = document.getElementById('browse-q') as HTMLInputElement;
  const sortSel = document.getElementById('browse-sort') as HTMLSelectElement | null;
  const defaultSort = root.dataset.defaultSort || 'name';

  resultsEl.innerHTML = skeleton();

  let records: Rec[] = [];
  try {
    records = await (await fetch(`/data/${kind}.index.json`)).json();
  } catch {
    resultsEl.innerHTML = `<tr><td class="empty" colspan="3">Could not load the index. Reload the page to try again.</td></tr>`;
    return;
  }
  records.sort((a, b) => a.name.localeCompare(b.name));

  // Sort control (Shard-sea): tiered sections default to Tier ascending, T1 first; the
  // control is hidden when the section has no tiers.
  const hasTiers = records.some((r) => r.tier != null);
  if (sortSel) {
    if (!hasTiers) sortSel.closest('.sortbox')?.classList.add('hidden');
    else sortSel.value = defaultSort === 'tier' ? 'tier' : 'name';
  }
  function sortRecs(list: Rec[]): Rec[] {
    const mode = sortSel && hasTiers ? sortSel.value : 'name';
    const byName = (a: Rec, b: Rec) => a.name.localeCompare(b.name);
    if (mode === 'tier')
      return list.sort((a, b) => (a.tier ?? Infinity) - (b.tier ?? Infinity) || byName(a, b));
    return list.sort(byName);
  }

  // distinct facet values + counts
  const facetValues: Record<string, Map<string, number>> = {};
  for (const def of facetDefs) facetValues[def.field] = new Map();
  for (const r of records) {
    for (const def of facetDefs) {
      for (const v of r.facets[def.field] ?? []) {
        const m = facetValues[def.field];
        m.set(v, (m.get(v) ?? 0) + 1);
      }
    }
  }

  // Within one category, selecting several values NARROWS (AND / intersection)
  // for tag-style facets — an entry must carry EVERY selected tag (e.g. a class
  // tagged both "Dragon" and "Defense"). Facets whose values are alternatives
  // (an entry has exactly one) can't AND — picking two would yield nothing — so
  // those OR (either/or). FORCE_OR also keeps naturally multi-valued but
  // list-like facets (a spell's classes/levels/school) as OR, since there the
  // user means "any of these". AND is auto-enabled for a facet only when some
  // entry actually carries more than one of its values (a genuine tag facet).
  // Numeric range facets (min–max inputs) — declared in sections.ts.
  const rangeFields = new Set(facetDefs.filter((d) => d.range).map((d) => d.field));
  const bounds: Record<string, { min: number; max: number }> = {};
  for (const field of rangeFields) {
    let lo = Infinity, hi = -Infinity;
    for (const r of records)
      for (const v of r.facets[field] ?? []) {
        const n = Number(v);
        if (Number.isFinite(n)) { if (n < lo) lo = n; if (n > hi) hi = n; }
      }
    if (Number.isFinite(lo)) bounds[field] = { min: lo, max: hi };
  }
  const ranges: Record<string, { min?: number; max?: number }> = {};
  const rangeActive = (f: string) => !!ranges[f] && (ranges[f].min != null || ranges[f].max != null);

  const FORCE_OR = new Set(['level', 'class', 'school', 'type', 'subschool', 'applies_to']);
  const andFields = new Set<string>();
  for (const def of facetDefs) {
    const f = def.field;
    if (f === 'content_type' || FORCE_OR.has(f) || rangeFields.has(f)) continue;
    if (records.some((r) => (r.facets[f]?.length ?? 0) > 1)) andFields.add(f);
  }

  const selected: Record<string, Set<string>> = {};
  let page = 1;
  let filtered = records;
  const recTokens = new WeakMap<Rec, string[]>(); // each row's searchable words, built on first search

  const numericish = (f: string) => /level$/.test(f);
  function sortedValues(field: string): [string, number][] {
    const arr = [...facetValues[field].entries()];
    if (numericish(field)) return arr.sort((a, b) => (Number(a[0]) || 0) - (Number(b[0]) || 0));
    return arr.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  // ---- category dropdown buttons (content_type handled by the "Show" toggles)
  const activeDefs = facetDefs.filter((d) =>
    d.field === 'content_type'
      ? false
      : d.range
        ? bounds[d.field] && bounds[d.field].max > bounds[d.field].min
        : (facetValues[d.field]?.size ?? 0) > 0,
  );
  function rangeButton(def: FacetDef): string {
    const b = bounds[def.field];
    const inp = (cls: string, ph: number, lab: string) =>
      `<label>${lab}<input type="number" inputmode="numeric" class="${cls}" data-field="${esc(def.field)}" placeholder="${ph}" /></label>`;
    return `
    <div class="cat" data-field="${esc(def.field)}">
      <button type="button" class="cat-btn" aria-expanded="false">
        <span class="cat-l">${esc(def.label)}</span><span class="cat-sel">Any</span>
        <span class="cat-count hidden"></span><span class="chev" aria-hidden="true"></span>
      </button>
      <div class="cat-menu hidden">
        <div class="range">${inp('range-min', b.min, 'From')}${inp('range-max', b.max, 'To')}</div>
        <p class="range-note">Range ${b.min.toLocaleString()}–${b.max.toLocaleString()}</p>
      </div>
    </div>`;
  }
  function catButton(def: FacetDef): string {
    if (def.range) return rangeButton(def);
    const values = sortedValues(def.field);
    const many = values.length > 12;
    const rows = values
      .map(
        ([v, n]) => `
        <label class="opt" data-val="${esc(v.toLowerCase())}">
          <input type="checkbox" data-field="${esc(def.field)}" value="${esc(v)}" />
          <span class="opt-l">${esc(facetValueLabel(def.field, v))}</span>
          <span class="opt-n">${n}</span>
        </label>`,
      )
      .join('');
    return `
    <div class="cat" data-field="${esc(def.field)}">
      <button type="button" class="cat-btn" aria-expanded="false">
        <span class="cat-l">${esc(def.label)}</span><span class="cat-sel">Any</span>
        <span class="cat-count hidden"></span><span class="chev" aria-hidden="true"></span>
      </button>
      <div class="cat-menu hidden">
        ${many ? `<input type="text" class="cat-filter" placeholder="Filter ${esc(def.label.toLowerCase())}…" />` : ''}
        <div class="cat-values">${rows}</div>
      </div>
    </div>`;
  }

  // content-visibility checkboxes (persisted; homebrew is hidden by default)
  const ctTypes = [...(facetValues['content_type']?.keys() ?? [])].filter((c) => c !== 'official');
  function ctBox(c: string): string {
    const on = contentVisible(c);
    return `<label class="ctbox"><input type="checkbox" class="ct-box" data-ct="${esc(c)}" ${on ? 'checked' : ''}/> Include ${esc(c)}</label>`;
  }
  const ctEl = document.getElementById('browse-ct');
  if (ctEl) ctEl.innerHTML = ctTypes.map(ctBox).join('');

  catsEl.innerHTML = activeDefs.map(catButton).join('');

  // ---- active filter chips + per-category selected counts
  function renderChips() {
    const parts: string[] = [];
    for (const def of facetDefs) {
      const sel = selected[def.field];
      if (!sel || !sel.size) continue;
      for (const v of sel)
        parts.push(`
        <button type="button" class="chip" data-field="${esc(def.field)}" data-val="${esc(v)}" aria-label="Remove ${esc(def.label)}: ${esc(facetValueLabel(def.field, v))}">
          ${facetValueLabel(def.field, v).startsWith(def.label) ? '' : `<span class="chip-k">${esc(def.label)}</span> `}${esc(facetValueLabel(def.field, v))}<span class="x" aria-hidden="true">×</span>
        </button>`);
    }
    for (const def of facetDefs) {
      if (!def.range || !rangeActive(def.field)) continue;
      const { min, max } = ranges[def.field];
      const txt = min != null && max != null ? `${min.toLocaleString()}–${max.toLocaleString()}`
        : min != null ? `≥ ${min.toLocaleString()}` : `≤ ${max!.toLocaleString()}`;
      parts.push(`
        <button type="button" class="chip" data-range="${esc(def.field)}" aria-label="Remove ${esc(def.label)}: ${esc(txt)}">
          <span class="chip-k">${esc(def.label)}</span> ${esc(txt)}<span class="x" aria-hidden="true">×</span>
        </button>`);
    }
    chipsEl.innerHTML = parts.length
      ? parts.join('') +
        `<button type="button" id="browse-clear" class="clear">Clear all</button>`
      : '';
    catsEl.querySelectorAll<HTMLElement>('.cat').forEach((cat) => {
      const field = cat.dataset.field!;
      const isRange = rangeFields.has(field);
      const n = isRange ? (rangeActive(field) ? 1 : 0) : (selected[field]?.size ?? 0);
      const badge = cat.querySelector('.cat-count') as HTMLElement | null;
      const selEl = cat.querySelector('.cat-sel') as HTMLElement | null;
      if (badge) {
        badge.textContent = isRange ? '•' : String(n);
        badge.classList.toggle('hidden', n === 0);
      }
      if (selEl) {
        if (isRange) {
          const rg = ranges[field];
          selEl.textContent = n ? `${rg.min ?? '…'}–${rg.max ?? '…'}` : 'Any';
        } else {
          const def = facetDefs.find((d) => d.field === field)!;
          const vals = [...(selected[field] ?? [])].map((v) => facetValueLabel(def.field, v));
          selEl.textContent = vals.length ? vals.join(andFields.has(field) ? ' + ' : ', ') : 'Any';
        }
      }
      cat.classList.toggle('is-set', n > 0);
    });
    const nSet = catsEl.querySelectorAll('.cat.is-set').length;
    const tgl = document.querySelector('[data-filters-toggle] .n');
    if (tgl) tgl.textContent = nSet ? String(nSet) : '';
  }

  // ---- result row (the ledger)
  const hl = (text: string, q: string) => {
    const t = esc(text);
    if (!q) return t;
    const i = text.toLowerCase().indexOf(q);
    if (i >= 0) return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
    // several words (the search matches them in any order): mark where each one starts
    const words = q.split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length) return t;
    let out = '';
    let last = 0;
    for (const m of text.matchAll(new RegExp(`\\b(${words.join('|')})`, 'gi'))) {
      out += `${esc(text.slice(last, m.index))}<mark>${esc(m[0])}</mark>`;
      last = (m.index ?? 0) + m[0].length;
    }
    return out + esc(text.slice(last));
  };
  function row(r: Rec, n: number, q: string): string {
    const ct = r.content_type && r.content_type !== 'official' ? ` <span class="tag ${r.content_type === 'custom' ? 'red' : r.content_type === 'homebrew' ? 'blue' : 'yel'}">${esc(titleCase(r.content_type))}</span>` : '';
    const tr = r.tier != null ? `<span class="tier-n">T${r.tier}</span>` : '';
    return `<tr${n <= 12 ? ` style="--i:${n}"` : ''}>
      <td class="nm"><span class="n">${String(n).padStart(2, '0')}</span><a href="/${route}/${esc(r.slug)}">${hl(r.name, q)}</a>${ct}<button type="button" class="cmp-row" data-cmp data-cmp-k="${esc(r.kind)}" data-cmp-s="${esc(r.slug)}" data-cmp-n="${esc(r.name)}" data-cmp-h="/${route}/${esc(r.slug)}/" aria-pressed="false" title="Compare" aria-label="Compare ${esc(r.name)}">⇄</button>${r.sub ? `<span class="sub">${esc(tidyValue(r.sub))}</span>` : ''}</td>
      <td class="ds hide-sm">${r.desc ? esc(r.desc) : '<span class="none">—</span>'}</td>
      <td class="src hide-md">${tr}${esc(r.source)}</td>
    </tr>`;
  }
  // The count rolls from the last total to the new one in a few hard steps, like a counter
  // (straight to the number under reduced motion or on the first render).
  let shownCount = -1;
  let tick = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  function setCount(n: number) {
    const write = (v: number) => (countEl.innerHTML = `<strong>${v.toLocaleString()}</strong> of ${records.length.toLocaleString()} filed`);
    cancelAnimationFrame(tick);
    countEl.removeAttribute('aria-busy');
    const from = shownCount;
    shownCount = n;
    if (from < 0 || from === n || still.matches) return void write(n);
    countEl.classList.remove('ticking');
    void countEl.offsetWidth;
    countEl.classList.add('ticking');
    countEl.setAttribute('aria-busy', 'true'); // announce only the final number
    const t0 = performance.now(), STEPS = 8, MS = 320;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, Math.floor(((t - t0) / MS) * STEPS) / STEPS));
      write(Math.round(from + (n - from) * p));
      if (p < 1) tick = requestAnimationFrame(step);
      else countEl.removeAttribute('aria-busy');
    };
    tick = requestAnimationFrame(step);
  }
  function render(reset: boolean) {
    if (reset) page = 1;
    const q = qInput.value.trim().toLowerCase();
    const slice = filtered.slice(0, page * PAGE);
    resultsEl.innerHTML = slice.length
      ? slice.map((r, i) => row(r, i + 1, q)).join('')
      : `<tr><td class="empty" colspan="3">No entries match. Remove a filter, or <button type="button" class="lnk" data-clear-all>clear them all</button>.</td></tr>`;
    // New results arrive in a short stepped stagger; "Show more" appends without it.
    if (reset && shownCount >= 0) {
      resultsEl.classList.remove('rows-in');
      void resultsEl.offsetWidth;
      resultsEl.classList.add('rows-in');
    }
    setCount(filtered.length);
    syncCompare();
    moreBtn.classList.toggle('hidden', slice.length >= filtered.length);
    moreBtn.textContent = `Show ${Math.min(PAGE, filtered.length - slice.length)} more`;
  }
  function apply() {
    // every word, in any order; accents, apostrophes and plurals folded ("cure wounds",
    // "bulls strength") — lib/searchcore.js, same rules as the search palette
    const textOk = makeTextFilter(qInput.value);
    filtered = records.filter((r) => {
      if (!contentVisible(r.content_type)) return false;
      if (textOk) {
        let hay = recTokens.get(r);
        if (!hay) recTokens.set(r, (hay = hayTokens(`${r.name} ${r.sub ?? ''} ${r.desc ?? ''}`)));
        if (!textOk(hay)) return false;
      }
      for (const field in selected) {
        const sel = selected[field];
        if (!sel.size) continue;
        const vals = r.facets[field] ?? [];
        if (andFields.has(field)) {
          // AND: the entry must carry every selected tag
          for (const v of sel) if (!vals.includes(v)) return false;
        } else if (!vals.some((v) => sel.has(v))) {
          // OR: the entry must carry at least one of the selected values
          return false;
        }
      }
      for (const field of rangeFields) {
        if (!rangeActive(field)) continue;
        const { min, max } = ranges[field];
        const nums = (r.facets[field] ?? []).map(Number).filter((n) => !Number.isNaN(n));
        if (!nums.some((v) => (min == null || v >= min) && (max == null || v <= max))) return false;
      }
      return true;
    });
    sortRecs(filtered);
    render(true);
  }

  // ---- events
  function closeMenus() {
    catsEl.querySelectorAll('.cat-menu').forEach((m) => m.classList.add('hidden'));
    catsEl.querySelectorAll('.cat-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    catsEl.querySelectorAll('.cat.is-open').forEach((c) => c.classList.remove('is-open'));
  }
  catsEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const btn = t.closest('.cat-btn') as HTMLElement | null;
    if (btn) {
      const menu = btn.nextElementSibling as HTMLElement;
      const willOpen = menu.classList.contains('hidden');
      closeMenus();
      if (willOpen) {
        menu.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        btn.closest('.cat')?.classList.add('is-open');
        menu.querySelector<HTMLInputElement>('.cat-filter')?.focus();
      }
    }
  });
  catsEl.addEventListener('change', (e) => {
    const cb = e.target as HTMLInputElement;
    if (cb.classList?.contains('ct-box') && cb.dataset.ct) {
      const ct = cb.dataset.ct;
      if (defaultInclude.has(ct)) {
        if (cb.checked) pageHidden.delete(ct);
        else pageHidden.add(ct);
      } else {
        toggleExcluded(ct);
      }
      apply();
      return;
    }
    if (cb.type !== 'checkbox' || !cb.dataset.field) return;
    const field = cb.dataset.field!;
    (selected[field] ??= new Set());
    if (cb.checked) selected[field].add(cb.value);
    else selected[field].delete(cb.value);
    renderChips();
    apply();
  });
  catsEl.addEventListener('input', (e) => {
    const inp = e.target as HTMLInputElement;
    if (inp.classList.contains('range-min') || inp.classList.contains('range-max')) {
      const field = inp.dataset.field!;
      const rg = (ranges[field] ??= {});
      const raw = inp.value.trim();
      const num = raw === '' ? undefined : Number(raw);
      const val = num == null || Number.isNaN(num) ? undefined : num;
      if (inp.classList.contains('range-min')) rg.min = val;
      else rg.max = val;
      renderChips();
      apply();
      return;
    }
    if (!inp.classList.contains('cat-filter')) return;
    const term = inp.value.trim().toLowerCase();
    inp.closest('.cat-menu')!
      .querySelectorAll<HTMLElement>('[data-val]')
      .forEach((lbl) => {
        lbl.style.display = !term || lbl.dataset.val!.includes(term) ? '' : 'none';
      });
  });

  resultsEl.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-clear-all]')) (chipsEl.querySelector('#browse-clear') as HTMLElement | null)?.click();
  });
  chipsEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('#browse-clear')) {
      for (const k in selected) selected[k].clear();
      for (const k in ranges) delete ranges[k];
      catsEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => (c.checked = false));
      catsEl.querySelectorAll<HTMLInputElement>('.range-min, .range-max').forEach((c) => (c.value = ''));
      renderChips();
      apply();
      return;
    }
    const rchip = t.closest('[data-range]') as HTMLElement | null;
    if (rchip) {
      const f = rchip.dataset.range!;
      delete ranges[f];
      catsEl
        .querySelectorAll<HTMLInputElement>(`.range-min[data-field="${CSS.escape(f)}"], .range-max[data-field="${CSS.escape(f)}"]`)
        .forEach((i) => (i.value = ''));
      renderChips();
      apply();
      return;
    }
    const chip = t.closest('.chip') as HTMLElement | null;
    if (chip) {
      const f = chip.dataset.field!;
      const v = chip.dataset.val!;
      selected[f]?.delete(v);
      const cb = catsEl.querySelector<HTMLInputElement>(
        `input[data-field="${CSS.escape(f)}"][value="${CSS.escape(v)}"]`,
      );
      if (cb) cb.checked = false;
      renderChips();
      apply();
    }
  });

  let raf = 0;
  qInput.addEventListener('input', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(apply);
  });
  moreBtn.addEventListener('click', () => {
    page++;
    render(false);
  });

  // Presets from the URL (the home page's shortcuts link here with them).
  const params = new URLSearchParams(location.search);
  let preset = false;
  for (const def of facetDefs) {
    const raw = params.get(def.field);
    if (!raw || def.range) continue;
    for (const v of raw.split(',')) {
      const cb = catsEl.querySelector<HTMLInputElement>(`input[data-field="${CSS.escape(def.field)}"][value="${CSS.escape(v)}"]`);
      if (!cb) continue;
      cb.checked = true;
      (selected[def.field] ??= new Set()).add(v);
      preset = true;
    }
  }
  if (params.get('q')) { qInput.value = params.get('q')!; preset = true; }

  sortSel?.addEventListener('change', () => apply());

  renderChips();
  apply(); // the first render honours the default sort
}
