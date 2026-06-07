import { describe, it, expect } from 'vitest';
import { classifyType, classifyBand } from '../src/data/classify';

describe('classifyType', () => {
  it('maps PAYLOAD to facility', () => expect(classifyType('PAYLOAD')).toBe('facility'));
  it('maps DEBRIS to debris', () => expect(classifyType('DEBRIS')).toBe('debris'));
  it('maps ROCKET BODY to debris', () => expect(classifyType('ROCKET BODY')).toBe('debris'));
  it('maps UNKNOWN to debris', () => expect(classifyType('UNKNOWN')).toBe('debris'));
});

describe('classifyBand', () => {
  it('LEO below 2000 km', () => expect(classifyBand(550)).toBe('LEO'));
  it('MEO between 2000 and 35586 km', () => expect(classifyBand(20200)).toBe('MEO'));
  it('GEO at ~35786 km', () => expect(classifyBand(35786)).toBe('GEO'));
});
