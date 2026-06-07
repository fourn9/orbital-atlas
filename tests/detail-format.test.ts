import { describe, it, expect } from 'vitest';
import { formatKinematics } from '../src/ui/detail-panel';

describe('formatKinematics', () => {
  it('formats values with units and sensible precision', () => {
    const rows = formatKinematics({ altitudeKm: 408.2, speedKmS: 7.66, periodMin: 92.7, inclinationDeg: 51.64 });
    expect(rows).toContainEqual(['Altitude', '408 km']);
    expect(rows).toContainEqual(['Speed', '7.66 km/s']);
    expect(rows).toContainEqual(['Period', '92.7 min']);
    expect(rows).toContainEqual(['Inclination', '51.6°']);
  });
});
