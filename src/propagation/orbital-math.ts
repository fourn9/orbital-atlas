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
  const r = pv!.position as { x: number; y: number; z: number };
  const v = pv!.velocity as { x: number; y: number; z: number };
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
