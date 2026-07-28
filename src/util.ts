import type { PipeCsv, Rect, RunPath } from "./types";

/** Constants */
export const Viewport = { CANVAS_WIDTH: 600, CANVAS_HEIGHT: 400 } as const;

export const Birb = {
  WIDTH: 42,
  HEIGHT: 30,
  X: Math.floor(0.3 * Viewport.CANVAS_WIDTH),
  FLAP_VY: -250, // px/s impulse upward
} as const;

export const Pipes = {
  WIDTH: 50,
  SPEED: 140, // px/s to the left
} as const;

export const Physics = {
  GRAVITY: 900,       // px/s^2
  TICK_MS: 1000 / 60, // 60 FPS
  INVULN_MS: 350,     // grace after hit to avoid multi-count
} as const;

/** Small helpers */
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const rngHash = (seed: number) => (1103515245 * seed + 12345) >>> 0;
/** exact uniform [0,1) */
const rngFloat = (seed: number) => rngHash(seed) / 0x100000000;

/** Return bounce vy, screen coords (up = negative) */
export const bounceVelocity = (seedSeconds: number, dir: "up" | "down") => {
  const r = rngFloat(Math.floor(seedSeconds * 1000));
  const mag = 250 + 120 * r;
  return dir === "up" ? -mag : mag;
};

export const parseCsv = (text: string): readonly PipeCsv[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  return lines
    .slice(1)
    .map(l => l.split(",").map(s => Number(s.trim())))
    .filter(xs => xs.length === 3 && xs.every(Number.isFinite))
    .map(([gap_y, gap_height, time]) => ({ gap_y, gap_height, time }));
};

export const pipeXAt = (elapsed: number, t0: number) =>
  elapsed >= t0 ? Viewport.CANVAS_WIDTH - Pipes.SPEED * (elapsed - t0) : Viewport.CANVAS_WIDTH;

export const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Linear interpolate y at time t from a sampled path; null when ended */
export const interpY = (path: RunPath, t: number): number | null => {
  if (path.length === 0) return null;
  if (t < path[0].t) return path[0].y;
  if (t >= path[path.length - 1].t) return null; // vanish at death moment

  let lo = 0, hi = path.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    (path[mid].t <= t ? (lo = mid) : (hi = mid));
  }
  const a = path[lo], b = path[hi];
  const u = (t - a.t) / (b.t - a.t);
  return a.y + u * (b.y - a.y);
};
