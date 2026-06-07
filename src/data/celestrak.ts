// Celestrak GP (general perturbations) JSON endpoints. No auth required.
export const GROUPS = ['active', '1999-025', 'cosmos-2251-debris', 'iridium-33-debris'] as const;
export type GroupKey = (typeof GROUPS)[number];

const BASE = 'https://celestrak.org/NORAD/elements/gp.php';

export function groupUrl(group: GroupKey): string {
  return `${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
}

export interface GpRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  OBJECT_TYPE?: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
}
