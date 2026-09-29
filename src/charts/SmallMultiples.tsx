import { useState, type PointerEvent } from "react";
import {
  useTooltipControl,
  type TooltipContent,
} from "../components/tooltip.ts";
import "../styles/small-multiples.css";
import { ChartFrame } from "./ChartFrame.tsx";
import { moveAlong } from "./layout.ts";

export interface Multiple {
  key: string | number;
  name: string;
  /** Beside the name, like the total. */
  total: string;
  values: number[];
}

interface SmallMultiplesProps {
  multiples: Multiple[];
  /** Under each panel's first and last points. */
  firstLabel: string;
  lastLabel: string;
  tip(multiple: number, point: number): TooltipContent;
  /** What each panel shows, for screen readers, given its name. */
  label(name: string): string;
}

const HEIGHT = 96;
const MARGIN = { top: 8, right: 6, bottom: 18, left: 6 };

/**
 * A small line chart for each of several series, all on one scale so their
 * heights compare directly.
 */
export function SmallMultiples(props: SmallMultiplesProps) {
  const top = Math.max(1e-9, ...props.multiples.flatMap((m) => m.values));
  return (
    <div className="multiples">
      {props.multiples.map((m, i) => (
        <div key={m.key}>
          <div className="multiple-head">
            <span className="multiple-name">{m.name}</span>
            <span className="multiple-total">{m.total}</span>
          </div>
          <Panel {...props} multiple={m} index={i} top={top} />
        </div>
      ))}
    </div>
  );
}

function Panel({
  multiple: { name, values },
  index,
  top,
  firstLabel,
  lastLabel,
  tip,
  label,
}: SmallMultiplesProps & { multiple: Multiple; index: number; top: number }) {
  const tooltip = useTooltipControl();
  const [hover, setHover] = useState<number | null>(null);
  const peak = values.indexOf(Math.max(...values));
  return (
    <ChartFrame
      label={label(name)}
      height={HEIGHT}
      first={() => peak}
      move={(i, key) => moveAlong(i, key, values.length)}
      content={(i) => tip(index, i)}
      markId={String}
    >
      {(width, active) => {
        const plotWidth = width - MARGIN.left - MARGIN.right;
        const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
        const x = (i: number) =>
          MARGIN.left +
          (values.length > 1
            ? (i / (values.length - 1)) * plotWidth
            : plotWidth / 2);
        const y = (v: number) => MARGIN.top + plotHeight * (1 - v / top);
        const points = values.map((v, i) => `${x(i)},${y(v)}`).join("L");
        const shown = hover ?? active;
        const nearest = (e: PointerEvent<SVGSVGElement>) => {
          const left = e.currentTarget.getBoundingClientRect().left;
          const i = Math.round(
            ((e.clientX - left - MARGIN.left) / plotWidth) *
              (values.length - 1),
          );
          return Math.max(0, Math.min(values.length - 1, i));
        };
        return (
          <svg
            width={width}
            height={HEIGHT}
            aria-hidden="true"
            onPointerMove={(e) => {
              const i = nearest(e);
              setHover(i);
              tooltip.show(tip(index, i), { x: e.clientX, y: e.clientY });
            }}
            onPointerLeave={() => {
              setHover(null);
              tooltip.hide();
            }}
          >
            <path
              className="area"
              d={`M${x(0)},${y(0)}L${points}L${x(values.length - 1)},${y(0)}Z`}
            />
            <line
              className="axis-line"
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(0)}
              y2={y(0)}
            />
            <path className="line" d={`M${points}`} />
            <text x={MARGIN.left} y={HEIGHT - 4}>
              {firstLabel}
            </text>
            <text x={width - MARGIN.right} y={HEIGHT - 4} textAnchor="end">
              {lastLabel}
            </text>
            {shown !== null && (
              <>
                <line
                  className="crosshair"
                  x1={x(shown)}
                  x2={x(shown)}
                  y1={MARGIN.top}
                  y2={y(0)}
                />
                <circle
                  className="dot"
                  cx={x(shown)}
                  cy={y(values[shown])}
                  r={4}
                />
              </>
            )}
            {active !== null && (
              // Where the tooltip points for the keyboard
              <rect
                data-mark={active}
                x={x(active)}
                y={y(values[active])}
                width={0}
                height={0}
              />
            )}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
