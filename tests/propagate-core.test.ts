import { describe, it, expect } from 'vitest';
import { twoline2satrec } from 'satellite.js';
import { computePositions, SCENE_SCALE } from '../src/propagation/propagate-core';

const satrec = twoline2satrec(
  '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
);

describe('computePositions', () => {
  it('fills x,y,z for each satrec at the given date', () => {
    const out = new Float32Array(3);
    computePositions([satrec], new Date('2024-01-01T12:00:00Z'), out);
    const radius = Math.hypot(out[0], out[1], out[2]) / SCENE_SCALE; // back to km
    expect(radius).toBeGreaterThan(6600);
    expect(radius).toBeLessThan(6900);
  });

  it('writes 0,0,0 for an object that fails to propagate', () => {
    const broken = { ...satrec, error: 1 } as typeof satrec;
    const out = new Float32Array(3).fill(9);
    computePositions([broken], new Date('2024-01-01T12:00:00Z'), out);
    expect([out[0], out[1], out[2]]).toEqual([0, 0, 0]);
  });
});
