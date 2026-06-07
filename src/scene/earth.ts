import * as THREE from 'three';
import { gmstRadians } from '../propagation/orbital-math';

const EARTH_RADIUS = 6.371; // scene units (km/1000)

export interface Earth {
  mesh: THREE.Mesh;
  update: (date: Date) => void;
}

export function createEarth(scene: THREE.Scene): Earth {
  const texture = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'earth-night.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
    new THREE.MeshStandardMaterial({ map: texture, emissive: 0x111133, emissiveIntensity: 0.6 }),
  );
  scene.add(mesh);

  // Atmosphere glow shell.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x3a6cff, transparent: true, opacity: 0.12, side: THREE.BackSide }),
  );
  scene.add(glow);

  return {
    mesh,
    update: (date: Date) => { mesh.rotation.y = gmstRadians(date); },
  };
}
