import { describe, expect, it } from "vitest";
import { placeTooltip } from "./tooltip.ts";

const tip = { width: 100, height: 40 };
const window = { width: 800, height: 600 };

describe("placeTooltip", () => {
  it("sits above and to the right of the pointer", () => {
    expect(placeTooltip({ x: 300, y: 300 }, tip, window)).toEqual({
      x: 314,
      y: 248,
    });
  });

  it("flips to the left near the right edge", () => {
    expect(placeTooltip({ x: 750, y: 300 }, tip, window).x).toBe(636);
  });

  it("stays inside the left edge", () => {
    expect(
      placeTooltip({ x: 40, y: 300 }, { width: 900, height: 40 }, window).x,
    ).toBe(8);
  });

  it("goes below the pointer near the top", () => {
    expect(placeTooltip({ x: 300, y: 30 }, tip, window).y).toBe(48);
  });
});
