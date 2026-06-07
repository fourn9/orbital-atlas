import { propagate } from 'satellite.js';
import type { SatRec } from 'satellite.js';

export const SCENE_SCALE = 1 / 1000; // km -> scene units

// Writes ECI positions (scaled) into out[i*3..i*3+2]. Failures write 0,0,0.
export function computePositions(satrecs: SatRec[], date: Date, out: Float32Array): void {
  for (let i = 0; i < satrecs.length; i++) {
    const rec = satrecs[i];
    let x = 0, y = 0, z = 0;
    if (!(rec as { error?: number }).error) {
      try {
        const pv = propagate(rec, date);
        const p = pv && pv.position ? (pv.position as { x: number; y: number; z: number }) : null;
        if (p && Number.isFinite(p.x)) { x = p.x * SCENE_SCALE; y = p.y * SCENE_SCALE; z = p.z * SCENE_SCALE; }
      } catch {
        /* leave 0,0,0 */
      }
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
}
