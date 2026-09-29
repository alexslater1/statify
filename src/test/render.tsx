// Rendering components to text for tests, without a browser
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { TooltipProvider } from "../components/TooltipProvider.tsx";

/** The page's HTML, as the server would render it. */
export function html(node: ReactNode): string {
  return renderToString(<TooltipProvider>{node}</TooltipProvider>);
}

/** Just the words, as they read, with tags turned into spaces. */
export function text(node: ReactNode): string {
  return html(node)
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}
