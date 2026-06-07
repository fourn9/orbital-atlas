import type { OrbitBand } from '../types';

// GEO altitude ~35786 km; treat the MEO/GEO boundary at 35586 km (200 km below GEO).
export function classifyBand(altitudeKm: number): OrbitBand {
  if (altitudeKm < 2000) return 'LEO';
  if (altitudeKm < 35586) return 'MEO';
  return 'GEO';
}
