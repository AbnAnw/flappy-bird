export type PipeCsv = Readonly<{ gap_y: number; gap_height: number; time: number }>;

export type PipeLive = Readonly<{
  id: string;
  t0: number;
  gapY: number;   // px
  gapH: number;   // px
  scored: boolean;
  alive: boolean;
}>;

export type State = Readonly<{
  t: number;              // seconds elapsed
  lives: number;
  score: number;
  vy: number;             // px/s
  y: number;              // bird top-left y
  lastHitAt: number;      // ms
  gameEnd: boolean;
  pipes: readonly PipeLive[];
  passedAllPipes: boolean;
}>;

export type Rect = { x: number; y: number; w: number; h: number };

export type Sample = Readonly<{ t: number; y: number }>;
export type RunPath = readonly Sample[];
