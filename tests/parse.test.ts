import { describe, it, expect } from 'vitest';
import { parseOne, parseTle } from '../src/data/parse';

const NAME = 'ISS (ZARYA)';
const L1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000';
const L2 = '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000';

describe('parseOne', () => {
  it('builds an OrbitalObject with the given type and a derived band', () => {
    const obj = parseOne(NAME, L1, L2, 'active', 'facility');
    expect(obj).not.toBeNull();
    expect(obj!.noradId).toBe(25544);
    expect(obj!.name).toBe('ISS (ZARYA)');
    expect(obj!.type).toBe('facility');
    expect(obj!.group).toBe('active');
    expect(obj!.orbitBand).toBe('LEO');
    expect(obj!.tleLine1).toBe(L1);
  });
  it('returns null for garbage lines', () => {
    expect(parseOne('JUNK', 'garbage', 'garbage', 'active', 'debris')).toBeNull();
  });
});

describe('parseTle', () => {
  it('parses a multi-object TLE block and tags every object with type + group', () => {
    const text = [NAME, L1, L2, NAME, L1, L2].join('\n');
    const objs = parseTle(text, 'iridium-33-debris', 'debris');
    expect(objs.length).toBe(2);
    expect(objs.every((o) => o.type === 'debris' && o.group === 'iridium-33-debris')).toBe(true);
  });
  it('skips malformed triples without throwing', () => {
    const text = ['BAD', 'not a tle line', 'also not', NAME, L1, L2].join('\n');
    const objs = parseTle(text, 'active', 'facility');
    expect(objs.length).toBe(1);
    expect(objs[0].noradId).toBe(25544);
  });
});
