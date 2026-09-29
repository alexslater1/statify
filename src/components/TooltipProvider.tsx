import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "../styles/tooltip.css";
import {
  placeTooltip,
  TooltipContext,
  type Point,
  type TooltipContent,
} from "./tooltip.ts";

/** Holds the page's one tooltip, which every chart shares. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<TooltipContent | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });

  // Moves the tooltip directly, so following the pointer doesn't re-render
  const position = useCallback(() => {
    if (!tip.current) return;
    const { x, y } = placeTooltip(
      pointer.current,
      { width: tip.current.offsetWidth, height: tip.current.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    tip.current.style.transform = `translate(${x}px, ${y}px)`;
  }, []);
  useLayoutEffect(position, [content, position]);

  const tooltip = useMemo(
    () => ({
      show(next: TooltipContent, at: Point) {
        pointer.current = at;
        setContent(next);
      },
      move(at: Point) {
        pointer.current = at;
        position();
      },
      hide() {
        setContent(null);
      },
    }),
    [position],
  );

  return (
    <TooltipContext.Provider value={tooltip}>
      {children}
      {content && (
        <div ref={tip} className="tooltip" role="tooltip">
          <strong>{content.value}</strong>
          {content.lines?.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}
    </TooltipContext.Provider>
  );
}
