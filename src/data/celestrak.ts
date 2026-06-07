import type { ObjectType } from '../types';

export interface GroupSpec { key: string; type: ObjectType; label: string; }

// Celestrak's GP JSON omits TLE lines + OBJECT_TYPE, and the monolithic "active"
// group is heavily rate-limited. So we fetch a curated set of payload subgroups
// (facilities) + the major debris clouds via FORMAT=tle, and derive facility/debris
// from the group. The payload groups span LEO/MEO/GEO for good band diversity.
export const GROUPS: GroupSpec[] = [
  // Facilities (active payloads)
  { key: 'stations', type: 'facility', label: 'Space stations' },
  { key: 'starlink', type: 'facility', label: 'Starlink' },
  { key: 'oneweb', type: 'facility', label: 'OneWeb' },
  { key: 'science', type: 'facility', label: 'Science' },
  { key: 'weather', type: 'facility', label: 'Weather' },
  { key: 'gps-ops', type: 'facility', label: 'GPS' },
  { key: 'galileo', type: 'facility', label: 'Galileo' },
  { key: 'beidou', type: 'facility', label: 'BeiDou' },
  { key: 'glo-ops', type: 'facility', label: 'GLONASS' },
  { key: 'geo', type: 'facility', label: 'Geostationary' },
  // Debris clouds
  { key: '1999-025', type: 'debris', label: 'Fengyun-1C debris' },
  { key: 'cosmos-2251-debris', type: 'debris', label: 'Cosmos-2251 debris' },
  { key: 'iridium-33-debris', type: 'debris', label: 'Iridium-33 debris' },
];

const BASE = 'https://celestrak.org/NORAD/elements/gp.php';

export function groupUrl(key: string): string {
  return `${BASE}?GROUP=${encodeURIComponent(key)}&FORMAT=tle`;
}
