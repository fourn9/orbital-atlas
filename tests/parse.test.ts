import { describe, it, expect } from 'vitest';
import { parseRecord } from '../src/data/parse';

const iss = {
  OBJECT_NAME: 'ISS (ZARYA)',
  NORAD_CAT_ID: 25544,
  OBJECT_TYPE: 'PAYLOAD',
  TLE_LINE1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  TLE_LINE2: '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
};

describe('parseRecord', () => {
  it('builds an OrbitalObject with facility type and a band', () => {
    const obj = parseRecord(iss, 'active');
    expect(obj!.noradId).toBe(25544);
    expect(obj!.name).toBe('ISS (ZARYA)');
    expect(obj!.type).toBe('facility');
    expect(obj!.group).toBe('active');
    expect(obj!.orbitBand).toBe('LEO');
  });

  it('returns null for a record with an unparseable TLE', () => {
    const bad = { ...iss, TLE_LINE1: 'garbage', TLE_LINE2: 'garbage' };
    expect(parseRecord(bad, 'active')).toBeNull();
  });
});
