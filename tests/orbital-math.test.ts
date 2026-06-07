import { describe, it, expect } from 'vitest';
import { twoline2satrec } from 'satellite.js';
import { orbitalPeriodMin, kinematicsAt, gmstRadians } from '../src/propagation/orbital-math';

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
