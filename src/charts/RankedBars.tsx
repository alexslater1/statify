import { useTooltip, type TooltipContent } from "../components/tooltip.ts";
import "../styles/ranked-bars.css";

export interface Ranked {
  key: string | number;
  name: string;
  /** After the name, quieter, like a song's artist. */
  by?: string;
  value: number;
  /** Shown at the end of the bar, like "120 h". */
  valueText: string;
  tip: TooltipContent;
}

/**
 * A numbered list with a bar for each item, longest first. It's a list
 * rather than a drawing so long names can be cut short with an ellipsis.
 */
export function RankedBars({ rows }: { rows: Ranked[] }) {
  const tip = useTooltip();
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ol className="ranked-bars">
      {rows.map((r, i) => (
        <li key={r.key} tabIndex={0} {...tip(r.tip)}>
          <span className="rank">{i + 1}</span>
          <span className="ranked-name">
            {r.name}
            {r.by && <span className="by"> · {r.by}</span>}
          </span>
          <span className="track">
            <span
              className="fill"
              // The bar shares its row with the value, which needs about 8ch
              style={{
                width: `calc((100% - 8ch) * ${max > 0 ? r.value / max : 0})`,
              }}
            />
            <span className="value">{r.valueText}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
