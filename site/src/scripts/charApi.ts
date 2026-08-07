// Character API client + the shared Foundry roll dialog.
import { foundryRoll } from '../lib/character/rules.mjs';

const j = (r: Response) => r.json();
export const api = {
  list: () => fetch('/api/characters').then(j),
  get: (id: string) => fetch(`/api/characters/${id}`).then(j),
  create: (c: any) => fetch('/api/characters', { method: 'POST', body: JSON.stringify(c) }).then(j),
  update: (id: string, c: any) =>
    fetch(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(c) }).then(j),
  del: (id: string) => fetch(`/api/characters/${id}`, { method: 'DELETE' }).then(j),
};

export const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// A rollable thing has a name + a numeric modifier. Optionally seed boons/banes.
export interface Rollable { label: string; mod: number; boons?: number; banes?: number; note?: string; tier?: number; }

let dlg: HTMLDialogElement | null = null;
let state = { label: '', mod: 0, boons: 0, banes: 0, note: '', tier: 0 };

/** Exact distribution of the kept-two sum for `n` d6, keeping the highest (or
 *  lowest) two — i.e. a Kriegsmesser roll with boons/banes. Tiny DP over the two
 *  kept faces, so it re-computes instantly on every boon/bane change. */
function keptTwoDist(n: number, keepHigh: boolean) {
  let states = new Map<string, number>([['', 1]]);
  for (let i = 0; i < n; i++) {
    const next = new Map<string, number>();
    for (const [k, p] of states) {
      const kept = k ? k.split(',').map(Number) : [];
      for (let v = 1; v <= 6; v++) {
        let arr = [...kept, v].sort((a, b) => a - b);
        if (arr.length > 2) arr = keepHigh ? arr.slice(arr.length - 2) : arr.slice(0, 2);
        const nk = arr.join(',');
        next.set(nk, (next.get(nk) || 0) + p / 6);
      }
    }
    states = next;
  }
  return states; // key "lo,hi" -> probability
}

/** Success odds vs a DC and the natural-crit chances, for the current pool. */
function rollOdds(mod: number, boons: number, banes: number) {
  const net = boons - banes;
  const n = 2 + Math.abs(net);
  const states = keptTwoDist(n, net >= 0);
  const sum = new Map<number, number>();
  let nat12 = 0, nat2 = 0;
  for (const [k, p] of states) {
    const [lo, hi] = k.split(',').map(Number);
    sum.set(lo + hi, (sum.get(lo + hi) || 0) + p);
    if (lo === 6 && hi === 6) nat12 += p;
    if (lo === 1 && hi === 1) nat2 += p;
  }
  const pAtLeast = (dc: number) => {
    let acc = 0;
    for (const [s, p] of sum) if (s + mod >= dc) acc += p;
    return acc;
  };
  return { pAtLeast, nat12, nat2 };
}
const pct = (p: number) => `${Math.round(p * 100)}%`;

function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'cs-dialog';
  dlg.innerHTML = `
    <form method="dialog" class="box">
      <h3 id="rd-title">Roll</h3>
      <div class="sub" id="rd-sub"></div>
      <div class="cs-bb">
        <span class="lab">Boons <span style="color:var(--color-faint)">— keep highest</span></span>
        <span class="ctrl"><button type="button" class="cs-step" data-b="boons" data-d="-1">−</button>
          <span class="cs-count" id="rd-boons">0</span>
          <button type="button" class="cs-step" data-b="boons" data-d="1">+</button></span>
      </div>
      <div class="cs-bb">
        <span class="lab">Banes <span style="color:var(--color-faint)">— keep lowest</span></span>
        <span class="ctrl"><button type="button" class="cs-step" data-b="banes" data-d="-1">−</button>
          <span class="cs-count" id="rd-banes">0</span>
          <button type="button" class="cs-step" data-b="banes" data-d="1">+</button></span>
      </div>
      <div class="cs-out">
        <div class="code"><span id="rd-code">/r 2d6</span>
          <button type="button" class="cs-copy" id="rd-copy">Copy</button></div>
        <p class="cs-f" id="rd-explain" style="margin-top:.5rem"></p>
        <div id="rd-odds" class="rd-odds"></div>
      </div>
      <div style="margin-top:1rem;text-align:right">
        <button class="cs-copy" style="background:var(--color-surface-2);color:var(--color-muted)">Close</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);

  const $ = (id: string) => dlg!.querySelector('#' + id)!;
  const render = () => {
    const net = state.boons - state.banes;
    ($('rd-boons') as HTMLElement).textContent = String(state.boons);
    ($('rd-banes') as HTMLElement).textContent = String(state.banes);
    ($('rd-code') as HTMLElement).textContent = foundryRoll(state.mod, state.boons, state.banes);
    const modTxt = state.mod ? `${state.mod > 0 ? '+' : '−'} ${Math.abs(state.mod)}` : 'no modifier';
    const dice = net === 0 ? '2d6' : `${2 + Math.abs(net)}d6 ${net > 0 ? 'keep highest 2' : 'keep lowest 2'}`;
    ($('rd-explain') as HTMLElement).innerHTML =
      `${dice} ${esc(modTxt)}${net !== 0 ? ` — ${Math.abs(net)} net ${net > 0 ? 'boon' : 'bane'}` : ''}` +
      (state.note ? ` · ${esc(state.note)}` : '');
    // success odds vs the tier difficulty ladder + natural crit chances
    const o = rollOdds(state.mod, state.boons, state.banes);
    const T = state.tier || 0;
    const dcs = [
      { name: 'DC 8', dc: 8 },
      { name: `Minor T+6=${T + 6}`, dc: T + 6 },
      { name: `Moderate T+8=${T + 8}`, dc: T + 8 },
      { name: `Major T+10=${T + 10}`, dc: T + 10 },
      { name: `Extreme T+12=${T + 12}`, dc: T + 12 },
    ];
    ($('rd-odds') as HTMLElement).innerHTML =
      `<div class="rd-odds-grid">${dcs.map((x) => `<span>${esc(x.name)}</span><b>${pct(o.pAtLeast(x.dc))}</b>`).join('')}</div>` +
      `<div class="cs-f" style="margin-top:.35rem">nat 12 crit <b>${pct(o.nat12)}</b> · nat 2 crit-fail <b>${pct(o.nat2)}</b> → Moderate Panic Risk</div>`;
    const copy = $('rd-copy') as HTMLButtonElement;
    copy.textContent = 'Copy'; copy.classList.remove('done');
  };
  dlg.querySelectorAll('.cs-step').forEach((b) =>
    b.addEventListener('click', () => {
      const k = (b as HTMLElement).dataset.b as 'boons' | 'banes';
      const d = Number((b as HTMLElement).dataset.d);
      state[k] = Math.max(0, Math.min(6, state[k] + d));
      render();
    }));
  ($('rd-copy') as HTMLButtonElement).addEventListener('click', async () => {
    const code = ($('rd-code') as HTMLElement).textContent || '';
    try { await navigator.clipboard.writeText(code); } catch {}
    const c = $('rd-copy') as HTMLButtonElement; c.textContent = 'Copied ✓'; c.classList.add('done');
  });
  (dlg as any)._render = render;
  return dlg;
}

export function openRoll(r: Rollable) {
  const d = ensureDialog();
  state = { label: r.label, mod: r.mod, boons: r.boons || 0, banes: r.banes || 0, note: r.note || '', tier: r.tier || 0 };
  (d.querySelector('#rd-title') as HTMLElement).textContent = r.label;
  (d.querySelector('#rd-sub') as HTMLElement).textContent =
    `${r.mod >= 0 ? '+' : ''}${r.mod} before boons/banes — build a roll for Foundry`;
  (d as any)._render();
  d.showModal();
}
