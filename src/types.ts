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
