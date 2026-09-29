import { useTooltip, type TooltipContent } from "../components/tooltip.ts";
import { ChartFrame } from "./ChartFrame.tsx";
import { columnPath, moveAlong, spaced } from "./layout.ts";
import { niceTicks } from "./scale.ts";

export interface Column {
  value: number;
  /** Under the column, like "Jan". Left out where labels would crowd. */
  label?: string;
  /** Under the label, like the year. */
  sublabel?: string;
  /** Faded, for a period the data only partly covers. */
  partial?: boolean;
  tip: TooltipContent;
}

interface ColumnChartProps {
  columns: Column[];
  /** For the axis and the tallest column's label, like "120 h". */
  format(value: number): string;
  label: string;
  height?: number;
}

const MARGIN = { top: 20, right: 4, bottom: 36 };
const MAX_WIDTH = 24; // columns never fill a wide slot

/** Vertical columns from one baseline, with the tallest labelled. */
export function ColumnChart({
  columns,
  format,
  label,
  height = 240,
}: ColumnChartProps) {
  const tip = useTooltip();
  const values = columns.map((c) => c.value);
  const max = Math.max(0, ...values);
  const peak = values.indexOf(max);
  return (
    <ChartFrame
      label={label}
      height={height}
      first={() => peak}
      move={(i, key) => moveAlong(i, key, columns.length)}
      content={(i) => columns[i].tip}
      markId={String}
    >
      {(width, active) => {
        const ticks = niceTicks(max);
        const top = ticks[ticks.length - 1] || 1;
        // Room for the longest tick label, at about 6.5 px a character
        const left = Math.max(...ticks.map((t) => format(t).length)) * 6.5 + 10;
        const plotWidth = width - left - MARGIN.right;
        const plotHeight = height - MARGIN.top - MARGIN.bottom;
        const y = (v: number) => MARGIN.top + plotHeight * (1 - v / top);
        const band = plotWidth / columns.length;
        // A 2 px gap between columns, unless they're too thin to spare it
        const barWidth = band >= 4 ? Math.min(MAX_WIDTH, band - 2) : band;
        const middle = (i: number) => left + band * (i + 0.5);
        // Sublabels go first, so the labels over them always show
        const years = spaced(
          columns.map((c) => c.sublabel),
          middle,
        );
        return (
          <svg width={width} height={height} aria-hidden="true">
            {ticks.map((t) => (
              <g key={t}>
                <line
                  className={t === 0 ? "axis-line" : "grid-line"}
                  x1={left}
                  x2={width - MARGIN.right}
                  y1={y(t)}
                  y2={y(t)}
                />
                <text x={left - 8} y={y(t) + 4} textAnchor="end">
                  {format(t)}
                </text>
              </g>
            ))}
            {columns.map((c, i) => (
              <g
                key={i}
                className={i === active ? "column active" : "column"}
                data-mark={i}
                {...tip(c.tip)}
              >
                <path
                  className={c.partial ? "bar partial" : "bar"}
                  d={columnPath(
                    middle(i) - barWidth / 2,
                    barWidth,
                    y(0),
                    y(c.value),
                  )}
                />
                <rect
                  className="hit"
                  x={left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                />
              </g>
            ))}
            {spaced(
              columns.map((c) => c.label),
              middle,
              undefined,
              years,
            ).map((i) => (
              <text
                key={`l${i}`}
                x={middle(i)}
                y={height - MARGIN.bottom + 16}
                textAnchor="middle"
              >
                {columns[i].label}
              </text>
            ))}
            {years.map((i) => (
              <text
                key={`s${i}`}
                className="strong"
                x={middle(i)}
                y={height - MARGIN.bottom + 30}
                textAnchor="middle"
              >
                {columns[i].sublabel}
              </text>
            ))}
            {max > 0 && (
              <text
                className="strong"
                x={middle(peak)}
                y={y(max) - 6}
                textAnchor="middle"
              >
                {format(max)}
              </text>
            )}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
