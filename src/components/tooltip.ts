import {
  createContext,
  useContext,
  type FocusEvent,
  type PointerEvent,
} from "react";

/** What the tooltip shows: the value first, then what it's the value of. */
export interface TooltipContent {
  value: string;
  lines?: string[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

interface Tooltip {
  show(content: TooltipContent, at: Point): void;
  move(at: Point): void;
  hide(): void;
}

export const TooltipContext = createContext<Tooltip | null>(null);

/**
 * Gives marks the page's one tooltip: spread `tip(content)` onto a mark to
 * show `content` while it's hovered or has keyboard focus.
 */
export function useTooltip() {
  const tooltip = useContext(TooltipContext);
  if (!tooltip) throw new Error("useTooltip needs a TooltipProvider");
  return (content: TooltipContent) => ({
    onPointerEnter: (e: PointerEvent) =>
      tooltip.show(content, { x: e.clientX, y: e.clientY }),
    onPointerMove: (e: PointerEvent) =>
      tooltip.move({ x: e.clientX, y: e.clientY }),
    onPointerLeave: tooltip.hide,
    onFocus: (e: FocusEvent) => {
      const box = e.currentTarget.getBoundingClientRect();
      tooltip.show(content, { x: box.left + box.width / 2, y: box.top });
    },
    onBlur: tooltip.hide,
  });
}

const MARGIN = 8; // from the edge of the window

/**
 * Where the tooltip goes: above and to the right of the pointer, flipping left
 * or below when it would run off the window.
 */
export function placeTooltip(at: Point, tip: Size, window: Size): Point {
  let x = at.x + 14;
  if (x + tip.width > window.width - MARGIN) x = at.x - tip.width - 14;
  x = Math.max(MARGIN, x);
  let y = at.y - tip.height - 12;
  if (y < MARGIN) y = at.y + 18;
  return { x: Math.round(x), y: Math.round(y) };
}
