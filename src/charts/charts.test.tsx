import { describe, expect, it } from "vitest";
import { html, text } from "../test/render.tsx";
import { RankedBars } from "./RankedBars.tsx";
import { quantileBins } from "./scale.ts";
import { ScaleLegend } from "./ScaleLegend.tsx";

describe("ScaleLegend", () => {
  const bins = quantileBins(Array.from({ length: 70 }, (_, i) => i + 1));

  it("gives the empty shade, then each shade with the cuts between", () => {
    expect(
      text(<ScaleLegend bins={bins} unit="min" none="No listening" />),
    ).toBe(" No listening 11 21 31 41 51 61 min ");
  });

  it("shades from light to dark, using the darkest when there are fewer", () => {
    const shades = (b: typeof bins) =>
      [
        ...html(<ScaleLegend bins={b} unit="h" none="None" />).matchAll(
          /var\(--seq-(\d)\)/g,
        ),
      ].map((m) => Number(m[1]));
    expect(shades(bins)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(shades(quantileBins([5, 5, 5, 5, 5, 5, 5, 50]))).toEqual([6, 7]);
  });

  it("explains no-data squares only when asked", () => {
    const legend = (noData: boolean) =>
      text(<ScaleLegend bins={bins} unit="h" none="None" noData={noData} />);
    expect(legend(true)).toContain("No data");
    expect(legend(false)).not.toContain("No data");
  });
});

describe("RankedBars", () => {
  const rows = [
    {
      key: 1,
      name: "Paper Lanterns",
      by: "The Test Pilots",
      value: 40,
      valueText: "40",
      tip: { value: "40" },
    },
    {
      key: 2,
      name: "Sundial",
      value: 10,
      valueText: "10",
      tip: { value: "10" },
    },
  ];

  it("numbers each row and gives its value", () => {
    expect(text(<RankedBars rows={rows} />)).toBe(
      " 1 Paper Lanterns · The Test Pilots 40 2 Sundial 10 ",
    );
  });

  it("sizes bars against the longest", () => {
    const widths = [
      ...html(<RankedBars rows={rows} />).matchAll(
        /width:calc\(\(100% - 8ch\) \* ([\d.]+)\)/g,
      ),
    ].map((m) => Number(m[1]));
    expect(widths).toEqual([1, 0.25]);
  });
});
