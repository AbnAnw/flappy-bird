import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";


// all units relative to canvas width/height
type Pipe = Readonly<{
    gap_y: number;
    gap_height: number;
    time: number;
}>;

// ---------- Deterministic RNG (optional) ----------
// Parse CLI args like: --seed=42 --count=24 --spacing=1.6
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.split("=");
    return [k.replace(/^--/, ""), v];
  }),
);

// Optional deterministic seed
const SEED = args.seed !== undefined ? Number(args.seed) : undefined;

let seed = (SEED ?? 0) >>> 0;
const randU32 = () => (seed = (1103515245 * seed + 12345) >>> 0);
const rand = () => (SEED === undefined ? Math.random() : randU32() / 0xffffffff);

const randRange = (min: number, max: number): number =>
  rand() * (max - min) + min;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

const generatePipeCSV = ({
  count,
  startPos = 2,
  posInterval = 2,
  minGapY = 0.2,
  maxGapY = 0.8,
  // birb height ~ 0.075
  minGapHeight = 0.2,
  maxGapHeight = 0.3,
  // NEW: keep the gap centre away from edges
  margin = 0.06,
}: {
  count: number;
  startPos?: number;
  posInterval?: number;
  duration?: number; // kept for compatibility; unused
  minGapY?: number;
  maxGapY?: number;
  minGapHeight?: number;
  maxGapHeight?: number;
  margin?: number;
}): string => {
  const pipes: readonly Pipe[] = Array.from({ length: count }, (_, i) => {
    const gap_height = clamp(randRange(minGapHeight, maxGapHeight), 0.05, 0.95);

    // Keep the centre within safe bounds considering gap height + margin
    const lo = clamp(minGapY + gap_height / 2 + margin, 0, 1);
    const hi = clamp(maxGapY - gap_height / 2 - margin, 0, 1);
    const gap_y = clamp(randRange(lo, hi), 0, 1);

    const time = startPos + i * posInterval;
    return { gap_y, gap_height, time };
  });

  return [
    ["gap_y", "gap_height", "time"],
    ...pipes.map(({ gap_y, gap_height, time }) => [
      gap_y.toFixed(5),
      gap_height.toFixed(5),
      time.toFixed(3),
    ]),
  ]
    .map(xs => xs.join(","))
    .join("\n");
};


// --- Main Program ---
const outputFile = new URL("./assets/map.csv", import.meta.url);
mkdirSync(dirname(fileURLToPath(outputFile)), { recursive: true });

const csv = generatePipeCSV({
  count: Number(args.count ?? 20),
  startPos: Number(args.start ?? 2),
  posInterval: Number(args.spacing ?? 1.75),
  minGapY: Number(args.minGapY ?? 0.2),
  maxGapY: Number(args.maxGapY ?? 0.8),
  minGapHeight: Number(args.minGapH ?? 0.20),
  maxGapHeight: Number(args.maxGapH ?? 0.30),
  margin: Number(args.margin ?? 0.06),
});

writeFileSync(outputFile, csv);
console.log(
  `CSV written to ${fileURLToPath(outputFile)} (count=${args.count ?? 20}${
    SEED !== undefined ? `, seed=${SEED}` : ""
  })`
);
