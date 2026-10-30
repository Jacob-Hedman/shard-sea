// Search core, shared by the search palette (components/GlobalSearch.astro), the
// browse pages' text box (scripts/browse.ts) and scripts/search-selftest.mjs.
// Ported from the D&D 3.5 Codex; the phrase parser reads Shard-sea's own sections and facets.
// Plain JS so Node can run the self-test without a build.
//
//   norm / tokens   fold accents, apostrophes, punctuation and plurals, so
//                   "bulls strength" = "Bull's Strength" and "faerun" = "Faerûn"
//   NameIndex       names (plus the alternate names export-data.mjs adds) -> ranked
//                   matches: words in any order, the last word may be unfinished,
//                   small typos forgiven ("magic misile")
//   parseQuery      spots words that name a section and its filters — "feats",
//                   "vitality", "tier 2", "ranged" — so a phrase can become filters
//   makeTextFilter  the browse box: every word (or its start) somewhere in the row

const MARKS = /[̀-ͯ]/g;

/** @param {unknown} s */
export function norm(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

// a Map, not an object literal: a name like "Constructor" must not find Object's constructor
const IRREG = new Map(Object.entries({
  elves: 'elf', dwarves: 'dwarf', wolves: 'wolf', staves: 'staff', knives: 'knife', lives: 'life',
  thieves: 'thief', halves: 'half', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth',
  mice: 'mouse', geese: 'goose', children: 'child', dice: 'die',
}));
/** Crude plural folding, applied the same way to names and queries. @param {string} t */
export function stem(t) {
  const irregular = IRREG.get(t);
  if (irregular) return irregular;
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 3 && t.endsWith('s') && !/(ss|us|is|os)$/.test(t)) return t.slice(0, -1);
  return t;
}

/** @param {unknown} s */
export function tokens(s) {
  const n = norm(s);
  return n ? n.split(' ').map(stem) : [];
}

/** Damerau–Levenshtein distance, giving up (returns max + 1) past `max`.
 * @param {string} a @param {string} b @param {number} max */
export function editDist(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  /** @type {number[] | null} */
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}
/** typos forgiven per word: none under 4 letters, 1 up to 7, 2 from 8 @param {string} t */
const typoBudget = (t) => (t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0);

/**
 * @typedef {{ n: string, k: string, s: string, b?: string, a?: string[], p?: number, v?: string, c?: string }} Entry
 * @typedef {{ e: Entry, i: number, tier: number, fz: number }} Hit
 */

export class NameIndex {
  /** @param {Entry[]} entries */
  constructor(entries) {
    this.entries = entries;
    /** @type {string[][]} normalized forms per entry, the name first */
    this.forms = [];
    /** @type {Map<string, number[]>} word -> entries that have it */
    this.vocab = new Map();
    entries.forEach((e, i) => {
      const forms = [e.n, ...(e.a || [])].map(norm).filter(Boolean);
      this.forms.push(forms.length ? forms : ['']);
      const seen = new Set();
      for (const f of forms) {
        for (const t of f.split(' ').map(stem)) {
          if (seen.has(t)) continue;
          seen.add(t);
          let list = this.vocab.get(t);
          if (!list) this.vocab.set(t, (list = []));
          list.push(i);
        }
      }
    });
    this.words = [...this.vocab.keys()];
    /** words in each entry's shortest form (extra words rank a little lower) */
    this.len = this.forms.map((fs) => Math.min(...fs.map((f) => f.split(' ').length)));
  }

  /** entry -> how well one query word matched it: 0 exact, 1 unfinished (prefix), 2 typo
   * @param {string} t @param {boolean} allowPrefix @param {boolean} anchored other words in the query too */
  _word(t, allowPrefix, anchored) {
    /** @type {Map<number, number>} */
    const hit = new Map();
    for (const i of this.vocab.get(t) || []) hit.set(i, 0);
    // a 3-letter word gets one typo only when other words narrow things down ("dimension dor")
    const budget = typoBudget(t) || (anchored && t.length === 3 ? 1 : 0);
    if (!allowPrefix && !budget) return hit;
    for (const w of this.words) {
      if (w === t) continue;
      let q = -1;
      if (allowPrefix && w.startsWith(t)) q = 1;
      else if (budget && w[0] === t[0] && Math.abs(w.length - t.length) <= budget && editDist(t, w, budget) <= budget) q = 2;
      if (q < 0) continue;
      for (const i of this.vocab.get(w) || []) {
        const cur = hit.get(i);
        if (cur === undefined || q < cur) hit.set(i, q);
      }
    }
    return hit;
  }

  /**
   * Every query word must match a word of the name (or of an alternate name), in any order.
   * @param {string} query
   * @param {{ kind?: string | null, limit?: number, skip?: ((e: Entry) => boolean) | null }} [opts]
   * @returns {Hit[]}
   */
  search(query, { kind = null, limit = 80, skip = null } = {}) {
    const qn = norm(query);
    if (!qn) return [];
    const qt = qn.split(' ').map(stem);
    /** @type {Map<number, { q: number, fz: number }> | null} */
    let acc = null;
    for (let w = 0; w < qt.length; w++) {
      const hits = this._word(qt[w], w === qt.length - 1, qt.length > 1);
      /** @type {Map<number, { q: number, fz: number }>} */
      const next = new Map();
      if (acc === null) for (const [i, q] of hits) next.set(i, { q, fz: q === 2 ? 1 : 0 });
      else
        for (const [i, st] of acc) {
          const q = hits.get(i);
          if (q !== undefined) next.set(i, { q: st.q + q, fz: st.fz + (q === 2 ? 1 : 0) });
        }
      acc = next;
      if (!acc.size) break;
    }
    /** @type {Hit[]} */
    const out = [];
    for (const [i, st] of acc || []) {
      const e = this.entries[i];
      if (kind && e.k !== kind) continue;
      if (skip && skip(e)) continue;
      const forms = this.forms[i];
      const alt = forms.indexOf(qn);
      let tier;
      if (forms[0] === qn) tier = 0; // the name, exactly
      else if (alt > 0) tier = qn.length >= 3 ? 0.5 : 1.1; // an alternate name typed in full: "greater invisibility", "dmm"
      else if (forms[0].startsWith(qn)) tier = 1; // the name, still being typed
      else if (forms.some((f) => f.startsWith(qn))) tier = 1.2;
      else tier = 2 + st.fz * 1.5 + (st.q - st.fz * 2) * 0.1; // words in another order; typos cost the most
      tier += Math.max(0, this.len[i] - qt.length) * 0.08; // extra words in the name
      out.push({ e, i, tier, fz: st.fz });
    }
    out.sort(
      (a, b) =>
        a.tier - b.tier || (b.e.p ?? 0) - (a.e.p ?? 0) || a.e.n.length - b.e.n.length || a.e.n.localeCompare(b.e.n),
    );
    return out.slice(0, limit);
  }

  /** Names closest to the whole query, for "Did you mean". @param {string} query @param {number} [limit] */
  suggest(query, limit = 3) {
    const qn = norm(query);
    if (qn.length < 3) return [];
    const max = Math.max(2, Math.floor(qn.length / 4));
    /** @type {{ e: Entry, d: number }[]} */
    const out = [];
    this.forms.forEach((fs, i) => {
      const f = fs[0];
      if (Math.abs(f.length - qn.length) > max) return;
      const d = editDist(qn, f, max);
      if (d <= max) out.push({ e: this.entries[i], d });
    });
    out.sort((a, b) => a.d - b.d || (b.e.p ?? 0) - (a.e.p ?? 0));
    return out.slice(0, limit).map((x) => x.e);
  }
}

// ---- query understanding ---------------------------------------------------------
const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'with', 'that', 'to', 'in', 'and', 'or', 'on', 'my', 'any', 'all']);
// Never filter values: provenance is a toggle, not a word in a phrase.
const SKIP_FIELDS = new Set(['content_type', 'license', 'source']);

/**
 * @typedef {{ field: string, value: string, label: string, from: number, to: number }} Cue
 * @typedef {{ structured: boolean, kind: string | null, prestige: boolean, cues: Cue[], rest: string,
 *   words: string[], kindAt: [number, number] | null }} Parsed
 * @typedef {Record<string, Record<string, string[]>>} Facets  kind -> facet field -> its values
 * @typedef {Record<string, string>} KindWords  a section word ("feats", "magic items") -> kind
 */

/**
 * Find the words that name a section and its filters: "vitality feats tier 2" becomes
 * Feats × Skill: Vitality × Tier 2, "ranged weapons" Weapons × Mode: Ranged. A phrase is
 * only "structured" when it names a section, so a plain name ("vitality") is never turned
 * into filters. When several words name sections ("action feats"), the one whose filters
 * explain the most of the other words wins (ties: the last).
 * @param {string} query @param {Facets | null} facets @param {KindWords} [kindWords] @returns {Parsed}
 */
export function parseQuery(query, facets, kindWords = {}) {
  const words = norm(query).split(' ').filter(Boolean);
  const kw = new Map(Object.entries(kindWords).map(([k, v]) => [norm(k), v]));
  /** @type {{ kind: string, at: [number, number] }[]} */
  const kinds = [];
  for (let i = 0; i < words.length; i++) {
    for (let n = 3; n >= 1; n--) {
      if (i + n > words.length) continue;
      const ph = words.slice(i, i + n);
      const k = kw.get(ph.join(' ')) ?? kw.get(ph.map(stem).join(' '));
      if (k) { kinds.push({ kind: k, at: [i, i + n] }); i += n - 1; break; }
    }
  }
  /** @param {string} kind @param {[number, number]} at */
  const cuesFor = (kind, at) => {
    const used = words.map((_, i) => i >= at[0] && i < at[1]);
    /** @type {Cue[]} */
    const cues = [];
    const dicts = Object.entries(facets?.[kind] ?? {})
      .filter(([f]) => !SKIP_FIELDS.has(f))
      .map(([field, vals]) => ({ field, map: new Map(vals.flatMap((v) => [[norm(v), v], [norm(v).split(' ').map(stem).join(' '), v]])) }));
    for (let i = 0; i < words.length; i++) {
      if (used[i]) continue;
      // "t2" is Tier 2
      const t = /^t(\d)$/.exec(words[i]);
      const probe = t ? ['tier', t[1]] : null;
      let hit = null;
      for (let n = 3; n >= 1 && !hit; n--) {
        if (i + n > words.length || words.slice(i, i + n).some((_, j) => used[i + j])) continue;
        const ph = probe && n === 1 ? probe : words.slice(i, i + n);
        for (const d of dicts) {
          const v = d.map.get(ph.join(' ')) ?? d.map.get(ph.map(stem).join(' '));
          if (v) { hit = { field: d.field, value: v, n }; break; }
        }
      }
      if (!hit) continue;
      for (let j = i; j < i + hit.n; j++) used[j] = true;
      cues.push({ field: hit.field, value: hit.value, label: hit.value, from: i, to: i + hit.n });
      i += hit.n - 1;
    }
    return { cues, used };
  };
  let best = null;
  for (const k of kinds) {
    const r = cuesFor(k.kind, k.at);
    if (!best || r.cues.length >= best.r.cues.length) best = { k, r };
  }
  if (!best) {
    const rest = words.filter((w) => !STOP.has(w)).join(' ');
    return { structured: false, kind: null, prestige: false, cues: [], rest, words, kindAt: null };
  }
  const { k, r } = best;
  // other section words stay as text only when they were not the chosen one
  const rest = words.filter((w, i) => !r.used[i] && !STOP.has(w)).join(' ');
  return { structured: r.cues.length > 0 || !!rest, kind: k.kind, prestige: false, cues: r.cues, rest, words, kindAt: k.at };
}

/** The query minus some word positions (used when a filter chip is removed).
 * @param {string[]} words @param {number} from @param {number} to */
export function withoutWords(words, from, to) {
  return words.filter((_, i) => i < from || i >= to).join(' ');
}

// ---- browse box ------------------------------------------------------------------
/** @param {unknown} s */
export function hayTokens(s) {
  return tokens(s);
}
/**
 * Every query word (or the start of it) must appear somewhere in the row, in any order.
 * Returns null for an empty query.
 * @param {string} query @returns {((hay: string[]) => boolean) | null}
 */
export function makeTextFilter(query) {
  const qt = tokens(query);
  if (!qt.length) return null;
  return (hay) => qt.every((t) => hay.some((h) => h === t || h.startsWith(t)));
}
