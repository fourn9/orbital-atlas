import { twoline2satrec } from 'satellite.js';
import type { OrbitalObject, ObjectType } from '../types';
import { classifyBand } from './classify';
import { kinematicsAt } from '../propagation/orbital-math';

// Julian date epoch -> JS Date.
function epochDate(jdsatepoch: number): Date {
  return new Date((jdsatepoch - 2440587.5) * 86400000);
}

// Build one OrbitalObject from a TLE triple. Returns null if it can't be parsed/propagated.
export function parseOne(
  name: string, l1: string, l2: string, group: string, type: ObjectType,
): OrbitalObject | null {
  try {
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) return null;
    const satrec = twoline2satrec(l1, l2);
    if (!satrec || satrec.error) return null;
    // Propagate at the element set's own epoch for an accurate banding altitude.
    const { altitudeKm } = kinematicsAt(satrec, epochDate(satrec.jdsatepoch));
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) return null;
    return {
      noradId: parseInt(l1.slice(2, 7), 10),
      name: name.replace(/^0 /, '').trim(),
      type,
      group,
      orbitBand: classifyBand(altitudeKm),
      tleLine1: l1,
      tleLine2: l2,
    };
  } catch {
    return null;
  }
}

// Parse Celestrak FORMAT=tle text: repeating (name line, line 1, line 2).
export function parseTle(text: string, group: string, type: ObjectType): OrbitalObject[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.length > 0);
  const out: OrbitalObject[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const obj = parseOne(lines[i], lines[i + 1], lines[i + 2], group, type);
    if (obj) out.push(obj);
  }
  return out;
}
