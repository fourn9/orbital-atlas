import { createStage } from './scene/scene-setup';
import { createEarth } from './scene/earth';
import { createObjectCloud } from './scene/objects';
import { loadCatalog } from './data/catalog';

const app = document.getElementById('app')!;
const stage = createStage(app);
const earth = createEarth(stage.scene);

const objects = await loadCatalog();
const cloud = createObjectCloud(stage.scene, objects);

const worker = new Worker(new URL('./worker/propagate.worker.ts', import.meta.url), { type: 'module' });
worker.postMessage({ type: 'init', tles: objects.map((o) => ({ l1: o.tleLine1, l2: o.tleLine2 })) });
worker.onmessage = (e) => { if (e.data.type === 'positions') cloud.setPositions(e.data.buffer); };

stage.onFrame(() => earth.update(new Date()));
setInterval(() => worker.postMessage({ type: 'tick', timeMs: Date.now() }), 1000);
