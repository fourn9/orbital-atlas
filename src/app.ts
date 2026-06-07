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

  // Small status readout (confirms data loaded / how many objects are in the scene).
  const status = document.createElement('div');
  status.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:10;font:11px system-ui;color:#9fb4e6;opacity:.75;pointer-events:none;';
  status.textContent = `${objects.length.toLocaleString()} objects`;
  container.appendChild(status);

  const stage = createStage(container);
  const earth = createEarth(stage.scene);
  const cloud = createObjectCloud(stage.scene, objects);
  const orbit = createOrbitPath(stage.scene);
  const picker = createPicker(stage.renderer, stage.camera, cloud.points);

  let filters: FilterState = { facility: true, debris: true, bands: { LEO: true, MEO: true, GEO: true } };
  let currentMask: boolean[] = [];
  const applyFilters = () => { currentMask = computeMask(objects, filters); cloud.setVisibility(currentMask); };
  createSidebar(container, filters, (f) => { filters = f; applyFilters(); });
  applyFilters();

  let selected: number | null = null;
  const panel = createDetailPanel(container, () => { selected = null; orbit.hide(); panel.hide(); });

  // Click an object to show its detail panel + orbit ring.
  stage.renderer.domElement.addEventListener('pointerdown', (ev) => {
    const idx = picker.pick(ev.clientX, ev.clientY);
    if (idx === null || !currentMask[idx]) return; // ignore filtered-out (hidden) objects
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
  });
}
