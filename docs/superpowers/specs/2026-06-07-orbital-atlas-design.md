# Orbital Atlas — Design Spec

- **Date:** 2026-06-07
- **Status:** Approved (brainstorming complete)
- **Repo:** github.com/fourn9/orbital-atlas (public)
- **Local folder:** `universe_locatar/`

## 1. Summary

A browser-based, interactive 3D viewer of Earth's orbital environment. It renders
~10–15k **facilities** (active satellites / stations) and **debris** (debris +
rocket bodies) from real catalog data, drifting **live** at their current real
positions. Dark night-Earth globe with glowing dots, 360° rotate + zoom,
click-for-details, layer filters, and orbit paths.

## 2. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Domain | Space / orbital around Earth |
| Data source | Real catalog — **Celestrak** TLE/JSON (free, no auth) |
| Scale | Active satellites + major debris clouds (~10–15k objects) |
| Motion | **Live real-time** — propagate to "now", objects drift; no time-scrubbing |
| Interactions (v1) | 360° rotate + zoom, click-for-details, layer filters + legend, orbit paths |
| Tech stack | **Three.js + satellite.js + Web Worker**, browser web app |
| Layout | **A · Mission Control** — left sidebar (filters+legend), center globe, right slide-in detail |
| Visual style | **Dark / Night Earth** — black-marble + city lights; facility=blue, debris=orange |
| Hosting/tracking | New public GitHub repo `orbital-atlas`, Issue per plan task |

## 3. Tech stack

- **Vite + TypeScript** (static site, no backend)
- **Three.js** — rendering, camera, `OrbitControls`
- **satellite.js** — SGP4 orbital propagation
- **Web Worker** — runs propagation off the main thread
- **Vitest** — unit tests

## 4. Architecture (single-responsibility modules)

| Module | Responsibility |
|---|---|
| `data/catalog` | Fetch TLEs from Celestrak (active sats + Fengyun-1C, Cosmos-2251, Iridium-33 debris groups), normalize to a unified record, cache in localStorage, refresh every few hours |
| `worker/propagate` | Hold satrecs; on each tick compute current ECI positions for all objects → write to a transferable `Float32Array` → post to main thread |
| `scene/earth` | Dark night-lights Earth sphere + atmosphere glow; rotated by GMST so it aligns with the inertial object frame |
| `scene/objects` | One `THREE.Points` cloud; position attribute updated from the worker buffer; per-point color (facility=blue, debris=orange); glowing round-point shader |
| `scene/orbit-path` | For the selected object, sample one orbital period → draw a `Line` ring |
| `scene/picking` | GPU/raycast picking → object index under the cursor |
| `ui/sidebar` | Layer toggles (facilities, debris, orbit band LEO/MEO/GEO, debris cloud) + color legend |
| `ui/detail-panel` | Right slide-in: name, type, NORAD ID, altitude, speed, inclination, period — computed live |
| `app` | Wire data → worker → scene → UI; own selection + filter state |

## 5. Data model & classification

Unified record per object:

```ts
interface OrbitalObject {
  noradId: number;
  name: string;
  type: 'facility' | 'debris';
  group: string;            // celestrak group key, e.g. 'active', 'cosmos-2251-debris'
  orbitBand: 'LEO' | 'MEO' | 'GEO';
  tleLine1: string;
  tleLine2: string;
}
```

- **Facility** ← Celestrak `OBJECT_TYPE = PAYLOAD`
- **Debris** ← `OBJECT_TYPE = DEBRIS` or `ROCKET BODY`
- **Orbit band** ← derived from altitude / mean motion:
  - LEO < 2,000 km
  - MEO 2,000–35,586 km
  - GEO ≈ 35,786 km

Celestrak groups to fetch (exact keys verified at implementation):
`active`, `1999-025` (Fengyun-1C debris), `cosmos-2251-debris`, `iridium-33-debris`.

## 6. Data flow

```
Celestrak fetch
  → parse to satrecs + metadata
  → seed worker
  → worker propagates to "now" each tick
  → transferable Float32Array of positions
  → main thread updates Points geometry
  → render loop (OrbitControls + Earth GMST spin)
  → user clicks
  → picking
  → selection
  → detail panel (live values) + orbit path drawn
```

TLE refresh (every few hours) re-seeds the worker without a page reload.

## 7. Coordinate model

SGP4 yields **ECI** (Earth-Centered Inertial) positions. Objects are rendered in
ECI scene space (km, scaled down); the **Earth mesh is rotated by GMST** (Greenwich
Mean Sidereal Time) so the night-lights surface aligns with where objects actually
are. One source of truth — no per-frame coordinate juggling across 15k points.

## 8. Error handling

- **Fetch fails / offline** → fall back to last cached TLE in localStorage; show
  "using cached data from <time>" banner; if no cache, error + retry button.
- **CORS** → Celestrak `gp.php` JSON sends CORS headers; fallback is a bundled TLE
  snapshot so the app always renders something. (Primary external risk.)
- **Stale/invalid TLE** (SGP4 errors on a given object) → skip & flag that object,
  never crash the cloud.
- **No WebGL** → graceful message.

## 9. Testing

- TLE parse/normalize; classification (PAYLOAD→facility, DEBRIS/ROCKET BODY→debris).
- Orbit-band bucketing (LEO/MEO/GEO) at boundary altitudes.
- Derived values (altitude / period / speed) vs known objects (ISS ≈ 400 km / ≈ 92 min).
- Worker propagation matches a satellite.js reference within tolerance for a known TLE+time.
- Filter toggles change the visible set; click selects the nearest object.
- Framework: **Vitest**; follow TDD (write the failing test first).

## 10. Scope

**In (v1):** everything above.

**Out (future):** search-by-name + fly-to, time-scrubbing/playback, photoreal imagery,
ground stations & coverage cones, conjunction/collision warnings, full mobile-touch polish.

## 11. Open notes

- "~10k" target: `active` + the three debris clouds lands around **12–15k** objects in
  practice. Still smooth with the GPU point-cloud approach. (Accepted.)
