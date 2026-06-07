import * as THREE from 'three';

export interface Picker {
  pick: (clientX: number, clientY: number) => number | null;
}

// Screen-space picker: project every object to screen pixels and return the
// nearest one to the click within a pixel radius. More reliable than the
// THREE.Points raycaster threshold for tiny, constantly-moving points.
export function createPicker(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  points: THREE.Points,
): Picker {
  const v = new THREE.Vector3();
  const HIT_PX = 16;

  return {
    pick: (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const pos = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      camera.updateMatrixWorld();

      let best = -1;
      let bestD = HIT_PX * HIT_PX;
      for (let i = 0; i < pos.count; i++) {
        v.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]).project(camera);
        if (v.z > 1 || v.z < -1) continue; // outside the view frustum
        const sx = (v.x * 0.5 + 0.5) * rect.width;
        const sy = (-v.y * 0.5 + 0.5) * rect.height;
        const dx = sx - px;
        const dy = sy - py;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = i; }
      }
      return best >= 0 ? best : null;
    },
  };
}
