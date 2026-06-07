import * as THREE from 'three';

export interface Picker {
  pick: (clientX: number, clientY: number) => number | null; // returns object index or null
}

export function createPicker(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  points: THREE.Points,
): Picker {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.6 };
  const ndc = new THREE.Vector2();

  return {
    pick: (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(points);
      return hits.length > 0 && hits[0].index !== undefined ? hits[0].index : null;
    },
  };
}
