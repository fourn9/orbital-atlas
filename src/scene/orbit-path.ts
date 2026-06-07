import * as THREE from 'three';
import { propagate } from 'satellite.js';
import type { SatRec } from 'satellite.js';
import { orbitalPeriodMin } from '../propagation/orbital-math';
import { SCENE_SCALE } from '../propagation/propagate-core';

// Samples one full orbital period from `start`. Returns flat xyz (scaled),
// remapped ECI (x,y,z) -> scene (x, z, -y) to match the point cloud + Earth.
export function samplePath(satrec: SatRec, start: Date, samples: number): Float32Array {
  const periodMs = orbitalPeriodMin(satrec) * 60 * 1000;
  const out = new Float32Array(samples * 3);
  for (let i = 0; i < samples; i++) {
    const t = new Date(start.getTime() + (periodMs * i) / samples);
    const pv = propagate(satrec, t);
    const p = pv && pv.position ? (pv.position as { x: number; y: number; z: number }) : null;
    if (p && Number.isFinite(p.x)) {
      out[i * 3] = p.x * SCENE_SCALE;
      out[i * 3 + 1] = p.z * SCENE_SCALE;
      out[i * 3 + 2] = -p.y * SCENE_SCALE;
    }
  }
  return out;
}

export interface OrbitPath { line: THREE.Line; show: (satrec: SatRec, date: Date) => void; hide: () => void; }

export function createOrbitPath(scene: THREE.Scene): OrbitPath {
  const geo = new THREE.BufferGeometry();
  const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.7 }));
  line.visible = false;
  scene.add(line);
  return {
    line,
    show: (satrec, date) => {
      const pts = samplePath(satrec, date, 180);
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      line.visible = true;
    },
    hide: () => { line.visible = false; },
  };
}
