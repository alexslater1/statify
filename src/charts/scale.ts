// Scales shared by the charts

/**
 * Round tick values from 0 to at least `max`, about `count` steps apart, each
 * step 1, 2, 2.5 or 5 times a power of ten.
 */
export function niceTicks(max: number, count = 4): number[] {
  const raw = Math.max(max, 1e-9) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const n = raw / power;
  const step =
    (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * power;
  const ticks = [0];
  // Rounded as it goes, so steps like 0.1 don't drift
  while (ticks[ticks.length - 1] < max) {
    ticks.push(Number((ticks.length * step).toPrecision(12)));
  }
  return ticks;
}

/** Up to STEPS shades of the green scale, --seq-1 to --seq-7. */
export const STEPS = 7;

/** Values sorted into shades. */
export interface Bins {
  /** Where each bin after the first starts. */
  cuts: number[];
  /** The shade for a value: 0 for none, else 1 to STEPS, darkest last. */
  step(value: number): number;
}

/**
 * Splits values into up to STEPS bins holding about as many values each,
 * ignoring zeros. Cuts are rounded to two significant figures so a legend
 * reads cleanly, and tied cuts merge, so there can be fewer bins.
 */
export function quantileBins(values: number[]): Bins {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const cuts = [
    ...new Set(
      Array.from({ length: STEPS - 1 }, (_, i) => {
        const v = sorted[Math.floor((sorted.length * (i + 1)) / STEPS)] ?? 0;
        return Number(v.toPrecision(2));
      }),
    ),
  ].filter((cut) => cut > 0);
  // With fewer bins, use the darker shades, which stand out from "none"
  const offset = STEPS - (cuts.length + 1);
  return {
    cuts,
    step(value) {
      if (value <= 0) return 0;
      let bin = 1;
      while (bin <= cuts.length && value >= cuts[bin - 1]) bin++;
      return offset + bin;
    },
  };
}

/** The fill for a value: the empty shade, or one of the green ones. */
export function shade(bins: Bins, value: number): string {
  const step = bins.step(value);
  return step === 0 ? "var(--empty)" : `var(--seq-${step})`;
}
