import "./style.css";
import { catchError, filter, fromEvent, merge, of, share, switchMap, take, takeUntil, map } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { createRenderer } from "./view";
import { state$ } from "./state";
import type { RunPath, Sample } from "./types";

if (typeof window !== "undefined") {
  const { protocol, hostname, port } = new URL(import.meta.url);
  const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  const csvUrl = `${baseUrl}/assets/map.csv`;

  const csv$ = fromFetch(csvUrl).pipe(
    switchMap(r => (r.ok ? r.text() : of("gap_y,gap_height,time\n0.5,0.25,1"))),
    catchError(err => {
      console.error("Error fetching the CSV file:", err);
      return of("gap_y,gap_height,time\n0.5,0.25,1");
    }),
    share(),
  );

  const firstClick$ = fromEvent(document.body, "mousedown").pipe(take(1));
  const restart$   = fromEvent<KeyboardEvent>(document, "keydown").pipe(filter(e => e.code === "KeyR"));
  const start$     = merge(firstClick$, restart$);

  // session-persistent ghost runs
  const ghostRuns: RunPath[] = [];
  const render = createRenderer({ getGhostRuns: () => ghostRuns });

  csv$.pipe(
    switchMap(contents =>
      start$.pipe(
        switchMap(() => {
          const s$ = state$(contents).pipe(share());

          // record trajectory until game ends (vanish at death)
          const currentRun: Sample[] = [];
          const end$ = s$.pipe(filter(s => s.gameEnd), take(1));

          s$.pipe(
            map(s => ({ t: s.t, y: s.y })),
            takeUntil(end$)
          ).subscribe(p => currentRun.push(p));

          end$.subscribe(() => {
            ghostRuns.push(currentRun.map(p => ({ ...p })));
          });

          return s$;
        })
      )
    )
  ).subscribe(render);
}
export { state$ };

