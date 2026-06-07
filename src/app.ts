import { loadCatalog } from './data/catalog';
import { createStage } from './scene/scene-setup';
import { createEarth } from './scene/earth';
import { createObjectCloud } from './scene/objects';
import { createPicker } from './scene/picking';
import { createOrbitPath } from './scene/orbit-path';
import { createSidebar, computeMask } from './ui/sidebar';
import { createDetailPanel } from './ui/detail-panel';
import { kinematicsAt } from './propagation/orbital-math';
import { twoline2satrec } from 'satellite.js';
import type { FilterState } from './types';

export async function startApp(container: HTMLElement): Promise<void> {
  const objects = await loadCatalog();
  const satrecs = objects.map((o) => twoline2satrec(o.tleLine1, o.tleLine2));

  const stage = createStage(container);
  const earth = createEarth(stage.scene);
  const cloud = createObjectCloud(stage.scene, objects);
  const orbit = createOrbitPath(stage.scene);
  const picker = createPicker(stage.renderer, stage.camera, cloud.points);
  const canvas = stage.renderer.domElement;

  let filters: FilterState = { facility: true, debris: true, bands: { LEO: true, MEO: true, GEO: true } };
  let currentMask: boolean[] = [];
  const applyFilters = () => { currentMask = computeMask(objects, filters); cloud.setVisibility(currentMask); };
  createSidebar(container, filters, (f) => { filters = f; applyFilters(); });
  applyFilters();

  let selected: number | null = null;
  const panel = createDetailPanel(container, () => { selected = null; orbit.hide(); panel.hide(); });

  // ---- TEMP DEBUG HUD (remove once interaction is confirmed) ----
  let frames = 0, winClk = 0, cvsClk = 0, lastPick = '-';
  const hud = document.createElement('div');
  hud.style.cssText =
    'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:30;pointer-events:none;' +
    'font:11px monospace;color:#9effa0;background:rgba(0,0,0,.7);padding:4px 8px;border-radius:4px;white-space:pre;';
  container.appendChild(hud);
  window.addEventListener('pointerdown', () => { winClk++; }, true);
  canvas.addEventListener('pointerdown', () => { cvsClk++; });
  // ---------------------------------------------------------------

  // Click an object to show its detail panel + orbit ring.
  canvas.addEventListener('pointerdown', (ev) => {
    const idx = picker.pick(ev.clientX, ev.clientY);
    lastPick = idx === null ? 'none' : String(idx);
    if (idx === null || !currentMask[idx]) return;
    selected = idx;
    const now = new Date();
    panel.show(objects[idx], kinematicsAt(satrecs[idx], now));
    orbit.show(satrecs[idx], now);
  });

  const worker = new Worker(new URL('./worker/propagate.worker.ts', import.meta.url), { type: 'module' });
  worker.postMessage({ type: 'init', tles: objects.map((o) => ({ l1: o.tleLine1, l2: o.tleLine2 })) });
  worker.onmessage = (e) => { if (e.data.type === 'positions') cloud.setPositions(e.data.buffer); };
  setInterval(() => worker.postMessage({ type: 'tick', timeMs: Date.now() }), 1000);

  stage.onFrame(() => {
    const now = new Date();
    earth.update(now);
    if (selected !== null) panel.update(kinematicsAt(satrecs[selected], now));

    frames++;
    if (frames % 6 === 0) {
      const c = document.elementFromPoint(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
      const ctr = c ? `${c.tagName}${c.id ? '#' + c.id : ''}` : 'none';
      hud.textContent =
        `obj:${objects.length}  frame:${frames}  winClk:${winClk}  cvsClk:${cvsClk}  ctr:${ctr}  pick:${lastPick}`;
    }
  });
}
