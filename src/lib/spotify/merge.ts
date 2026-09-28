import type { Export, Range } from "./exports.ts";
import type { StreamRecord } from "./files.ts";

/** A stretch two exports both cover, and how many streams each has in it. */
export interface Overlap extends Range {
  older: string;
  newer: string;
  olderCount: number;
  newerCount: number;
}

/**
 * Combines exports into one list of streams.
 *
 * Each export covers roughly the year before it was requested, so consecutive
 * ones overlap, and Spotify renames tracks between exports, so dropping exact
 * duplicates would still double-count. Instead, wherever exports overlap, the
 * one that runs latest wins, and older ones only fill in what it doesn't cover.
 */
export function mergeExports(exports: Export[]): {
  records: StreamRecord[];
  overlaps: Overlap[];
} {
  const records: StreamRecord[] = [];
  const overlaps: Overlap[] = [];
  const used: Export[] = [];
  // Newest first. The sort is stable, so exports that end at the same time
  // keep their folder order.
  for (const ex of [...exports].sort((a, b) => compare(b.to, a.to))) {
    for (const newer of used) {
      const from = ex.from > newer.from ? ex.from : newer.from;
      const to = ex.to < newer.to ? ex.to : newer.to;
      if (from > to) continue;
      overlaps.push({
        older: ex.name,
        newer: newer.name,
        from,
        to,
        olderCount: countBetween(ex.records, from, to),
        newerCount: countBetween(newer.records, from, to),
      });
    }
    for (const r of ex.records) {
      if (!used.some((u) => covers(u, r.endTime))) records.push(r);
    }
    used.push(ex);
  }
  return { records, overlaps };
}

/**
 * Whether two exports disagree about an overlap by more than 10 streams or 2%,
 * which suggests one of them is incomplete.
 */
export function countsDisagree({ olderCount, newerCount }: Overlap): boolean {
  return (
    Math.abs(olderCount - newerCount) >
    Math.max(10, 0.02 * Math.max(olderCount, newerCount))
  );
}

/**
 * Stretches between the first and last stream that no export covers, from the
 * last endTime covered to the next.
 */
export function findGaps(exports: Export[]): Range[] {
  const spans = exports
    .flatMap((ex) => ex.spans)
    .sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to));
  if (spans.length === 0) return [];
  const gaps: Range[] = [];
  let reach = spans[0].to;
  for (const { from, to } of spans.slice(1)) {
    if (from > reach) gaps.push({ from: reach, to: from });
    if (to > reach) reach = to;
  }
  return gaps;
}

function covers(ex: Export, endTime: string): boolean {
  return ex.spans.some((s) => s.from <= endTime && endTime <= s.to);
}

function countBetween(records: StreamRecord[], from: string, to: string) {
  return records.filter((r) => from <= r.endTime && r.endTime <= to).length;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
