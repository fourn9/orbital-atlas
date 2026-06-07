import { createStage } from './scene/scene-setup';
import { createEarth } from './scene/earth';
const app = document.getElementById('app')!;
const stage = createStage(app);
const earth = createEarth(stage.scene);
stage.onFrame(() => earth.update(new Date()));
