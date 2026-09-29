import { useEffectEvent, useLayoutEffect, useRef } from "react";
import { useTooltip, type TooltipContent } from "../components/tooltip.ts";
import { addDays, weekday } from "../lib/dates.ts";
import { MONTHS } from "../lib/format.ts";
import { ChartFrame } from "./ChartFrame.tsx";
import { moveInCalendar, weekColumn, yearsBetween } from "./layout.ts";
import { shade, type Bins } from "./scale.ts";

interface CalendarProps {
  /** The first and last day to show, "YYYY-MM-DD". */
  first: string;
  last: string;
  /** Each day's value, in the legend's unit. Days left out are empty. */
  values: Map<string, number>;
  /** Days no export covers, outlined rather than shaded. */
  missing: Set<string>;
  bins: Bins;
  tip(day: string): TooltipContent;
  label: string;
}

const LABEL_WIDTH = 30; // for the year, and Mon, Wed and Fri
const TOP = 30; // the year and month names
const YEAR_GAP = 14; // see .calendar in chart.css

/**
 * Every day as a square, a row of weeks for each year, shaded by its value.
 * Each row spans its whole year, so the years line up. When they're too wide
 * for the page the squares scroll sideways, starting at the latest day, while
 * the year and weekday names stay put.
 */
export function Calendar(props: CalendarProps) {
  const { first, last, values } = props;
  let busiest = first;
  for (const [day, value] of values) {
    if (value > (values.get(busiest) ?? 0)) busiest = day;
  }
  const years = yearsBetween(first, last).length;
  return (
    <ChartFrame
      label={props.label}
      height={years * (TOP + 7 * 13 + YEAR_GAP)}
      first={() => busiest}
      move={(day, key) => moveInCalendar(day, key, first, last)}
      content={props.tip}
      markId={(day) => day}
    >
      {(width, active) => <Years {...props} width={width} active={active} />}
    </ChartFrame>
  );
}

function Years({
  first,
  last,
  values,
  missing,
  bins,
  tip,
  width,
  active,
}: CalendarProps & { width: number; active: string | null }) {
  const tipFor = useTooltip();
  const scroller = useRef<HTMLDivElement>(null);
  // As big as fits a year's 54 weeks, within limits
  const pitch = Math.max(
    11,
    Math.min(19, Math.floor((width - LABEL_WIDTH) / 54)),
  );
  const cell = pitch - 2;
  const height = TOP + 7 * pitch;
  const x = (day: string) => weekColumn(day) * pitch;
  const years = yearsBetween(first, last);

  // Start with the latest day in view. Only when first drawn, so resizing
  // doesn't undo the reader's own scrolling
  const toLatest = useEffectEvent(() => {
    const el = scroller.current!;
    el.scrollLeft = x(last) + pitch + 8 - el.clientWidth;
  });
  useLayoutEffect(() => toLatest(), []);

  return (
    <div className="calendar">
      <div>
        {years.map((y) => (
          <svg key={y.year} width={LABEL_WIDTH} height={height}>
            <text className="strong" x={0} y={12}>
              {y.year}
            </text>
            {["Mon", "Wed", "Fri"].map((name, i) => (
              <text key={name} x={0} y={TOP + i * 2 * pitch + cell - 2}>
                {name}
              </text>
            ))}
          </svg>
        ))}
      </div>
      <div ref={scroller} className="calendar-scroll">
        {years.map((y) => {
          const days: string[] = [];
          for (let day = y.first; day <= y.last; day = addDays(day, 1)) {
            days.push(day);
          }
          // A month starting within 3 weeks of the one before is left
          // unnamed, so names don't overlap
          const months = days
            .filter((day) => day.endsWith("-01") || day === y.first)
            .filter(
              (day, i, starts) =>
                i === starts.length - 1 ||
                x(starts[i + 1]) - x(day) >= 3 * pitch,
            );
          return (
            <svg
              key={y.year}
              width={x(`${y.year}-12-31`) + pitch}
              height={height}
            >
              {months.map((day) => (
                <text key={day} x={x(day)} y={TOP - 6}>
                  {MONTHS[Number(day.slice(5, 7)) - 1]}
                </text>
              ))}
              {days.map((day) => {
                const top = TOP + weekday(day) * pitch;
                const className = day === active ? "cell active" : "cell";
                return missing.has(day) ? (
                  <rect
                    key={day}
                    data-mark={day}
                    className={`${className} no-data`}
                    x={x(day) + 0.5}
                    y={top + 0.5}
                    width={cell - 1}
                    height={cell - 1}
                    rx={2}
                    {...tipFor(tip(day))}
                  />
                ) : (
                  <rect
                    key={day}
                    data-mark={day}
                    className={className}
                    x={x(day)}
                    y={top}
                    width={cell}
                    height={cell}
                    rx={2}
                    style={{ fill: shade(bins, values.get(day) ?? 0) }}
                    {...tipFor(tip(day))}
                  />
                );
              })}
            </svg>
          );
        })}
      </div>
    </div>
  );
}
