// Minimal, dependency-free Markdown -> HTML for the PHB prose pages.
// The source is the game's own Obsidian vault (see importer). We escape HTML
// first, then emit only our own tags, so `set:html` is safe. Covers the subset
// the book actually uses: headings, bold/italic, backtick RULES text, lists,
// blockquotes-as-paragraphs, wiki-links, and preserves authored line breaks.

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ESC[c]);

function inline(s: string): string {
  s = esc(s);
  // wiki-links [[target|label]] / [[target]] -> label text
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  // `rules text` -> highlighted inline code (the book's mechanical effect voice)
  s = s.replace(/`([^`]+)`/g, '<code class="rules">$1</code>');
  // **bold**, then *italic*
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

export function renderMarkdown(md?: string | null): string {
  if (!md) return '';
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  let quote: string[] = [];
  const flushPara = () => {
    if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; }
  };
  const flushQuote = () => {
    if (quote.length) { out.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`); quote = []; }
  };
  const flushList = () => {
    if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`); list = null; }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { flushPara(); flushList(); flushQuote(); continue; }

    const bq = /^>\s?(.*)$/.exec(line);
    if (bq) { flushPara(); flushList(); quote.push(bq[1]); continue; }
    flushQuote();

    const h = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line);
    if (h) {
      flushPara(); flushList();
      const lvl = Math.min(Math.max(h[1].length, 2), 4); // ## -> h2, deeper -> h3/h4
      const text = h[2].replace(/^#+\s*/, ''); // tolerate stray leading hashes
      if (text.trim()) out.push(`<h${lvl}>${inline(text)}</h${lvl}>`);
      continue;
    }

    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push((ul || ol)![1]);
      continue;
    }

    flushList();
    para.push(line);
  }
  flushPara(); flushList(); flushQuote();
  return out.join('\n');
}
