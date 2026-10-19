// Sigil motion (browser). The plates themselves are rendered at build time by src/lib/sigil.ts;
// this file only animates them:
//   Inscribe — every stroke draws in, in reading order; filled and dashed marks fade in.
//   Unscribe — Inscribe played backwards (the Orrery uses it to return to the empty plate).
//   Meter    — lights a class plate's level cells up to the chosen level.
//   Orrery   — the front page's cycling sigil: draw in, hold, reverse, next.
// Everything is skipped under prefers-reduced-motion; the static SVG is always complete.

type Opts = { all?: boolean; stagger?: number; fit?: number; duration?: number };
type Step = { n: SVGElement; fade: boolean; delay: number; dur: number };

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.6,0,.2,1)';

// One schedule drives both directions, so Unscribe is exactly Inscribe reversed.
// all: also animate marks outside the zones (the frame), for the Orrery's bare black box.
function schedule(root: Element, opts: Opts) {
  const sel = opts.all ? 'path, circle:not(.hit), rect:not(.hit), text' : '.z path, .z circle:not(.hit), .z rect:not(.hit)';
  const nodes = [...root.querySelectorAll<SVGElement>(sel)];
  const strokes = nodes.filter((n) => n.tagName !== 'text').length || 1;
  const st = opts.fit ? Math.min(opts.stagger ?? 35, opts.fit / strokes) : (opts.stagger ?? 35);
  const dur = opts.duration ?? 900;
  let i = 0;
  const plan: Step[] = nodes.map((n) => {
    if (n.tagName === 'text') return { n, fade: true, delay: 0, dur: 400 };
    const fill = n.getAttribute('fill');
    const k = i++;
    if ((fill && fill !== 'none' && fill !== 'transparent' && !/^#f{3,6}$/i.test(fill)) || n.hasAttribute('stroke-dasharray'))
      return { n, fade: true, delay: 300 + k * st, dur: 300 };
    return { n, fade: false, delay: k * st, dur };
  });
  return { plan, total: Math.max(0, ...plan.map((p) => p.delay + p.dur)) };
}

function run(root: Element | null, opts: Opts, back: boolean): number {
  if (!root || reduced()) return 0;
  const { plan, total } = schedule(root, opts);
  for (const p of plan) {
    const delay = back ? total - p.delay - p.dur : p.delay;
    if (p.fade) {
      p.n.animate(back ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: p.dur, delay, easing: EASE, fill: 'both' });
      continue;
    }
    p.n.setAttribute('pathLength', '1');
    p.n.style.strokeDasharray = '1';
    const an = p.n.animate(back ? [{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }] : [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: p.dur, delay, easing: EASE, fill: 'both' });
    if (!back)
      an.onfinish = () => {
        p.n.style.strokeDasharray = '';
        p.n.removeAttribute('pathLength');
        an.cancel();
      };
  }
  const c = root.querySelector<SVGElement>('.corona');
  if (c && !back) c.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 60000, iterations: Infinity });
  return total;
}

export const inscribe = (root: Element | null, opts: Opts = {}) => run(root, opts, false);
export const unscribe = (root: Element | null, opts: Opts = {}) => run(root, opts, true);
export function meter(root: Element | null, L: number) {
  root?.querySelectorAll<SVGElement>('.lamp').forEach((c) => {
    const l = Number(c.dataset.l);
    c.setAttribute('fill', l === L ? '#ff2a1a' : l < L ? '#000000' : '#ffffff');
  });
}

/** Hovering a zone lights its line in the key, and the other way round. Nothing needs clicking. */
export function bindKeys(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>('.sigil').forEach((f) => {
    if (f.dataset.keys) return;
    f.dataset.keys = '1';
    const norm = (z?: string) => (z === 'count' ? 'core' : z);
    const light = (zone: string | null) => {
      f.querySelectorAll<SVGElement>('.z').forEach((z) => z.classList.toggle('on', !!zone && norm(z.dataset.zone) === zone));
      f.querySelectorAll<HTMLElement>('.reading li').forEach((li) => li.classList.toggle('on', !!zone && li.dataset.zone === zone));
    };
    f.addEventListener('pointerover', (e) => {
      const z = (e.target as Element).closest<HTMLElement | SVGElement>('.z, .reading li');
      light(z ? (norm((z as HTMLElement).dataset.zone) ?? null) : null);
    });
    f.addEventListener('pointerleave', () => light(null));
  });
}

/** The Orrery: the black box stays; each sigil draws in, holds, reverses back to the empty box,
    and the next one draws in. Sets come from <template data-set="Name"> children, each holding
    <figure data-href data-name data-kind data-max> plates rendered at build time. */
export function orrery(host: HTMLElement, onShow?: (fig: HTMLElement, set: string) => void, per = 4, hold = 3000) {
  let si = 0, ei = 0, stopped = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(() => { if (!stopped && host.isConnected) fn(); }, ms));
  const motion: Opts = { all: true, stagger: 22, fit: 1500, duration: 800 };
  const sets = [...host.querySelectorAll('template')]
    .map((t) => ({ name: t.dataset.set ?? '', figs: [...(t.content.querySelectorAll('figure') as NodeListOf<HTMLElement>)].sort(() => Math.random() - 0.5).slice(0, per) }))
    .filter((x) => x.figs.length);
  const box = host.querySelector('svg.orrery-box') as SVGSVGElement | null;
  if (!box || !sets.length) return { stop() {}, nudge() {} };
  let layer: SVGGElement | null = null;
  function show() {
    const set = sets[si % sets.length];
    const fig = set.figs[ei];
    const src = fig.querySelector('svg')!;
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    [...src.childNodes].slice(1).forEach((c) => layer!.appendChild(c.cloneNode(true))); // everything but the black ground
    box!.querySelectorAll(':scope > g').forEach((g) => g.remove());
    box!.appendChild(layer);
    box!.setAttribute('aria-label', src.getAttribute('aria-label') ?? '');
    onShow?.(fig, set.name);
    const g = layer;
    const t = inscribe(g, motion);
    const max = Number(fig.dataset.max || 0);
    let sweep = 0;
    if (max && !reduced()) {
      sweep = 1800;
      for (let L = 1; L <= max; L++) later(() => meter(g, L), t + (L * sweep) / max);
    } else meter(g, 0);
    const out = reduced() ? 9000 : t + sweep + hold;
    const drain = max && !reduced() ? 500 : 0; // lamps go dark, last one first, before the strokes retract
    for (let L = max - 1; L >= 0 && drain; L--) later(() => meter(g, L), out + ((max - 1 - L) * drain) / max);
    later(() => {
      const u = unscribe(g, motion);
      later(() => {
        g.remove();
        ei++;
        if (ei >= set.figs.length) { ei = 0; si++; }
        show();
      }, u + 160);
    }, out + drain);
  }
  show();
  let lastNudge = 0;
  return {
    stop() { stopped = true; timers.forEach(clearTimeout); },
    /** Typing while the Orrery is on screen: the core flashes signal red. */
    nudge() {
      const core = layer?.querySelector<SVGElement>('[data-zone="core"]');
      if (!core || reduced() || performance.now() - lastNudge < 350) return;
      lastNudge = performance.now();
      core.animate([{ color: '#ff2a1a' }, { color: '#000000' }], { duration: 450, easing: 'ease-out' });
    },
  };
}
