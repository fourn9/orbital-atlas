import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  onFrame: (cb: (dt: number) => void) => void;
}

export function createStage(container: HTMLElement): Stage {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 14); // Earth radius ~6.371 scene units

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 7;   // can't go inside the Earth
  controls.maxDistance = 120; // zoom out to GEO shell

  scene.add(new THREE.AmbientLight(0x6688cc, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  scene.add(sun);
  scene.add(makeStarfield());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const callbacks: ((dt: number) => void)[] = [];
  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    controls.update();
    for (const cb of callbacks) cb(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { scene, camera, renderer, controls, onFrame: (cb) => callbacks.push(cb) };
}

function makeStarfield(): THREE.Points {
  const n = 2000;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 400 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x99aacc, size: 0.7, sizeAttenuation: false }));
}
