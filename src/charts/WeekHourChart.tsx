import { useTooltip, type TooltipContent } from "../components/tooltip.ts";
import { WEEKDAYS } from "../lib/format.ts";
import { ChartFrame } from "./ChartFrame.tsx";
import { moveInGrid } from "./layout.ts";
import { shade, type Bins } from "./scale.ts";

interface WeekHourChartProps {
  /** A row per weekday, Monday first, of 24 hours, in the legend's unit. */
  values: number[][];
  bins: Bins;
  tip(weekday: number, hour: number): TooltipContent;
  label: string;
}

const LABEL_WIDTH = 36;
const TOP = 18; // the hours

/** A square for each hour of each weekday, shaded by its value. */
export function WeekHourChart({
  values,
  bins,
  tip,
  label,
}: WeekHourChartProps) {
  const tipFor = useTooltip();
  const flat = values.flat();
  const peak = flat.indexOf(Math.max(...flat));
  const at = (i: number) => tip(Math.floor(i / 24), i % 24);
  return (
    <ChartFrame
      label={label}
      height={TOP + 7 * 18}
      scroll
      first={() => peak}
      move={(i, key) => moveInGrid(i, key, 7, 24)}
      content={at}
      markId={String}
    >
      {(width, active) => {
        const pitch = Math.max(
          16,
          Math.min(44, Math.floor((width - LABEL_WIDTH) / 24)),
        );
        const cell = pitch - 2;
        const every = pitch < 26 ? 6 : 3; // hours between labels
        return (
          <svg
            width={LABEL_WIDTH + 24 * pitch}
            height={TOP + 7 * pitch}
            aria-hidden="true"
          >
            {Array.from({ length: 24 / every }, (_, i) => (
              <text key={i} x={LABEL_WIDTH + i * every * pitch} y={11}>
                {`${String(i * every).padStart(2, "0")}:00`}
              </text>
            ))}
            {values.map((row, day) => (
              <g key={day}>
                <text x={0} y={TOP + day * pitch + cell / 2 + 4}>
                  {WEEKDAYS[day].slice(0, 3)}
                </text>
                {row.map((value, hour) => {
                  const i = day * 24 + hour;
                  return (
                    <rect
                      key={hour}
                      data-mark={i}
                      className={i === active ? "cell active" : "cell"}
                      x={LABEL_WIDTH + hour * pitch}
                      y={TOP + day * pitch}
                      width={cell}
                      height={cell}
                      rx={3}
                      style={{ fill: shade(bins, value) }}
                      {...tipFor(at(i))}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
