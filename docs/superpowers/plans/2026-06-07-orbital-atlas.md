# Orbital Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser app that renders ~10–15k live-propagated satellites + debris on a dark night-Earth globe, with 360° rotate/zoom, click-for-details, layer filters, and orbit paths.

**Architecture:** Static Vite/TypeScript site. A Web Worker runs SGP4 propagation (satellite.js) and streams positions to the main thread as a transferable `Float32Array`. Three.js renders the Earth and a single GPU point cloud. Pure-logic modules (classification, orbital math, parsing, filtering, formatting) are unit-tested with Vitest; rendering modules are verified by running the app.

**Tech Stack:** Vite, TypeScript, Three.js, satellite.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-07-orbital-atlas-design.md`

---

## File Structure

```
universe_locatar/                 # repo: github.com/fourn9/orbital-atlas
├── index.html                    # app shell: #app + sidebar/detail containers
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── earth-night.jpg           # night-lights Earth texture
│   └── tle-snapshot.json         # bundled offline fallback catalog
├── src/
│   ├── main.ts                   # entry: create App, start it
│   ├── app.ts                    # orchestrator: state (selection, filters), wiring
│   ├── types.ts                  # OrbitalObject, FilterState, ObjectKinematics
│   ├── data/
│   │   ├── celestrak.ts          # group keys + raw fetch of GP JSON
│   │   ├── parse.ts              # GP JSON record -> OrbitalObject
│   │   ├── classify.ts          # OBJECT_TYPE -> 'facility'|'debris'; altitude -> band
│   │   └── catalog.ts            # fetch all groups, cache (localStorage), refresh, fallback
│   ├── propagation/
│   │   ├── orbital-math.ts       # period/speed/altitude from satrec+date; band; gmst
│   │   └── propagate-core.ts     # computePositions(satrecs, date, outFloat32) — pure
│   ├── worker/
│   │   └── propagate.worker.ts   # thin worker wrapping propagate-core
│   ├── scene/
│   │   ├── scene-setup.ts        # renderer, camera, OrbitControls, starfield, loop
│   │   ├── earth.ts              # night-Earth sphere + atmosphere + GMST rotation
│   │   ├── objects.ts            # Points cloud: colors, positions update, visibility
│   │   ├── picking.ts            # raycast -> nearest object index
│   │   └── orbit-path.ts         # sample one period of a satrec -> Line geometry
│   └── ui/
│       ├── sidebar.ts            # filter toggles + legend; computes visible mask
│       └── detail-panel.ts       # slide-in panel; formats live kinematics
└── tests/
    ├── classify.test.ts
    ├── orbital-math.test.ts
    ├── parse.test.ts
    ├── catalog.test.ts
    ├── propagate-core.test.ts
    ├── objects-color.test.ts
    ├── orbit-path.test.ts
    ├── filters.test.ts
    └── detail-format.test.ts
```

**Shared types** (defined in Task 2, referenced everywhere):

```ts
// src/types.ts
export type ObjectType = 'facility' | 'debris';
export type OrbitBand = 'LEO' | 'MEO' | 'GEO';

export interface OrbitalObject {
  noradId: number;
  name: string;
  type: ObjectType;
  group: string;
  orbitBand: OrbitBand;
  tleLine1: string;
  tleLine2: string;
}

export interface FilterState {
  facility: boolean;
  debris: boolean;
  bands: Record<OrbitBand, boolean>;
}

export interface ObjectKinematics {
  altitudeKm: number;
  speedKmS: number;
  periodMin: number;
  inclinationDeg: number;
}
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Initialize package and install deps**

Run:
```bash
cd universe_locatar
npm init -y
npm install three satellite.js
npm install -D vite typescript @types/three vitest jsdom
```

- [ ] **Step 2: Add scripts to package.json**

Set the `"scripts"` block:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create vite.config.ts (with Vitest config)**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: { environment: 'jsdom' },
});
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Orbital Atlas</title>
    <style>
      html, body { margin: 0; height: 100%; background: #04050d; overflow: hidden; font-family: system-ui, sans-serif; color: #cfe0ff; }
      #app { position: fixed; inset: 0; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create a placeholder src/main.ts**

```ts
const app = document.getElementById('app')!;
app.textContent = 'Orbital Atlas booting…';
```

- [ ] **Step 7: Verify dev server + test runner**

Run: `npm run dev` → open the printed URL, confirm "Orbital Atlas booting…" shows. Stop the server.
Run: `npm test` → Expected: "No test files found" (exit 0 is fine at this point).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts
git commit -m "chore: scaffold Vite + TS + Vitest project"
```

---

## Task 2: Types + classification (TDD)

**Files:**
- Create: `src/types.ts` (content shown in File Structure section above)
- Create: `src/data/classify.ts`
- Test: `tests/classify.test.ts`

- [ ] **Step 1: Create src/types.ts** — paste the "Shared types" block from the File Structure section.

- [ ] **Step 2: Write the failing test**

```ts
// tests/classify.test.ts
import { describe, it, expect } from 'vitest';
import { classifyType, classifyBand } from '../src/data/classify';

describe('classifyType', () => {
  it('maps PAYLOAD to facility', () => expect(classifyType('PAYLOAD')).toBe('facility'));
  it('maps DEBRIS to debris', () => expect(classifyType('DEBRIS')).toBe('debris'));
  it('maps ROCKET BODY to debris', () => expect(classifyType('ROCKET BODY')).toBe('debris'));
  it('maps UNKNOWN to debris', () => expect(classifyType('UNKNOWN')).toBe('debris'));
});

describe('classifyBand', () => {
  it('LEO below 2000 km', () => expect(classifyBand(550)).toBe('LEO'));
  it('MEO between 2000 and 35586 km', () => expect(classifyBand(20200)).toBe('MEO'));
  it('GEO at ~35786 km', () => expect(classifyBand(35786)).toBe('GEO'));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/classify.test.ts`
Expected: FAIL — cannot find module `../src/data/classify`.

- [ ] **Step 4: Implement src/data/classify.ts**

```ts
import type { ObjectType, OrbitBand } from '../types';

export function classifyType(objectType: string): ObjectType {
  return objectType.toUpperCase() === 'PAYLOAD' ? 'facility' : 'debris';
}

// GEO altitude ~35786 km; treat the MEO/GEO boundary at 35586 km (200 km below GEO).
export function classifyBand(altitudeKm: number): OrbitBand {
  if (altitudeKm < 2000) return 'LEO';
  if (altitudeKm < 35586) return 'MEO';
  return 'GEO';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/classify.test.ts` → Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/classify.ts tests/classify.test.ts
git commit -m "feat: object type + orbit band classification"
```

---

## Task 3: Orbital math (TDD)

**Files:**
- Create: `src/propagation/orbital-math.ts`
- Test: `tests/orbital-math.test.ts`

Uses satellite.js: `twoline2satrec`, `propagate`, `gstime`. Period from mean motion in the TLE; altitude/speed from the propagated ECI state.

- [ ] **Step 1: Write the failing test** (ISS TLE; values are approximate, checked with tolerances)

```ts
// tests/orbital-math.test.ts
import { describe, it, expect } from 'vitest';
import { twoline2satrec } from 'satellite.js';
import { orbitalPeriodMin, kinematicsAt, gmstRadians } from '../src/propagation/orbital-math';

// A representative ISS TLE (epoch fixed so tests are deterministic).
const L1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000';
const L2 = '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000';

describe('orbitalPeriodMin', () => {
  it('ISS period is ~92 minutes', () => {
    const satrec = twoline2satrec(L1, L2);
    expect(orbitalPeriodMin(satrec)).toBeGreaterThan(88);
    expect(orbitalPeriodMin(satrec)).toBeLessThan(96);
  });
});

describe('kinematicsAt', () => {
  it('ISS altitude ~400 km and speed ~7.6 km/s', () => {
    const satrec = twoline2satrec(L1, L2);
    const k = kinematicsAt(satrec, new Date('2024-01-01T12:00:00Z'));
    expect(k.altitudeKm).toBeGreaterThan(350);
    expect(k.altitudeKm).toBeLessThan(450);
    expect(k.speedKmS).toBeGreaterThan(7.3);
    expect(k.speedKmS).toBeLessThan(7.9);
    expect(k.inclinationDeg).toBeGreaterThan(51);
    expect(k.inclinationDeg).toBeLessThan(52);
  });
});

describe('gmstRadians', () => {
  it('returns an angle in [0, 2π)', () => {
    const g = gmstRadians(new Date('2024-01-01T12:00:00Z'));
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThan(2 * Math.PI);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/orbital-math.test.ts` → Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/propagation/orbital-math.ts**

```ts
import { propagate, gstime } from 'satellite.js';
import type { SatRec } from 'satellite.js';
import type { ObjectKinematics } from '../types';

const EARTH_RADIUS_KM = 6371;
const MU = 398600.4418; // km^3/s^2

// satrec.no is mean motion in radians/min.
export function orbitalPeriodMin(satrec: SatRec): number {
  return (2 * Math.PI) / satrec.no;
}

export function gmstRadians(date: Date): number {
  const g = gstime(date) % (2 * Math.PI);
  return g < 0 ? g + 2 * Math.PI : g;
}

export function kinematicsAt(satrec: SatRec, date: Date): ObjectKinematics {
  const pv = propagate(satrec, date);
  const r = pv.position as { x: number; y: number; z: number };
  const v = pv.velocity as { x: number; y: number; z: number };
  const radius = Math.hypot(r.x, r.y, r.z);
  const altitudeKm = radius - EARTH_RADIUS_KM;
  const speedKmS = v ? Math.hypot(v.x, v.y, v.z) : Math.sqrt(MU / radius);
  return {
    altitudeKm,
    speedKmS,
    periodMin: orbitalPeriodMin(satrec),
    inclinationDeg: (satrec.inclo * 180) / Math.PI,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/orbital-math.test.ts` → Expected: PASS.
If satellite.js types don't export `SatRec`, use `ReturnType<typeof twoline2satrec>` as the type alias instead.

- [ ] **Step 5: Commit**

```bash
git add src/propagation/orbital-math.ts tests/orbital-math.test.ts
git commit -m "feat: orbital math (period, kinematics, GMST)"
```

---

## Task 4: Catalog parse + fetch/cache (TDD)

**Files:**
- Create: `src/data/celestrak.ts`, `src/data/parse.ts`, `src/data/catalog.ts`
- Test: `tests/parse.test.ts`, `tests/catalog.test.ts`

- [ ] **Step 1: Create src/data/celestrak.ts**

```ts
// Celestrak GP (general perturbations) JSON endpoints. No auth required.
export const GROUPS = ['active', '1999-025', 'cosmos-2251-debris', 'iridium-33-debris'] as const;
export type GroupKey = (typeof GROUPS)[number];

const BASE = 'https://celestrak.org/NORAD/elements/gp.php';

export function groupUrl(group: GroupKey): string {
  return `${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
}

// One record as returned by Celestrak GP JSON (subset we use).
export interface GpRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  OBJECT_TYPE?: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
}
```

- [ ] **Step 2: Write the failing parse test**

```ts
// tests/parse.test.ts
import { describe, it, expect } from 'vitest';
import { parseRecord } from '../src/data/parse';

const iss = {
  OBJECT_NAME: 'ISS (ZARYA)',
  NORAD_CAT_ID: 25544,
  OBJECT_TYPE: 'PAYLOAD',
  TLE_LINE1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  TLE_LINE2: '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
};

describe('parseRecord', () => {
  it('builds an OrbitalObject with facility type and a band', () => {
    const obj = parseRecord(iss, 'active');
    expect(obj!.noradId).toBe(25544);
    expect(obj!.name).toBe('ISS (ZARYA)');
    expect(obj!.type).toBe('facility');
    expect(obj!.group).toBe('active');
    expect(obj!.orbitBand).toBe('LEO');
  });

  it('returns null for a record with an unparseable TLE', () => {
    const bad = { ...iss, TLE_LINE1: 'garbage', TLE_LINE2: 'garbage' };
    expect(parseRecord(bad, 'active')).toBeNull();
  });
});
```

- [ ] **Step 3: Run it — expect FAIL** (`npx vitest run tests/parse.test.ts`).

- [ ] **Step 4: Implement src/data/parse.ts**

```ts
import { twoline2satrec } from 'satellite.js';
import type { OrbitalObject } from '../types';
import type { GpRecord } from './celestrak';
import { classifyType, classifyBand } from './classify';
import { kinematicsAt } from '../propagation/orbital-math';

// Returns null if the TLE cannot be parsed/propagated (object is skipped).
export function parseRecord(rec: GpRecord, group: string): OrbitalObject | null {
  try {
    const satrec = twoline2satrec(rec.TLE_LINE1, rec.TLE_LINE2);
    if (!satrec || (satrec as { error?: number }).error) return null;
    const { altitudeKm } = kinematicsAt(satrec, new Date('2024-01-01T00:00:00Z'));
    if (!Number.isFinite(altitudeKm)) return null;
    return {
      noradId: rec.NORAD_CAT_ID,
      name: rec.OBJECT_NAME,
      type: classifyType(rec.OBJECT_TYPE ?? 'UNKNOWN'),
      group,
      orbitBand: classifyBand(altitudeKm),
      tleLine1: rec.TLE_LINE1,
      tleLine2: rec.TLE_LINE2,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run it — expect PASS.**

- [ ] **Step 6: Write the failing catalog test** (mock fetch + localStorage via jsdom)

```ts
// tests/catalog.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCatalog } from '../src/data/catalog';

const sample = [{
  OBJECT_NAME: 'ISS (ZARYA)', NORAD_CAT_ID: 25544, OBJECT_TYPE: 'PAYLOAD',
  TLE_LINE1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  TLE_LINE2: '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
}];

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('loadCatalog', () => {
  it('fetches groups, parses, and caches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => sample })));
    const objs = await loadCatalog();
    expect(objs.length).toBeGreaterThan(0);
    expect(localStorage.getItem('orbital-atlas:catalog')).not.toBeNull();
  });

  it('falls back to cache when fetch fails', async () => {
    localStorage.setItem('orbital-atlas:catalog', JSON.stringify({
      ts: Date.now(),
      objects: [{ noradId: 1, name: 'X', type: 'facility', group: 'active', orbitBand: 'LEO', tleLine1: 'a', tleLine2: 'b' }],
    }));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const objs = await loadCatalog();
    expect(objs[0].name).toBe('X');
  });
});
```

- [ ] **Step 7: Run it — expect FAIL.**

- [ ] **Step 8: Implement src/data/catalog.ts**

```ts
import type { OrbitalObject } from '../types';
import { GROUPS, groupUrl, type GpRecord } from './celestrak';
import { parseRecord } from './parse';

const CACHE_KEY = 'orbital-atlas:catalog';
const REFRESH_MS = 3 * 60 * 60 * 1000; // 3 hours

interface Cache { ts: number; objects: OrbitalObject[]; }

function readCache(): Cache | null {
  const raw = localStorage.getItem(CACHE_KEY);
  return raw ? (JSON.parse(raw) as Cache) : null;
}

async function fetchAll(): Promise<OrbitalObject[]> {
  const out: OrbitalObject[] = [];
  for (const group of GROUPS) {
    const res = await fetch(groupUrl(group));
    if (!res.ok) throw new Error(`fetch ${group} failed: ${res.status}`);
    const records = (await res.json()) as GpRecord[];
    for (const rec of records) {
      const obj = parseRecord(rec, group);
      if (obj) out.push(obj);
    }
  }
  return out;
}

// Returns the freshest catalog available: cache if fresh, else network, else stale cache, else bundled snapshot.
export async function loadCatalog(): Promise<OrbitalObject[]> {
  const cache = readCache();
  if (cache && Date.now() - cache.ts < REFRESH_MS) return cache.objects;
  try {
    const objects = await fetchAll();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), objects }));
    return objects;
  } catch (err) {
    if (cache) return cache.objects;
    const res = await fetch('/tle-snapshot.json');
    const records = (await res.json()) as GpRecord[];
    return records.map((r) => parseRecord(r, 'active')).filter((o): o is OrbitalObject => o !== null);
  }
}
```

- [ ] **Step 9: Run it — expect PASS** (`npx vitest run tests/parse.test.ts tests/catalog.test.ts`).

- [ ] **Step 10: Commit**

```bash
git add src/data/celestrak.ts src/data/parse.ts src/data/catalog.ts tests/parse.test.ts tests/catalog.test.ts
git commit -m "feat: Celestrak catalog fetch, parse, cache + fallback"
```

---

## Task 5: Propagation core + Web Worker (TDD core)

**Files:**
- Create: `src/propagation/propagate-core.ts`, `src/worker/propagate.worker.ts`
- Test: `tests/propagate-core.test.ts`

Coordinate convention: scene units = km / 1000. We write ECI x,y,z (scaled) into a flat `Float32Array` of length `3 * count`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/propagate-core.test.ts
import { describe, it, expect } from 'vitest';
import { twoline2satrec } from 'satellite.js';
import { computePositions, SCENE_SCALE } from '../src/propagation/propagate-core';

const satrec = twoline2satrec(
  '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
);

describe('computePositions', () => {
  it('fills x,y,z for each satrec at the given date', () => {
    const out = new Float32Array(3);
    computePositions([satrec], new Date('2024-01-01T12:00:00Z'), out);
    const radius = Math.hypot(out[0], out[1], out[2]) / SCENE_SCALE; // back to km
    expect(radius).toBeGreaterThan(6600); // ~6771 km for ISS
    expect(radius).toBeLessThan(6900);
  });

  it('writes 0,0,0 for an object that fails to propagate', () => {
    const broken = { ...satrec, error: 1 } as typeof satrec;
    const out = new Float32Array(3).fill(9);
    computePositions([broken], new Date('2024-01-01T12:00:00Z'), out);
    expect([out[0], out[1], out[2]]).toEqual([0, 0, 0]);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

- [ ] **Step 3: Implement src/propagation/propagate-core.ts**

```ts
import { propagate } from 'satellite.js';
import type { SatRec } from 'satellite.js';

export const SCENE_SCALE = 1 / 1000; // km -> scene units

// Writes ECI positions (scaled) into out[i*3..i*3+2]. Failures write 0,0,0.
export function computePositions(satrecs: SatRec[], date: Date, out: Float32Array): void {
  for (let i = 0; i < satrecs.length; i++) {
    const rec = satrecs[i];
    let x = 0, y = 0, z = 0;
    if (!(rec as { error?: number }).error) {
      const pv = propagate(rec, date);
      const p = pv.position as { x: number; y: number; z: number } | false;
      if (p) { x = p.x * SCENE_SCALE; y = p.y * SCENE_SCALE; z = p.z * SCENE_SCALE; }
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
}
```

- [ ] **Step 4: Run it — expect PASS.**

- [ ] **Step 5: Implement src/worker/propagate.worker.ts** (thin wrapper; no unit test — verified at integration)

```ts
import { twoline2satrec } from 'satellite.js';
import type { SatRec } from 'satellite.js';
import { computePositions } from '../propagation/propagate-core';

let satrecs: SatRec[] = [];
let buffer: Float32Array = new Float32Array(0);

interface InitMsg { type: 'init'; tles: { l1: string; l2: string }[]; }
interface TickMsg { type: 'tick'; timeMs: number; }
type InMsg = InitMsg | TickMsg;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    satrecs = msg.tles.map((t) => twoline2satrec(t.l1, t.l2));
    buffer = new Float32Array(satrecs.length * 3);
  } else if (msg.type === 'tick') {
    computePositions(satrecs, new Date(msg.timeMs), buffer);
    const copy = buffer.slice();
    (self as unknown as Worker).postMessage({ type: 'positions', buffer: copy }, [copy.buffer]);
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add src/propagation/propagate-core.ts src/worker/propagate.worker.ts tests/propagate-core.test.ts
git commit -m "feat: SGP4 position core + propagation worker"
```

---

## Task 6: Scene setup (renderer, camera, controls, starfield)

**Files:**
- Create: `src/scene/scene-setup.ts`

Verification is by running the app (WebGL/DOM not unit-testable here).

- [ ] **Step 1: Implement src/scene/scene-setup.ts**

```ts
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
```

- [ ] **Step 2: Wire a temporary smoke test in src/main.ts**

```ts
import { createStage } from './scene/scene-setup';
const app = document.getElementById('app')!;
createStage(app);
```

- [ ] **Step 3: Verify**

Run: `npm run dev` → open URL. Expected: black scene with a starfield; mouse-drag rotates the empty view, scroll zooms (clamped). No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/scene-setup.ts src/main.ts
git commit -m "feat: Three.js stage with OrbitControls + starfield"
```

---

## Task 7: Night Earth + GMST rotation

**Files:**
- Create: `src/scene/earth.ts`
- Asset: `public/earth-night.jpg` (download a NASA Black Marble / night-lights equirectangular texture)

- [ ] **Step 1: Add the texture**

Download an equirectangular night-lights image to `public/earth-night.jpg` (e.g. NASA Black Marble). Keep it ≤ 4096px wide for load speed.

- [ ] **Step 2: Implement src/scene/earth.ts**

```ts
import * as THREE from 'three';
import { gmstRadians } from '../propagation/orbital-math';

const EARTH_RADIUS = 6.371; // scene units (km/1000)

export interface Earth {
  mesh: THREE.Mesh;
  update: (date: Date) => void;
}

export function createEarth(scene: THREE.Scene): Earth {
  const texture = new THREE.TextureLoader().load('/earth-night.jpg');
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
    // Rotate Earth so its surface aligns with the inertial (ECI) object frame.
    update: (date: Date) => { mesh.rotation.y = gmstRadians(date); },
  };
}
```

- [ ] **Step 3: Wire into main.ts smoke test**

```ts
import { createStage } from './scene/scene-setup';
import { createEarth } from './scene/earth';
const app = document.getElementById('app')!;
const stage = createStage(app);
const earth = createEarth(stage.scene);
stage.onFrame(() => earth.update(new Date()));
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Expected: a dark Earth with visible city lights, faint blue atmosphere rim; rotate/zoom works.

- [ ] **Step 5: Commit**

```bash
git add src/scene/earth.ts public/earth-night.jpg src/main.ts
git commit -m "feat: night-Earth globe with GMST rotation + atmosphere"
```

---

## Task 8: Object point cloud + colors + live update

**Files:**
- Create: `src/scene/objects.ts`
- Test: `tests/objects-color.test.ts`

- [ ] **Step 1: Write the failing color test**

```ts
// tests/objects-color.test.ts
import { describe, it, expect } from 'vitest';
import { colorFor } from '../src/scene/objects';

describe('colorFor', () => {
  it('facility is blue-ish (b > r)', () => {
    const c = colorFor('facility');
    expect(c[2]).toBeGreaterThan(c[0]);
  });
  it('debris is orange-ish (r > b)', () => {
    const c = colorFor('debris');
    expect(c[0]).toBeGreaterThan(c[2]);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

- [ ] **Step 3: Implement src/scene/objects.ts**

```ts
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
    size: 0.08, vertexColors: true, sizeAttenuation: true, transparent: true,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    setPositions: (buf) => {
      (geo.getAttribute('position') as THREE.BufferAttribute).array.set(buf);
      geo.getAttribute('position').needsUpdate = true;
    },
    setVisibility: (mask) => {
      const col = geo.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i]) col.array.set([baseColors[i*3], baseColors[i*3+1], baseColors[i*3+2]], i * 3);
        else col.array.set([0, 0, 0], i * 3); // hidden = black (invisible on black bg)
      }
      col.needsUpdate = true;
    },
  };
}
```

- [ ] **Step 4: Run it — expect PASS** (`npx vitest run tests/objects-color.test.ts`).

- [ ] **Step 5: Verify in app** — wire catalog + worker + cloud in main.ts smoke test:

```ts
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
```

Expected: thousands of colored dots appear in shells around the Earth and drift slowly over ~seconds. Frame rate stays smooth.

- [ ] **Step 6: Commit**

```bash
git add src/scene/objects.ts tests/objects-color.test.ts src/main.ts
git commit -m "feat: object point cloud with live positions + colors"
```

---

## Task 9: Picking + selection

**Files:**
- Create: `src/scene/picking.ts`

Raycaster against the point cloud; `Points.threshold` controls hit tolerance.

- [ ] **Step 1: Implement src/scene/picking.ts**

```ts
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
  raycaster.params.Points = { threshold: 0.12 };
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
```

- [ ] **Step 2: Verify in app** — add to main.ts smoke test a click handler that logs the picked object:

```ts
import { createPicker } from './scene/picking';
const picker = createPicker(stage.renderer, stage.camera, cloud.points);
stage.renderer.domElement.addEventListener('pointerdown', (ev) => {
  const idx = picker.pick(ev.clientX, ev.clientY);
  if (idx !== null) console.log('picked', objects[idx].name);
});
```

Expected: clicking a dot logs the correct object name; clicking empty space logs nothing.

- [ ] **Step 3: Commit**

```bash
git add src/scene/picking.ts src/main.ts
git commit -m "feat: click-to-pick objects via raycaster"
```

---

## Task 10: Orbit path for selected object

**Files:**
- Create: `src/scene/orbit-path.ts`
- Test: `tests/orbit-path.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/orbit-path.test.ts
import { describe, it, expect } from 'vitest';
import { twoline2satrec } from 'satellite.js';
import { samplePath } from '../src/scene/orbit-path';

const satrec = twoline2satrec(
  '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
);

describe('samplePath', () => {
  it('returns 3 floats per sample for the requested count', () => {
    const arr = samplePath(satrec, new Date('2024-01-01T12:00:00Z'), 90);
    expect(arr.length).toBe(90 * 3);
    const r = Math.hypot(arr[0], arr[1], arr[2]); // first point near ISS radius (scaled)
    expect(r).toBeGreaterThan(6.6);
    expect(r).toBeLessThan(6.9);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

- [ ] **Step 3: Implement src/scene/orbit-path.ts**

```ts
import * as THREE from 'three';
import { propagate } from 'satellite.js';
import type { SatRec } from 'satellite.js';
import { orbitalPeriodMin } from '../propagation/orbital-math';
import { SCENE_SCALE } from '../propagation/propagate-core';

// Samples one full orbital period starting at `start`. Returns flat xyz (scaled).
export function samplePath(satrec: SatRec, start: Date, samples: number): Float32Array {
  const periodMs = orbitalPeriodMin(satrec) * 60 * 1000;
  const out = new Float32Array(samples * 3);
  for (let i = 0; i < samples; i++) {
    const t = new Date(start.getTime() + (periodMs * i) / samples);
    const p = propagate(satrec, t).position as { x: number; y: number; z: number } | false;
    if (p) { out[i*3] = p.x*SCENE_SCALE; out[i*3+1] = p.y*SCENE_SCALE; out[i*3+2] = p.z*SCENE_SCALE; }
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
```

- [ ] **Step 4: Run it — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/scene/orbit-path.ts tests/orbit-path.test.ts
git commit -m "feat: orbit path ring for selected object"
```

---

## Task 11: Sidebar — filters + legend

**Files:**
- Create: `src/ui/sidebar.ts`
- Test: `tests/filters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/filters.test.ts
import { describe, it, expect } from 'vitest';
import { computeMask } from '../src/ui/sidebar';
import type { OrbitalObject, FilterState } from '../src/types';

const objs: OrbitalObject[] = [
  { noradId: 1, name: 'Sat', type: 'facility', group: 'active', orbitBand: 'LEO', tleLine1: '', tleLine2: '' },
  { noradId: 2, name: 'Junk', type: 'debris', group: 'iridium-33-debris', orbitBand: 'GEO', tleLine1: '', tleLine2: '' },
];
const all: FilterState = { facility: true, debris: true, bands: { LEO: true, MEO: true, GEO: true } };

describe('computeMask', () => {
  it('shows everything when all filters on', () => expect(computeMask(objs, all)).toEqual([true, true]));
  it('hides debris when debris off', () => {
    expect(computeMask(objs, { ...all, debris: false })).toEqual([true, false]);
  });
  it('hides GEO band when GEO off', () => {
    expect(computeMask(objs, { ...all, bands: { LEO: true, MEO: true, GEO: false } })).toEqual([true, false]);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

- [ ] **Step 3: Implement src/ui/sidebar.ts**

```ts
import type { OrbitalObject, FilterState } from '../types';

// An object is visible only if BOTH its type and its band are enabled.
export function computeMask(objects: OrbitalObject[], filters: FilterState): boolean[] {
  return objects.map((o) => filters[o.type] && filters.bands[o.orbitBand]);
}

export interface Sidebar { el: HTMLElement; }

export function createSidebar(
  parent: HTMLElement,
  initial: FilterState,
  onChange: (f: FilterState) => void,
): Sidebar {
  const state: FilterState = structuredClone(initial);
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:0;top:0;bottom:0;width:240px;padding:16px;' +
    'background:rgba(10,16,32,.82);border-right:1px solid rgba(120,160,255,.25);' +
    'backdrop-filter:blur(6px);font:13px system-ui;color:#cfe0ff;z-index:10;';

  function checkbox(label: string, checked: boolean, swatch: string, onToggle: (v: boolean) => void) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer;';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = checked;
    box.onchange = () => { onToggle(box.checked); onChange(structuredClone(state)); };
    const dot = document.createElement('span');
    dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${swatch};box-shadow:0 0 6px ${swatch};`;
    row.append(box, dot, document.createTextNode(label));
    return row;
  }

  el.innerHTML = '<h3 style="margin:0 0 4px;font-size:13px;letter-spacing:.5px;">ORBITAL ATLAS</h3>' +
    '<div style="opacity:.6;margin-bottom:12px;">Layers</div>';
  el.append(
    checkbox('Facilities', state.facility, '#7fd0ff', (v) => (state.facility = v)),
    checkbox('Debris', state.debris, '#ff9a4d', (v) => (state.debris = v)),
  );
  const bandHdr = document.createElement('div');
  bandHdr.style.cssText = 'opacity:.6;margin:12px 0 4px;'; bandHdr.textContent = 'Orbit band';
  el.append(bandHdr);
  (['LEO', 'MEO', 'GEO'] as const).forEach((b) =>
    el.append(checkbox(b, state.bands[b], '#9fb4e6', (v) => (state.bands[b] = v))),
  );
  parent.appendChild(el);
  return { el };
}
```

- [ ] **Step 4: Run it — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/ui/sidebar.ts tests/filters.test.ts
git commit -m "feat: sidebar filters + legend with visibility mask"
```

---

## Task 12: Detail panel (slide-in)

**Files:**
- Create: `src/ui/detail-panel.ts`
- Test: `tests/detail-format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/detail-format.test.ts
import { describe, it, expect } from 'vitest';
import { formatKinematics } from '../src/ui/detail-panel';

describe('formatKinematics', () => {
  it('formats values with units and sensible precision', () => {
    const rows = formatKinematics({ altitudeKm: 408.2, speedKmS: 7.66, periodMin: 92.7, inclinationDeg: 51.64 });
    expect(rows).toContainEqual(['Altitude', '408 km']);
    expect(rows).toContainEqual(['Speed', '7.66 km/s']);
    expect(rows).toContainEqual(['Period', '92.7 min']);
    expect(rows).toContainEqual(['Inclination', '51.6°']);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

- [ ] **Step 3: Implement src/ui/detail-panel.ts**

```ts
import type { OrbitalObject, ObjectKinematics } from '../types';

export function formatKinematics(k: ObjectKinematics): [string, string][] {
  return [
    ['Altitude', `${Math.round(k.altitudeKm)} km`],
    ['Speed', `${k.speedKmS.toFixed(2)} km/s`],
    ['Period', `${k.periodMin.toFixed(1)} min`],
    ['Inclination', `${k.inclinationDeg.toFixed(1)}°`],
  ];
}

export interface DetailPanel {
  show: (obj: OrbitalObject, k: ObjectKinematics) => void;
  update: (k: ObjectKinematics) => void;
  hide: () => void;
}

export function createDetailPanel(parent: HTMLElement, onClose: () => void): DetailPanel {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;right:0;top:0;bottom:0;width:280px;padding:18px;transform:translateX(100%);' +
    'transition:transform .25s ease;background:rgba(10,16,32,.9);border-left:1px solid rgba(127,208,255,.4);' +
    'backdrop-filter:blur(6px);font:13px system-ui;color:#cfe0ff;z-index:10;';
  parent.appendChild(el);

  const render = (obj: OrbitalObject, k: ObjectKinematics) => {
    const rows = formatKinematics(k)
      .map(([key, val]) => `<div style="display:flex;justify-content:space-between;margin:6px 0;"><span style="opacity:.6;">${key}</span><span>${val}</span></div>`)
      .join('');
    el.innerHTML =
      `<button id="dp-close" style="float:right;background:none;border:none;color:#9fb4e6;font-size:18px;cursor:pointer;">×</button>` +
      `<h3 style="margin:0 0 2px;font-size:15px;">${obj.name}</h3>` +
      `<div style="opacity:.6;margin-bottom:12px;">${obj.type} · NORAD ${obj.noradId} · ${obj.orbitBand}</div>` +
      rows;
    (el.querySelector('#dp-close') as HTMLButtonElement).onclick = onClose;
  };

  let current: OrbitalObject | null = null;
  return {
    show: (obj, k) => { current = obj; render(obj, k); el.style.transform = 'translateX(0)'; },
    update: (k) => { if (current) render(current, k); },
    hide: () => { current = null; el.style.transform = 'translateX(100%)'; },
  };
}
```

- [ ] **Step 4: Run it — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/ui/detail-panel.ts tests/detail-format.test.ts
git commit -m "feat: slide-in detail panel with live kinematics"
```

---

## Task 13: App orchestration + offline snapshot + integration verify

**Files:**
- Create: `src/app.ts`; rewrite `src/main.ts`
- Create: `public/tle-snapshot.json` (offline fallback)

- [ ] **Step 1: Generate the offline snapshot**

Run (saves a small live pull as the bundled fallback):
```bash
curl -s 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json' -o public/tle-snapshot.json
node -e "const a=require('./public/tle-snapshot.json');require('fs').writeFileSync('./public/tle-snapshot.json',JSON.stringify(a.slice(0,1500)))"
```
This trims to ~1500 objects so the fallback bundle stays small.

- [ ] **Step 2: Implement src/app.ts** (wires data → worker → scene → UI; owns selection + filters + per-frame live updates)

```ts
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

  const stage = createStage(container);
  const earth = createEarth(stage.scene);
  const cloud = createObjectCloud(stage.scene, objects);
  const orbit = createOrbitPath(stage.scene);
  const picker = createPicker(stage.renderer, stage.camera, cloud.points);

  let filters: FilterState = { facility: true, debris: true, bands: { LEO: true, MEO: true, GEO: true } };
  const applyFilters = () => cloud.setVisibility(computeMask(objects, filters));
  createSidebar(container, filters, (f) => { filters = f; applyFilters(); });
  applyFilters();

  let selected: number | null = null;
  const panel = createDetailPanel(container, () => { selected = null; orbit.hide(); panel.hide(); });

  stage.renderer.domElement.addEventListener('pointerdown', (ev) => {
    const idx = picker.pick(ev.clientX, ev.clientY);
    if (idx === null) return;
    selected = idx;
    const now = new Date();
    panel.show(objects[idx], kinematicsAt(satrecs[idx], now));
    orbit.show(satrecs[idx], now);
  });

  // Propagation worker → live positions.
  const worker = new Worker(new URL('./worker/propagate.worker.ts', import.meta.url), { type: 'module' });
  worker.postMessage({ type: 'init', tles: objects.map((o) => ({ l1: o.tleLine1, l2: o.tleLine2 })) });
  worker.onmessage = (e) => { if (e.data.type === 'positions') cloud.setPositions(e.data.buffer); };
  setInterval(() => worker.postMessage({ type: 'tick', timeMs: Date.now() }), 1000);

  // Per-frame: spin Earth to current sidereal time; refresh selected panel values.
  stage.onFrame(() => {
    const now = new Date();
    earth.update(now);
    if (selected !== null) panel.update(kinematicsAt(satrecs[selected], now));
  });
}
```

- [ ] **Step 3: Rewrite src/main.ts**

```ts
import { startApp } from './app';

const app = document.getElementById('app')!;
startApp(app).catch((err) => {
  app.textContent = 'Failed to load orbital data. Check your connection and refresh.';
  console.error(err);
});
```

- [ ] **Step 4: Full integration verification**

Run: `npm test` → Expected: ALL unit suites PASS.
Run: `npm run dev` → open URL. Confirm each acceptance check:
  - Dark Earth with city lights + starfield renders.
  - Thousands of blue (facility) and orange (debris) dots drift live around the globe.
  - Drag rotates 360°, scroll zooms (clamped between LEO and beyond GEO).
  - Clicking a dot opens the right-hand panel with name/type/NORAD/altitude/speed/period/inclination, and draws its orbit ring; values tick as it moves.
  - Toggling Facilities / Debris / LEO / MEO / GEO hides/shows the right dots.
  - Closing the panel removes the orbit ring.
Run: `npm run build` → Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/main.ts public/tle-snapshot.json
git commit -m "feat: wire full app (data+worker+scene+UI) with offline fallback"
```

- [ ] **Step 6: Push**

```bash
git push
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Live real-time motion → Tasks 5, 8, 13 (worker tick + per-frame Earth spin). ✓
- Celestrak data + classification + bands → Tasks 2, 4. ✓
- ~10–15k point-cloud rendering → Task 8. ✓
- 360° rotate + zoom → Task 6 (OrbitControls, clamped). ✓
- Click-for-details → Tasks 9, 12. ✓
- Filters + legend → Task 11. ✓
- Orbit paths → Task 10. ✓
- Dark night-Earth + GMST coordinate model → Task 7, orbital-math. ✓
- Error handling (cache/fallback, bad TLE skip, load failure message) → Tasks 4, main.ts. ✓
- Testing (Vitest, TDD) → every logic task. ✓

**Type consistency:** `OrbitalObject`, `FilterState`, `ObjectKinematics` defined in Task 2 and used unchanged throughout. `computePositions`/`SCENE_SCALE` (Task 5) reused by orbit-path (Task 10). `computeMask` (Task 11) consumed by `app.ts` (Task 13). ✓

**Placeholders:** none — every code step shows complete code.

## Out of scope (future, per spec)
Search-by-name + fly-to, time-scrubbing, photoreal imagery, ground stations/coverage cones, conjunction warnings, mobile-touch polish.
