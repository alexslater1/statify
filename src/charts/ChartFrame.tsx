import {
  useEffectEvent,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  useTooltipControl,
  type TooltipContent,
} from "../components/tooltip.ts";
import "../styles/chart.css";
import { useWidth } from "./useWidth.ts";

interface ChartFrameProps<K> {
  /** What the chart shows, for screen readers. */
  label: string;
  /** Kept free before the chart is measured, so the page doesn't jump. */
  height: number;
  /** Lets the chart scroll sideways when it's wider than the page. */
  scroll?: boolean;
  /** The mark a keyboard user starts on. */
  first(): K;
  /** Where an arrow key leads from a mark, or null if it isn't a move. */
  move(from: K, key: string): K | null;
  content(at: K): TooltipContent;
  /** The data-mark attribute of the mark's element. */
  markId(at: K): string;
  /** Draws the chart at a width, highlighting the active mark. */
  children(width: number, active: K | null): ReactNode;
}

/**
 * What every chart sits in. It measures the width to draw to, and lets the
 * keyboard reach every mark: the chart is one tab stop, arrow keys move
 * between marks, and the tooltip and screen readers give the active one.
 */
export function ChartFrame<K>(props: ChartFrameProps<K>) {
  const { label, height, scroll, children } = props;
  const [ref, width] = useWidth<HTMLDivElement>();
  const tooltip = useTooltipControl();
  const [active, setActive] = useState<K | null>(null);

  const mark = (at: K) =>
    ref.current?.querySelector(`[data-mark="${CSS.escape(props.markId(at))}"]`);
  const show = useEffectEvent((at: K) => {
    const element = mark(at);
    if (!element) return;
    // A mark scrolled out of sight comes back into view first
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
    tooltip.showOver(props.content(at), element);
  });
  useLayoutEffect(() => {
    if (active !== null) show(active);
  }, [active]);

  const said = active === null ? null : props.content(active);
  return (
    <div className={scroll ? "chart scroll" : "chart"}>
      <div
        ref={ref}
        role="img"
        aria-label={`${label}. Use the arrow keys to go through it.`}
        tabIndex={0}
        style={width === 0 ? { minHeight: height } : undefined}
        onFocus={(e) => {
          // Only from the keyboard: a click shouldn't pick a mark
          if (e.currentTarget.matches(":focus-visible"))
            setActive(props.first());
        }}
        onBlur={() => {
          setActive(null);
          tooltip.hide();
        }}
        onKeyDown={(e) => {
          const next = active === null ? null : props.move(active, e.key);
          if (next === null) return;
          e.preventDefault();
          setActive(next);
        }}
      >
        {width > 0 && children(width, active)}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {said && [said.value, ...(said.lines ?? [])].join(", ")}
      </p>
    </div>
  );
}
