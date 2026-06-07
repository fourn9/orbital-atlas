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
