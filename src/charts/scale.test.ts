import { describe, expect, it } from "vitest";
import { niceTicks, quantileBins, shade, STEPS } from "./scale.ts";

describe("niceTicks", () => {
  it.each([
    [100, [0, 25, 50, 75, 100]],
    [101, [0, 50, 100, 150]],
    [7, [0, 2, 4, 6, 8]],
    [0.3, [0, 0.1, 0.2, 0.3]],
    [3408, [0, 1000, 2000, 3000, 4000]],
    [0, [0]],
  ])("goes past %d in round steps", (max, ticks) => {
    expect(niceTicks(max)).toEqual(ticks);
  });
});

describe("quantileBins", () => {
  const values = Array.from({ length: 70 }, (_, i) => i + 1);

  it("cuts where each bin starts, at 2 significant figures", () => {
    expect(quantileBins(values).cuts).toEqual([11, 21, 31, 41, 51, 61]);
    expect(quantileBins(values.map((v) => v * 1.234)).cuts).toEqual([
      14, 26, 38, 51, 63, 75,
    ]);
  });

  it("gives none for zero, then shades from 1 to STEPS", () => {
    const { step } = quantileBins(values);
    expect([0, 1, 10.9, 11, 20, 21, 60, 61, 70, 1000].map(step)).toEqual([
      0, 1, 1, 2, 2, 3, 6, 7, 7, 7,
    ]);
    expect(STEPS).toBe(7);
  });

  it("ignores zeros when cutting", () => {
    expect(quantileBins([0, 0, 0, ...values]).cuts).toEqual(
      quantileBins(values).cuts,
    );
  });

  it("uses the darker shades when values tie into fewer bins", () => {
    const bins = quantileBins([5, 5, 5, 5, 5, 5, 5, 50]);
    expect(bins.cuts).toEqual([5]);
    expect([1, 5, 50].map(bins.step)).toEqual([6, 7, 7]);
  });

  it("gives one shade, the darkest, when there's nothing to cut", () => {
    expect(quantileBins([]).cuts).toEqual([]);
    expect(quantileBins([3]).step(3)).toBe(7);
  });
});

describe("shade", () => {
  it("fills with the empty shade or a green one", () => {
    const bins = quantileBins(Array.from({ length: 70 }, (_, i) => i + 1));
    expect(shade(bins, 0)).toBe("var(--empty)");
    expect(shade(bins, 1)).toBe("var(--seq-1)");
    expect(shade(bins, 70)).toBe("var(--seq-7)");
  });
});
