import { twoline2satrec } from 'satellite.js';
import type { SatRec } from 'satellite.js';
import { computePositions } from '../propagation/propagate-core';

let satrecs: SatRec[] = [];
let buffer: Float32Array = new Float32Array(0);

interface InitMsg { type: 'init'; tles: { l1: string; l2: string }[]; }
interface TickMsg { type: 'tick'; timeMs: number; }
type InMsg = InitMsg | TickMsg;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    satrecs = msg.tles.map((t) => twoline2satrec(t.l1, t.l2));
    buffer = new Float32Array(satrecs.length * 3);
  } else if (msg.type === 'tick') {
    computePositions(satrecs, new Date(msg.timeMs), buffer);
    const copy = buffer.slice();
    (self as unknown as Worker).postMessage({ type: 'positions', buffer: copy }, [copy.buffer]);
  }
};
