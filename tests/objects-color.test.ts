import { describe, it, expect } from 'vitest';
import { colorFor } from '../src/scene/objects';

describe('colorFor', () => {
  it('facility is blue-ish (b > r)', () => {
    const c = colorFor('facility');
    expect(c[2]).toBeGreaterThan(c[0]);
  });
  it('debris is orange-ish (r > b)', () => {
    const c = colorFor('debris');
    expect(c[0]).toBeGreaterThan(c[2]);
  });
});
