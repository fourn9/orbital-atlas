import type { ObjectType, OrbitBand } from '../types';

export function classifyType(objectType: string): ObjectType {
  return objectType.toUpperCase() === 'PAYLOAD' ? 'facility' : 'debris';
}

// GEO altitude ~35786 km; treat the MEO/GEO boundary at 35586 km.
export function classifyBand(altitudeKm: number): OrbitBand {
  if (altitudeKm < 2000) return 'LEO';
  if (altitudeKm < 35586) return 'MEO';
  return 'GEO';
}
