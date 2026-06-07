import { describe, it, expect } from 'vitest';
import { formatTooltip } from '../src/ui/tooltip';
import type { OrbitalObject } from '../src/types';

const iss: OrbitalObject = {
  noradId: 25544, name: 'ISS (ZARYA)', type: 'facility', group: 'stations',
  orbitBand: 'LEO', tleLine1: '', tleLine2: '',
};

describe('formatTooltip', () => {
  it('returns [name, "type · band · altitude"]', () => {
    const [title, sub] = formatTooltip(iss, 408.2);
    expect(title).toBe('ISS (ZARYA)');
    expect(sub).toBe('facility · LEO · 408 km');
  });
  it('shows — for non-finite altitude', () => {
    const [, sub] = formatTooltip({ ...iss, type: 'debris', orbitBand: 'GEO' }, NaN);
    expect(sub).toBe('debris · GEO · —');
  });
});
