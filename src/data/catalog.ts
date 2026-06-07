import type { OrbitalObject } from '../types';
import { GROUPS, groupUrl } from './celestrak';
import { parseTle } from './parse';

const CACHE_KEY = 'orbital-atlas:catalog';
const REFRESH_MS = 3 * 60 * 60 * 1000; // 3 hours

interface Cache { ts: number; objects: OrbitalObject[]; }

function readCache(): Cache | null {
  const raw = localStorage.getItem(CACHE_KEY);
  return raw ? (JSON.parse(raw) as Cache) : null;
}

// Fetch all groups in parallel, tolerating per-group failures (rate limits, etc.).
// Throws only if EVERY group failed, so the caller can fall back to cache/snapshot.
async function fetchAll(): Promise<OrbitalObject[]> {
  const settled = await Promise.allSettled(
    GROUPS.map(async (g) => {
      const res = await fetch(groupUrl(g.key));
      if (!res.ok) throw new Error(`fetch ${g.key} failed: ${res.status}`);
      return parseTle(await res.text(), g.key, g.type);
    }),
  );
  const out: OrbitalObject[] = [];
  for (const r of settled) if (r.status === 'fulfilled') out.push(...r.value);
  if (out.length === 0) throw new Error('all group fetches failed');
  return out;
}

// Freshest catalog available: fresh cache, else network, else stale cache, else bundled snapshot.
export async function loadCatalog(): Promise<OrbitalObject[]> {
  const cache = readCache();
  if (cache && Date.now() - cache.ts < REFRESH_MS) return cache.objects;
  try {
    const objects = await fetchAll();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), objects }));
    } catch {
      /* over quota — skip caching, still return live data */
    }
    return objects;
  } catch {
    if (cache) return cache.objects;
    const res = await fetch('/tle-snapshot.txt');
    return parseTle(await res.text(), 'active', 'facility');
  }
}
