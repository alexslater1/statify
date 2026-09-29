import { useLayoutEffect, useRef, useState } from "react";

/**
 * The width of the element given the ref, kept up to date as it resizes, so
 * a chart can draw to fit. 0 until it's measured.
 */
export function useWidth<T extends Element>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
