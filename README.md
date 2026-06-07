# Orbital Atlas 🛰️

Interactive 3D viewer of Earth's orbital environment — live-propagated satellites,
stations, and debris on a dark night-Earth globe. Rotate 360°, zoom, click any
object for live details, filter layers, and trace orbit paths.

## Features
- **Live data** — real catalog from Celestrak (TLE), ~10k+ objects, propagated with SGP4
- **Live motion** — objects drift at their current real positions (1 Hz tick, in a Web Worker)
- **Facilities vs debris** — payload constellations (blue) vs debris clouds (orange)
- **Interactive** — 360° rotate + zoom, click for details (altitude / speed / period / inclination),
  layer filters (facility/debris + LEO/MEO/GEO) with legend, orbit-path rings
- **Resilient** — parallel fetch tolerant of rate limits, localStorage cache, bundled offline snapshot

## Stack
Vite · TypeScript · Three.js · satellite.js (SGP4) · Web Worker · Vitest

## Run
```bash
npm install
npm run dev      # dev server (open the printed URL)
npm run build    # production build -> dist/
npm test         # unit tests (21 passing)
```

## How it works
SGP4 propagation runs in a Web Worker and streams positions to the main thread as a
transferable `Float32Array`; Three.js renders the Earth plus a single GPU point cloud
(one draw call for all objects). SGP4/TEME positions are Z-up, so they're remapped to
Three.js's Y-up frame and the Earth is spun by GMST (sidereal time) to keep its surface
aligned with the orbital frame. Facility/debris is derived from the Celestrak group;
orbit band (LEO/MEO/GEO) from each object's altitude at its TLE epoch.

## Docs
- Design spec — `docs/superpowers/specs/2026-06-07-orbital-atlas-design.md`
- Implementation plan — `docs/superpowers/plans/2026-06-07-orbital-atlas.md`
