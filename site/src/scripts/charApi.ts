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
export interface Rollable { label: string; mod: number; boons?: number; banes?: number; note?: string; }

let dlg: HTMLDialogElement | null = null;
let state = { label: '', mod: 0, boons: 0, banes: 0, note: '' };

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
  state = { label: r.label, mod: r.mod, boons: r.boons || 0, banes: r.banes || 0, note: r.note || '' };
  (d.querySelector('#rd-title') as HTMLElement).textContent = r.label;
  (d.querySelector('#rd-sub') as HTMLElement).textContent =
    `${r.mod >= 0 ? '+' : ''}${r.mod} before boons/banes — build a roll for Foundry`;
  (d as any)._render();
  d.showModal();
}
