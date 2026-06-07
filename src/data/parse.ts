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
