// What the page says about how well the exports cover the listening

import { formatLocal, toLocal } from "./dates.ts";
import {
  countOf,
  formatEndTimes,
  formatLength,
  formatList,
  formatMinute,
  formatNumber,
} from "./format.ts";
import type { Export, Range } from "./spotify/exports.ts";
import { countsDisagree, type Overlap } from "./spotify/merge.ts";

/** Where two exports overlap, and which is used. */
export function overlapNote(o: Overlap): string {
  return `${formatEndTimes(o.from, o.to)} is in two exports, with ${streamsIn(o)}. The newer one is used there.`;
}

/**
 * Anything that leaves the stats incomplete: stretches no export covers,
 * files missing from an export, and overlaps where exports disagree.
 * `exports` are in the order to mention them.
 */
export function dataProblems(
  exports: Export[],
  overlaps: Overlap[],
  gaps: Range[],
): string[] {
  return [
    ...gaps.map(gapProblem),
    ...exports.filter((ex) => ex.missingFiles.length > 0).map(missingProblem),
    ...overlaps.filter(countsDisagree).map(disagreeProblem),
  ];
}

function gapProblem({ from, to }: Range): string {
  const start = toLocal(from);
  const end = toLocal(to);
  return `No export covers ${formatMinute(formatLocal(start))} to ${formatMinute(formatLocal(end))} (${formatLength(end.time - start.time)}), so anything you played then is missing from every stat.`;
}

function missingProblem(ex: Export): string {
  const files = ex.missingFiles.map((n) => `StreamingHistory_music_${n}.json`);
  return `${ex.name} is missing ${formatList(files)}.`;
}

function disagreeProblem(o: Overlap): string {
  return `Two exports disagree about ${formatEndTimes(o.from, o.to)}, with ${streamsIn(o)}, so one may be incomplete. The newer one is used.`;
}

function streamsIn({ olderCount, newerCount }: Overlap): string {
  return olderCount === newerCount
    ? `${countOf(olderCount, "stream")} in each`
    : `${countOf(olderCount, "stream")} in the older and ${formatNumber(newerCount)} in the newer`;
}
