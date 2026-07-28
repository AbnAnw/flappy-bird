import { interval, fromEvent, map, share, filter, tap, merge, scan, startWith } from "rxjs";
import type { PipeCsv, PipeLive, Rect, State } from "./types";
import { Birb, Physics, Pipes, Viewport, bounceVelocity, clamp, parseCsv, pipeXAt, rectsOverlap } from "./util";

/** initial state */
export const initialState: State = {
  t: 0,
  lives: 3,
  score: 0,
  vy: 0,
  y: (Viewport.CANVAS_HEIGHT - Birb.HEIGHT) / 2,
  lastHitAt: -1e9,
  gameEnd: false,
  pipes: [],
  passedAllPipes: false,
};

export const state$ = (csvContents: string) => {
  const spec = parseCsv(csvContents);
  const tick$ = interval(Physics.TICK_MS).pipe(share());
  const keyDown$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(e => e.code === "Space" && !e.repeat),
    tap(e => e.preventDefault()),
    share(),
  );

  const tickReducer$ = tick$.pipe(
    map(() => (s: State): State => {
      if (s.gameEnd) return s;

      const dt = Physics.TICK_MS / 1000;

      // project pipes for this frame
      const livePipes: PipeLive[] = spec
        .map((pc, i) => {
          const id = `p${i}`;
          const gapY = pc.gap_y * Viewport.CANVAS_HEIGHT;
          const gapH = pc.gap_height * Viewport.CANVAS_HEIGHT;
          const x = pipeXAt(s.t + dt, pc.time);
          const alive = (s.t + dt) >= pc.time && (x + Pipes.WIDTH) >= 0;
          const prev = s.pipes.find(pp => pp.id === id) ?? null;
          const scored = prev ? prev.scored : false;
          return { id, t0: pc.time, gapY, gapH, scored, alive };
        })
        .filter(p => p.alive);

      // physics
      const vy = s.vy + Physics.GRAVITY * dt;
      let y = s.y + vy * dt;

      // collisions
      const nowMs = performance.now();
      const invuln = nowMs - s.lastHitAt < Physics.INVULN_MS;

      let collided = false;
      let bounceDir: "up" | "down" | null = null;

      if (!invuln) {
        if (y < 0) { y = 0; collided = true; bounceDir = "down"; }
        else if (y + Birb.HEIGHT > Viewport.CANVAS_HEIGHT) {
          y = Viewport.CANVAS_HEIGHT - Birb.HEIGHT; collided = true; bounceDir = "up";
        } else {
          const birdRect: Rect = { x: Birb.X - Birb.WIDTH / 2, y, w: Birb.WIDTH, h: Birb.HEIGHT };
          for (const p of livePipes) {
            const gapTop = p.gapY - p.gapH / 2;
            const gapBot = p.gapY + p.gapH / 2;
            const x = pipeXAt(s.t + dt, p.t0);
            const topRect: Rect = { x, y: 0, w: Pipes.WIDTH, h: Math.max(0, gapTop) };
            const botRect: Rect = { x, y: gapBot, w: Pipes.WIDTH, h: Math.max(0, Viewport.CANVAS_HEIGHT - gapBot) };
            if (rectsOverlap(birdRect, topRect)) { collided = true; bounceDir = "down"; break; }
            if (rectsOverlap(birdRect, botRect)) { collided = true; bounceDir = "up"; break; }
          }
        }
      }

      let lives = s.lives;
      let vyAfter = vy;
      let lastHitAt = s.lastHitAt;
      if (collided && !invuln) {
        lives = Math.max(0, lives - 1);
        vyAfter = bounceVelocity(s.t + dt, bounceDir!);
        lastHitAt = nowMs;
      }

      // scoring
      let score = s.score;
      const updatedPipes = livePipes.map(p => {
        const x = pipeXAt(s.t + dt, p.t0);
        const centerX = x + Pipes.WIDTH / 2;
        if (!p.scored && centerX < Birb.X - Birb.WIDTH / 2) {
          score += 1;
          return { ...p, scored: true };
        }
        return p;
      });

      const lastSpec = spec[spec.length - 1];
      const allGone =
        spec.length > 0 &&
        (s.t + dt) >
          (lastSpec.time + (Viewport.CANVAS_WIDTH + Pipes.WIDTH) / Pipes.SPEED);
      const passedAllPipes = updatedPipes.length === 0 && allGone;
      const gameEnd = lives <= 0 || passedAllPipes;

      return {
        ...s,
        t: s.t + dt,
        y: clamp(y, 0, Viewport.CANVAS_HEIGHT - Birb.HEIGHT),
        vy: vyAfter,
        lastHitAt,
        lives,
        score,
        pipes: updatedPipes,
        passedAllPipes,
        gameEnd,
      };
    })
  );

  const flapReducer$ = keyDown$.pipe(
    map(() => (s: State): State =>
      s.gameEnd ? s : { ...s, vy: Birb.FLAP_VY }),
  );

  return merge(tickReducer$, flapReducer$).pipe(
    scan((s, r) => r(s), initialState),
    startWith(initialState),
  );
};
