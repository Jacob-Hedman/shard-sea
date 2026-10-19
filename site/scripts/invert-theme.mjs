// Inverts the D&D 3.5 Codex palette (white paper, black ink) into the Shard-sea Codex
// palette (black paper, white ink). Neutral greys flip (v -> 255 - v); the accent colours
// are swapped for versions that keep AA contrast on black. Used when porting the D&D
// codex's stylesheet and components: `node scripts/invert-theme.mjs <in> > <out>`.
import { readFileSync } from 'node:fs';

// Accents that were tuned for white paper -> their counterparts on black.
export const ACCENT = {
  '#d11507': '#ff5a4a', // red ink (red text) -> lighter red, AA on black
  '#b31206': '#ff7a6e', // dark red text
  '#2340ff': '#7c8cff', // cobalt
  '#00753a': '#3ccf7f', // OGL green
  '#6b5400': '#e0bb4f', // third-party ochre
  '#1627a8': '#aab4ff',
  '#eef0ff': '#141a3d',
  '#fff1ef': '#3a0f0b',
};

const hex6 = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h).toLowerCase();
const neutral = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) <= 12;
};
const flip = (h) => {
  const v = (i) => (255 - parseInt(h.slice(i, i + 2), 16)).toString(16).padStart(2, '0');
  return '#' + v(1) + v(3) + v(5);
};
const short = (h) => (/^#(.)\1(.)\2(.)\3$/.test(h) ? '#' + h[1] + h[3] + h[5] : h);

export function invertColor(raw) {
  const h = hex6(raw);
  if (ACCENT[h]) return ACCENT[h];
  if (neutral(h)) return short(flip(h));
  return raw;
}

export function invertCss(css) {
  return css
    .replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g, (m) => invertColor(m))
    .replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/g, (m, r, g, b) =>
      r === g && g === b ? `rgba(${255 - r}, ${255 - g}, ${255 - b},` : m)
    .replace(/mix-blend-mode:\s*multiply/g, 'mix-blend-mode: screen')
    .replace(/color-scheme:\s*light/g, 'color-scheme: dark')
    // Sodium yellow is a highlight fill: whatever sits on it stays black, as on white paper.
    .replace(/\{([^{}]*)\}/g, (m, body) => {
      if (!/background(-color)?:[^;]*var\(--color-sodium\)/.test(body)) return m;
      if (/(^|[;\s])color:/.test(body)) return '{' + body.replace(/(^|[;\s])color:\s*#fff\b/g, '$1color: #000') + '}';
      return '{' + body.replace(/\s*$/, '') + ' color: #000; }';
    });
}

if (process.argv[2]) process.stdout.write(invertCss(readFileSync(process.argv[2], 'utf8')));
