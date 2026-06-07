import type { OrbitalObject } from '../types';

// Pure: [title, subtitle] for the hover tooltip.
export function formatTooltip(obj: OrbitalObject, altitudeKm: number): [string, string] {
  const alt = Number.isFinite(altitudeKm) ? `${Math.round(altitudeKm)} km` : '—';
  return [obj.name, `${obj.type} · ${obj.orbitBand} · ${alt}`];
}

export interface Tooltip {
  show: (obj: OrbitalObject, altitudeKm: number, x: number, y: number) => void;
  hide: () => void;
}

export function createTooltip(parent: HTMLElement): Tooltip {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;pointer-events:none;z-index:20;display:none;max-width:240px;' +
    'padding:6px 9px;border-radius:6px;font:12px system-ui;color:#eaf1ff;white-space:nowrap;' +
    'background:rgba(8,12,26,.92);border:1px solid rgba(127,208,255,.45);box-shadow:0 2px 10px rgba(0,0,0,.5);';

  // Structure built once; only textContent is updated (no innerHTML with feed data → no XSS).
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-weight:600;margin-bottom:2px;';
  const subEl = document.createElement('div');
  subEl.style.opacity = '.85';
  const typeEl = document.createElement('span');
  typeEl.style.textTransform = 'capitalize';
  const restEl = document.createElement('span');
  subEl.append(typeEl, restEl);
  el.append(titleEl, subEl);
  parent.appendChild(el);

  return {
    show: (obj, altitudeKm, x, y) => {
      const [title, sub] = formatTooltip(obj, altitudeKm);
      titleEl.textContent = title;                       // untrusted catalog name → textContent
      typeEl.textContent = obj.type;
      typeEl.style.color = obj.type === 'facility' ? '#7fd0ff' : '#ff9a4d';
      restEl.textContent = ` · ${obj.orbitBand} · ${sub.split(' · ').pop()}`;
      el.style.display = 'block';
      el.style.left = Math.min(x + 14, window.innerWidth - el.offsetWidth - 8) + 'px';
      el.style.top = Math.min(y + 14, window.innerHeight - el.offsetHeight - 8) + 'px';
    },
    hide: () => { el.style.display = 'none'; },
  };
}
