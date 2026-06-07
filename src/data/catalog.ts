import type { OrbitalObject } from '../types';
import { GROUPS, groupUrl, type GpRecord } from './celestrak';
import { parseRecord } from './parse';

const CACHE_KEY = 'orbital-atlas:catalog';
const REFRESH_MS = 3 * 60 * 60 * 1000; // 3 hours

interface Cache { ts: number; objects: OrbitalObject[]; }

function readCache(): Cache | null {
  const raw = localStorage.getItem(CACHE_KEY);
  return raw ? (JSON.parse(raw) as Cache) : null;
}

async function fetchAll(): Promise<OrbitalObject[]> {
  const out: OrbitalObject[] = [];
  for (const group of GROUPS) {
    const res = await fetch(groupUrl(group));
    if (!res.ok) throw new Error(`fetch ${group} failed: ${res.status}`);
    const records = (await res.json()) as GpRecord[];
    for (const rec of records) {
      const obj = parseRecord(rec, group);
      if (obj) out.push(obj);
    }
  }
  return out;
}

// Returns the freshest catalog available: fresh cache, else network, else stale cache, else bundled snapshot.
export async function loadCatalog(): Promise<OrbitalObject[]> {
  const cache = readCache();
  if (cache && Date.now() - cache.ts < REFRESH_MS) return cache.objects;
  try {
    const objects = await fetchAll();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), objects }));
    return objects;
  } catch (err) {
    if (cache) return cache.objects;
    const res = await fetch('/tle-snapshot.json');
    const records = (await res.json()) as GpRecord[];
    return records.map((r) => parseRecord(r, 'active')).filter((o): o is OrbitalObject => o !== null);
  }
}
