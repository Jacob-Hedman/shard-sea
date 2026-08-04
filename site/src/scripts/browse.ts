// Client-side faceted browse/filter for a section listing page.
// Reads /data/<kind>.index.json once and filters live: AND across categories,
// OR within a category, plus free-text search. The UI is a compact chip-bar —
// category dropdown buttons under the search, and removable active-filter chips.
import { facetValueLabel, contentTypeBadge, titleCase } from '../lib/format';
import { getExcluded, toggleExcluded } from './prefs';

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
  facets: Record<string, string[]>;
}
interface FacetDef {
  field: string;
  label: string;
}

const PAGE = 60;
const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function skeleton(): string {
  const card = `<div class="card flex flex-col gap-2 p-3.5">
    <div class="skeleton h-4 w-2/3"></div>
    <div class="skeleton h-2.5 w-1/3"></div>
    <div class="skeleton mt-1 h-2.5 w-full"></div>
    <div class="skeleton h-2.5 w-4/5"></div>
  </div>`;
  return Array.from({ length: 9 }, () => card).join('');
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

  resultsEl.innerHTML = skeleton();

  let records: Rec[] = [];
  try {
    records = await (await fetch(`/data/${kind}.index.json`)).json();
  } catch {
    resultsEl.innerHTML = `<p class="col-span-full py-12 text-center text-nonogl">Could not load data.</p>`;
    return;
  }
  records.sort((a, b) => a.name.localeCompare(b.name));

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

  const selected: Record<string, Set<string>> = {};
  let page = 1;
  let filtered = records;

  const numericish = (f: string) => /level$/.test(f);
  function sortedValues(field: string): [string, number][] {
    const arr = [...facetValues[field].entries()];
    if (numericish(field)) return arr.sort((a, b) => (Number(a[0]) || 0) - (Number(b[0]) || 0));
    return arr.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  // ---- category dropdown buttons (content_type handled by the "Show" toggles)
  const activeDefs = facetDefs.filter(
    (d) => d.field !== 'content_type' && (facetValues[d.field]?.size ?? 0) > 0,
  );
  function catButton(def: FacetDef): string {
    const values = sortedValues(def.field);
    const many = values.length > 12;
    const rows = values
      .map(
        ([v, n]) => `
        <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[13px] hover:bg-surface" data-val="${esc(v.toLowerCase())}">
          <input type="checkbox" class="h-3.5 w-3.5 accent-gold" data-field="${esc(def.field)}" value="${esc(v)}" />
          <span class="flex-1 truncate text-muted">${esc(facetValueLabel(def.field, v))}</span>
          <span class="font-mono text-[10px] text-faint">${n}</span>
        </label>`,
      )
      .join('');
    return `
    <div class="cat relative" data-field="${esc(def.field)}">
      <button type="button" class="cat-btn flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-muted transition hover:border-line-strong hover:text-ink" aria-expanded="false">
        ${esc(def.label)}<span class="cat-count hidden rounded bg-gold/15 px-1.5 text-[11px] font-medium text-gold"></span>
        <i class="ti ti-chevron-down text-sm" aria-hidden="true"></i>
      </button>
      <div class="cat-menu absolute left-0 z-30 mt-1 hidden w-64 max-w-[80vw] rounded-lg border border-line-strong bg-surface-2 p-2 shadow-xl shadow-black/40">
        ${many ? `<input type="text" class="cat-filter mb-1.5 w-full rounded-md border border-line bg-base px-2 py-1 text-xs text-ink outline-none transition focus:border-line-strong placeholder:text-faint" placeholder="Filter ${esc(def.label.toLowerCase())}…" />` : ''}
        <div class="cat-values max-h-64 space-y-px overflow-y-auto pr-1">${rows}</div>
      </div>
    </div>`;
  }

  // content-visibility checkboxes (persisted; homebrew is hidden by default)
  const ctTypes = [...(facetValues['content_type']?.keys() ?? [])].filter((c) => c !== 'official');
  function ctBox(c: string): string {
    const on = contentVisible(c);
    return `<label class="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[12px] text-faint transition hover:text-muted">
      <input type="checkbox" class="ct-box h-3.5 w-3.5 accent-gold" data-ct="${esc(c)}" ${on ? 'checked' : ''}/>
      Include ${esc(c)} content</label>`;
  }
  const ctBlock = ctTypes.length
    ? `<div class="ml-auto flex items-center gap-4">${ctTypes.map(ctBox).join('')}</div>`
    : '';

  catsEl.innerHTML = activeDefs.map(catButton).join('') + ctBlock;

  // ---- active filter chips + per-category selected counts
  function renderChips() {
    const parts: string[] = [];
    for (const def of facetDefs) {
      const sel = selected[def.field];
      if (!sel || !sel.size) continue;
      for (const v of sel)
        parts.push(`
        <button type="button" class="chip inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 text-[12px] text-gold-strong transition hover:bg-gold/20" data-field="${esc(def.field)}" data-val="${esc(v)}">
          <span class="text-faint">${esc(def.label)}:</span> ${esc(facetValueLabel(def.field, v))}
          <i class="ti ti-x text-[13px]" aria-hidden="true"></i>
        </button>`);
    }
    chipsEl.innerHTML = parts.length
      ? parts.join('') +
        `<button type="button" id="browse-clear" class="ml-1 text-[12px] text-faint transition hover:text-gold">Clear all</button>`
      : '';
    catsEl.querySelectorAll<HTMLElement>('.cat').forEach((cat) => {
      const n = selected[cat.dataset.field!]?.size ?? 0;
      const badge = cat.querySelector('.cat-count') as HTMLElement | null;
      const btn = cat.querySelector('.cat-btn') as HTMLElement | null;
      if (badge) {
        badge.textContent = String(n);
        badge.classList.toggle('hidden', n === 0);
      }
      btn?.classList.toggle('text-ink', n > 0);
      btn?.classList.toggle('border-gold/50', n > 0);
    });
  }

  // ---- result card
  function pills(r: Rec): string {
    let h = `<span class="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">${esc(r.source)}</span>`;
    if (r.content_type && r.content_type !== 'official')
      h += `<span class="rounded border px-1.5 py-0.5 text-[10px] ${contentTypeBadge(r.content_type)}">${esc(titleCase(r.content_type))}</span>`;
    return h;
  }
  function card(r: Rec): string {
    return `<a href="/${route}/${esc(r.slug)}" class="card card-hover flex flex-col p-3.5">
      <h3 class="font-medium leading-snug text-ink">${esc(r.name)}</h3>
      ${r.sub ? `<p class="mt-0.5 text-xs text-faint">${esc(r.sub)}</p>` : ''}
      ${r.desc ? `<p class="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted">${esc(r.desc)}</p>` : ''}
      <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">${pills(r)}</div>
    </a>`;
  }
  function render(reset: boolean) {
    if (reset) page = 1;
    const slice = filtered.slice(0, page * PAGE);
    resultsEl.innerHTML = slice.length
      ? slice.map(card).join('')
      : `<p class="col-span-full py-12 text-center text-faint">No matches. Try removing some filters.</p>`;
    countEl.textContent = `${filtered.length.toLocaleString()} of ${records.length.toLocaleString()}`;
    moreBtn.classList.toggle('hidden', slice.length >= filtered.length);
  }
  function apply() {
    const q = qInput.value.trim().toLowerCase();
    filtered = records.filter((r) => {
      if (!contentVisible(r.content_type)) return false;
      if (q) {
        const hay = `${r.name} ${r.sub ?? ''} ${r.desc ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      for (const field in selected) {
        const sel = selected[field];
        if (!sel.size) continue;
        const vals = r.facets[field] ?? [];
        if (!vals.some((v) => sel.has(v))) return false;
      }
      return true;
    });
    render(true);
  }

  // ---- events
  function closeMenus() {
    catsEl.querySelectorAll('.cat-menu').forEach((m) => m.classList.add('hidden'));
    catsEl.querySelectorAll('.cat-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
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
    if (!inp.classList.contains('cat-filter')) return;
    const term = inp.value.trim().toLowerCase();
    inp.closest('.cat-menu')!
      .querySelectorAll<HTMLElement>('[data-val]')
      .forEach((lbl) => {
        lbl.style.display = !term || lbl.dataset.val!.includes(term) ? '' : 'none';
      });
  });

  chipsEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('#browse-clear')) {
      for (const k in selected) selected[k].clear();
      catsEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => (c.checked = false));
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

  renderChips();
  render(true);
}
