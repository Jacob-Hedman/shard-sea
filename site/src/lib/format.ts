// Small display helpers shared by components (labels + provenance styling).

export function titleCase(s: string): string {
  return String(s ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const BAB_LABEL: Record<string, string> = {
  full: 'Full',
  three_quarters: '3/4',
  half: 'Half',
  unknown: 'Unknown',
};

export function facetValueLabel(field: string, value: string): string {
  if (value == null || value === '') return '—';
  switch (field) {
    case 'level':
    case 'vestige_level':
    case 'utterance_level':
    case 'mystery_level':
      return `Level ${value}`;
    case 'bab':
      return BAB_LABEL[value] ?? titleCase(value);
    case 'class_type':
    case 'role':
    case 'content_type':
    case 'related_kind':
      return titleCase(value);
    default:
      return value;
  }
}

// Tailwind classes for provenance pills (colors defined in global.css @theme).
export function contentTypeBadge(ct: string): string {
  switch ((ct ?? '').toLowerCase()) {
    case 'homebrew':
      return 'text-homebrew border-homebrew/40 bg-homebrew/10';
    case 'third-party':
      return 'text-thirdparty border-thirdparty/40 bg-thirdparty/10';
    case 'reference':
      return 'text-faint border-line bg-surface-2';
    default:
      return 'text-muted border-line bg-surface-2'; // official / unknown
  }
}
export function licenseBadge(lic: string): string {
  switch ((lic ?? '').toLowerCase()) {
    case 'ogl':
      return 'text-ogl border-ogl/40 bg-ogl/10';
    case 'non-ogl':
      return 'text-nonogl border-nonogl/40 bg-nonogl/10';
    default:
      return 'text-faint border-line bg-surface-2';
  }
}

// --------------------------------------------------------------------------
// Prose cleaning. The DB prose is messy: some rows carry raw HTML (dndtools
// `<div topic=...>` wrappers), some lost their paragraph breaks at extraction
// (run-on sentences with no space after the period), and class text_plain has
// flattened progression tables baked in. This normalises all of that.
// --------------------------------------------------------------------------
const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  hellip: '…', times: '×', deg: '°', frac12: '½', frac14: '¼', frac34: '¾',
};
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

// Repair the classic UTF-8-read-as-Latin-1 mojibake baked into some scraped
// rows ("FaerÃ»n" → "Faerûn", "â€™" → "’"). Only exact, well-known artifact
// sequences are mapped — longest first — so clean text passes through intact.
const MOJIBAKE: [string, string][] = [
  ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€', '”'], ['â€“', '–'],
  ['â€”', '—'], ['â€¦', '…'], ['Ã©', 'é'], ['Ã¨', 'è'], ['Ã«', 'ë'], ['Ã¯', 'ï'],
  ['Ã®', 'î'], ['Ã´', 'ô'], ['Ã¶', 'ö'], ['Ã»', 'û'], ['Ã¼', 'ü'], ['Ã¹', 'ù'],
  ['Ã¡', 'á'], ['Ã¤', 'ä'], ['Ã¢', 'â'], ['Ã§', 'ç'], ['Ã±', 'ñ'], ['Ã­', 'í'],
  ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã ', 'à'], ['Â½', '½'], ['Â¼', '¼'],
  ['Â¾', '¾'], ['Â°', '°'], ['Â ', ' '],
  ['Ã—', '×'], ['Â·', '·'], ['Â­', ''], ['�', ''],
];
export function repairEncoding(s: string): string {
  if (/[ÃâÂ�]/.test(s)) {
    // Longest artifact first, so 2-char sequences never eat a 3-char one's prefix.
    for (const [bad, good] of [...MOJIBAKE].sort((a, b) => b[0].length - a[0].length))
      s = s.split(bad).join(good);
  }
  // cp1252 apostrophe that became a literal '?' in the scrape ("Master?s Guide")
  if (s.includes('?')) s = s.replace(/([A-Za-z])\?(s|t|ll|re|ve|d|m)(?![A-Za-z])/g, '$1’$2');
  return s;
}

export function cleanProse(input?: string | null): string {
  if (input == null) return '';
  let t = repairEncoding(String(input));
  if (/<[a-z!/][^>]*>/i.test(t)) {
    // drop tables / scripts / styles wholesale (flattened table junk, etc.)
    t = t.replace(/<\s*(script|style|table)\b[\s\S]*?<\/\s*\1\s*>/gi, ' ');
    t = t.replace(/<\s*\/p\s*>/gi, '\n\n'); // paragraph break
    t = t.replace(/<\s*br\s*\/?>/gi, '\n');
    t = t.replace(/<\s*li[^>]*>/gi, '\n• ');
    t = t.replace(/<\s*\/(div|h[1-6]|tr|li|ul|ol|blockquote)\s*>/gi, '\n');
    t = t.replace(/<[^>]+>/g, '');
    t = decodeEntities(t);
  }
  // add the missing space after sentence punctuation glued to the next word
  t = t.replace(/([.!?;:])(?=[A-Z(])/g, '$1 ');
  t = t
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // an undivided wall of text -> one sentence per line, far more scannable
  if (!t.includes('\n') && t.length > 200) {
    t = t.split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9])/).join('\n');
  }
  return t;
}

const ESC_HTML: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function escHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESC_HTML[c]);
}

// Highlight the high-signal rules bits in prose: dice (10d6), DCs (DC 17), and
// saving throws (Reflex save). Input is already-cleaned plain text; output is
// HTML with <span> wrappers, so render with set:html — safe, since the source
// is sanitized by cleanProse and the only tags are our own spans.
export function highlightRules(input?: string | null): string {
  let t = escHtml(String(input ?? ''));
  t = t.replace(/(\b\d+d\d+(?:\s?[-+]\s?\d+)?\b)/g, '<span class="rl-dice">$1</span>');
  t = t.replace(/\b(DC\s?\d+)\b/g, '<span class="rl-dc">$1</span>');
  t = t.replace(/\b(Fortitude|Reflex|Will)(\s(?:save|negates|half|partial))/gi, '<span class="rl-save">$1$2</span>');
  return t;
}

export function stripLeadingLabel(t: string, label?: string): string {
  if (!label) return t;
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return t.replace(new RegExp('^\\s*' + esc + '\\s*[.:]?\\s*', 'i'), '');
}
