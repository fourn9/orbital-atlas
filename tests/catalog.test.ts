import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCatalog } from '../src/data/catalog';

const sample = [{
  OBJECT_NAME: 'ISS (ZARYA)', NORAD_CAT_ID: 25544, OBJECT_TYPE: 'PAYLOAD',
  TLE_LINE1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9000',
  TLE_LINE2: '2 25544  51.6400 208.0000 0006703 130.0000 325.0000 15.50000000 10000',
}];

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('loadCatalog', () => {
  it('fetches groups, parses, and caches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => sample })));
    const objs = await loadCatalog();
    expect(objs.length).toBeGreaterThan(0);
    expect(localStorage.getItem('orbital-atlas:catalog')).not.toBeNull();
  });

  it('falls back to cache when fetch fails', async () => {
    localStorage.setItem('orbital-atlas:catalog', JSON.stringify({
      ts: Date.now(),
      objects: [{ noradId: 1, name: 'X', type: 'facility', group: 'active', orbitBand: 'LEO', tleLine1: 'a', tleLine2: 'b' }],
    }));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const objs = await loadCatalog();
    expect(objs[0].name).toBe('X');
  });
});
