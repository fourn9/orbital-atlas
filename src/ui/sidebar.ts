import type { OrbitalObject, FilterState } from '../types';

// An object is visible only if BOTH its type and its band are enabled.
export function computeMask(objects: OrbitalObject[], filters: FilterState): boolean[] {
  return objects.map((o) => filters[o.type] && filters.bands[o.orbitBand]);
}

export interface Sidebar { el: HTMLElement; }

export function createSidebar(
  parent: HTMLElement,
  initial: FilterState,
  onChange: (f: FilterState) => void,
): Sidebar {
  const state: FilterState = structuredClone(initial);
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:0;top:0;bottom:0;width:240px;padding:16px;' +
    'background:rgba(10,16,32,.82);border-right:1px solid rgba(120,160,255,.25);' +
    'backdrop-filter:blur(6px);font:13px system-ui;color:#cfe0ff;z-index:10;';

  function checkbox(label: string, checked: boolean, swatch: string, onToggle: (v: boolean) => void) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer;';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = checked;
    box.onchange = () => { onToggle(box.checked); onChange(structuredClone(state)); };
    const dot = document.createElement('span');
    dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${swatch};box-shadow:0 0 6px ${swatch};`;
    row.append(box, dot, document.createTextNode(label));
    return row;
  }

  el.innerHTML = '<h3 style="margin:0 0 4px;font-size:13px;letter-spacing:.5px;">ORBITAL ATLAS</h3>' +
    '<div style="opacity:.6;margin-bottom:12px;">Layers</div>';
  el.append(
    checkbox('Facilities', state.facility, '#7fd0ff', (v) => (state.facility = v)),
    checkbox('Debris', state.debris, '#ff9a4d', (v) => (state.debris = v)),
  );
  const bandHdr = document.createElement('div');
  bandHdr.style.cssText = 'opacity:.6;margin:12px 0 4px;'; bandHdr.textContent = 'Orbit band';
  el.append(bandHdr);
  (['LEO', 'MEO', 'GEO'] as const).forEach((b) =>
    el.append(checkbox(b, state.bands[b], '#9fb4e6', (v) => (state.bands[b] = v))),
  );
  parent.appendChild(el);
  return { el };
}
