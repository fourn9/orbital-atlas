import { describe, it, expect } from 'vitest';
import { classifyBand } from '../src/data/classify';

describe('classifyBand', () => {
  it('LEO below 2000 km', () => expect(classifyBand(550)).toBe('LEO'));
  it('MEO between 2000 and 35586 km', () => expect(classifyBand(20200)).toBe('MEO'));
  it('GEO at ~35786 km', () => expect(classifyBand(35786)).toBe('GEO'));
});
