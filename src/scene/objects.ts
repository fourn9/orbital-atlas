import * as THREE from 'three';
import type { ObjectType, OrbitalObject } from '../types';

// Returns [r,g,b] in 0..1.
export function colorFor(type: ObjectType): [number, number, number] {
  return type === 'facility' ? [0.5, 0.82, 1.0] : [1.0, 0.6, 0.3];
}

export interface ObjectCloud {
  points: THREE.Points;
  setPositions: (buf: Float32Array) => void;
  setVisibility: (mask: boolean[]) => void;
}

export function createObjectCloud(scene: THREE.Scene, objects: OrbitalObject[]): ObjectCloud {
  const n = objects.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const baseColors = new Float32Array(n * 3); // remembered for show/hide

  objects.forEach((o, i) => {
    const c = colorFor(o.type);
    colors.set(c, i * 3);
    baseColors.set(c, i * 3);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.14, vertexColors: true, sizeAttenuation: true, transparent: true,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    setPositions: (buf) => {
      const attr = geo.getAttribute('position') as THREE.BufferAttribute;
      (attr.array as Float32Array).set(buf);
      attr.needsUpdate = true;
    },
    setVisibility: (mask) => {
      const col = geo.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i]) (col.array as Float32Array).set([baseColors[i*3], baseColors[i*3+1], baseColors[i*3+2]], i * 3);
        else (col.array as Float32Array).set([0, 0, 0], i * 3); // hidden = black (invisible on black bg)
      }
      col.needsUpdate = true;
    },
  };
}
