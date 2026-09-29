import { formatDecimal } from "../lib/format.ts";
import "../styles/chart.css";
import type { Bins } from "./scale.ts";
import { STEPS } from "./scale.ts";

interface ScaleLegendProps {
  bins: Bins;
  /** The unit of the cut values, like "min". */
  unit: string;
  /** What the empty shade means, like "No listening". */
  none: string;
  /** Whether to explain the outlined "no data" squares. */
  noData?: boolean;
}

/**
 * The key to shaded cells: the empty shade, then each green shade with the
 * values where one shade gives way to the next.
 */
export function ScaleLegend({ bins, unit, none, noData }: ScaleLegendProps) {
  const shades = bins.cuts.length + 1;
  return (
    <div className="legend">
      <span className="legend-key">
        <span className="swatch" style={{ background: "var(--empty)" }} />
        {none}
      </span>
      <span className="legend-key">
        <span className="legend-scale">
          {Array.from({ length: shades }, (_, i) => (
            <span
              key={i}
              className="swatch"
              style={{ background: `var(--seq-${STEPS - shades + 1 + i})` }}
            >
              {i > 0 && (
                <span className="legend-cut">
                  {formatDecimal(bins.cuts[i - 1])}
                </span>
              )}
            </span>
          ))}
        </span>
        {unit}
      </span>
      {noData && (
        <span className="legend-key">
          <span className="swatch no-data" />
          No data
        </span>
      )}
    </div>
  );
}
