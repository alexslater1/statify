import type { CSSProperties } from "react";
import { Card } from "./components/Card.tsx";
import { useTooltip } from "./components/tooltip.ts";
import { TooltipProvider } from "./components/TooltipProvider.tsx";
import { TopBar } from "./components/TopBar.tsx";

export default function App() {
  return (
    <TooltipProvider>
      <TopBar />
      <main>
        <h1>Stats from your Spotify listening history</h1>
        <p className="lede">
          The app is still being built. Loading your Spotify data comes next.
        </p>
        <Card
          title="Colour scale"
          sub="How charts will shade listening, from a little to a lot"
        >
          <ScalePreview />
        </Card>
      </main>
    </TooltipProvider>
  );
}

const SWATCH: CSSProperties = {
  width: 28,
  height: 16,
  borderRadius: 3,
};

// A preview of the theme until there are charts
function ScalePreview() {
  const tip = useTooltip();
  const swatch = (style: CSSProperties, value: string, detail?: string) => (
    <span
      key={value}
      tabIndex={0}
      aria-label={detail ? `${value}: ${detail}` : value}
      style={{ ...SWATCH, ...style }}
      {...tip({ value, lines: detail ? [detail] : [] })}
    />
  );
  const levels = [1, 2, 3, 4, 5, 6, 7].map((n) =>
    swatch(
      { background: `var(--seq-${n})` },
      `Level ${n} of 7`,
      n === 1
        ? "The least listening"
        : n === 7
          ? "The most listening"
          : undefined,
    ),
  );
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span>Less</span>
      {levels}
      <span style={{ marginRight: 16 }}>More</span>
      {swatch(
        { background: "var(--empty)" },
        "No listening",
        "A day with no streams",
      )}
      <span style={{ marginRight: 16 }}>No listening</span>
      {swatch(
        { boxShadow: "inset 0 0 0 1px var(--axis)" },
        "No data",
        "A day no export covers",
      )}
      <span>No data</span>
    </div>
  );
}
