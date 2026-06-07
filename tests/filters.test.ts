import { describe, it, expect } from 'vitest';
import { computeMask } from '../src/ui/sidebar';
import type { OrbitalObject, FilterState } from '../src/types';

const objs: OrbitalObject[] = [
  { noradId: 1, name: 'Sat', type: 'facility', group: 'active', orbitBand: 'LEO', tleLine1: '', tleLine2: '' },
  { noradId: 2, name: 'Junk', type: 'debris', group: 'iridium-33-debris', orbitBand: 'GEO', tleLine1: '', tleLine2: '' },
];
const all: FilterState = { facility: true, debris: true, bands: { LEO: true, MEO: true, GEO: true } };

describe('computeMask', () => {
  it('shows everything when all filters on', () => expect(computeMask(objs, all)).toEqual([true, true]));
  it('hides debris when debris off', () => {
    expect(computeMask(objs, { ...all, debris: false })).toEqual([true, false]);
  });
  it('hides GEO band when GEO off', () => {
    expect(computeMask(objs, { ...all, bands: { LEO: true, MEO: true, GEO: false } })).toEqual([true, false]);
  });
});
