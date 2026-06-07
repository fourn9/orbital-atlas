import type { OrbitalObject, ObjectKinematics } from '../types';

export function formatKinematics(k: ObjectKinematics): [string, string][] {
  const num = (v: number, digits: number, unit: string): string =>
    Number.isFinite(v) ? `${digits === 0 ? Math.round(v) : v.toFixed(digits)} ${unit}` : `— ${unit}`;
  return [
    ['Altitude', num(k.altitudeKm, 0, 'km')],
    ['Speed', num(k.speedKmS, 2, 'km/s')],
    ['Period', num(k.periodMin, 1, 'min')],
    ['Inclination', Number.isFinite(k.inclinationDeg) ? `${k.inclinationDeg.toFixed(1)}°` : '—°'],
  ];
}

export interface DetailPanel {
  show: (obj: OrbitalObject, k: ObjectKinematics) => void;
  update: (k: ObjectKinematics) => void;
  hide: () => void;
}

export function createDetailPanel(parent: HTMLElement, onClose: () => void): DetailPanel {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;right:0;top:0;bottom:0;width:280px;padding:18px;transform:translateX(100%);' +
    'transition:transform .25s ease;background:rgba(10,16,32,.9);border-left:1px solid rgba(127,208,255,.4);' +
    'backdrop-filter:blur(6px);font:13px system-ui;color:#cfe0ff;z-index:10;';

  // Structure built once; untrusted catalog name is set via textContent (no innerHTML → no XSS).
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'float:right;background:none;border:none;color:#9fb4e6;font-size:18px;cursor:pointer;';
  closeBtn.onclick = onClose;

  const titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0 0 2px;font-size:15px;';
  const metaEl = document.createElement('div');
  metaEl.style.cssText = 'opacity:.6;margin-bottom:12px;';
  el.append(closeBtn, titleEl, metaEl);

  // Fixed rows, in the same order formatKinematics returns.
  const valEls = ['Altitude', 'Speed', 'Period', 'Inclination'].map((label) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;margin:6px 0;';
    const k = document.createElement('span');
    k.style.opacity = '.6';
    k.textContent = label;
    const v = document.createElement('span');
    row.append(k, v);
    el.append(row);
    return v;
  });
  parent.appendChild(el);

  let current: OrbitalObject | null = null;
  const render = (obj: OrbitalObject, kin: ObjectKinematics) => {
    titleEl.textContent = obj.name;
    metaEl.textContent = `${obj.type} · NORAD ${obj.noradId} · ${obj.orbitBand}`;
    const vals = formatKinematics(kin);
    valEls.forEach((vEl, i) => { vEl.textContent = vals[i][1]; });
  };

  return {
    show: (obj, k) => { current = obj; render(obj, k); el.style.transform = 'translateX(0)'; },
    update: (k) => { if (current) render(current, k); },
    hide: () => { current = null; el.style.transform = 'translateX(100%)'; },
  };
}
