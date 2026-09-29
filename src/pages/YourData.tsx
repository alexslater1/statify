import { useMemo } from "react";
import { AddFiles } from "../components/AddFiles.tsx";
import { Card } from "../components/Card.tsx";
import type { Exports } from "../components/exports.ts";
import { Flag } from "../components/Flag.tsx";
import { formatLocal, toLocal } from "../lib/dates.ts";
import {
  countOf,
  formatDays,
  formatLength,
  formatList,
  formatMinute,
  formatNumber,
} from "../lib/format.ts";
import type { Export, Range } from "../lib/spotify/exports.ts";
import {
  countsDisagree,
  findGaps,
  mergeExports,
  type Overlap,
} from "../lib/spotify/merge.ts";
import "../styles/button.css";
import "../styles/your-data.css";

type YourDataProps = Pick<Exports, "reading" | "notice"> & {
  exports: Export[];
  onAdd: Exports["add"];
  onRemove: Exports["remove"];
  onRemoveFile: Exports["removeFile"];
};

/** The exports added so far: what they cover, and anything missing. */
export function YourData({
  exports,
  onAdd,
  onRemove,
  onRemoveFile,
  reading,
  notice,
}: YourDataProps) {
  const { records, overlaps } = useMemo(() => mergeExports(exports), [exports]);
  const gaps = useMemo(() => findGaps(exports), [exports]);
  // Oldest first, like the files in each
  const inOrder = [...exports].sort(
    (a, b) => compare(a.from, b.from) || compare(a.to, b.to),
  );
  const first = inOrder[0].from;
  const last = exports.reduce(
    (max, ex) => (ex.to > max ? ex.to : max),
    exports[0].to,
  );

  const problems = [
    ...gaps.map(gapProblem),
    ...inOrder.filter((ex) => ex.missingFiles.length > 0).map(missingProblem),
    ...overlaps.filter(countsDisagree).map(disagreeProblem),
  ];

  return (
    <>
      <h1>Your data</h1>
      <p className="lede">
        {countOf(records.length, "stream")} from {days(first, last)}
        {exports.length > 1 && `, merged from ${exports.length} exports`}.
        Charts of your listening come next.
      </p>
      {problems.length > 0 && (
        <Flag
          title={gaps.length > 0 ? "Gaps in your data" : "Check your data"}
          items={problems}
        />
      )}
      <Card title="Exports" sub="Where two overlap, the newer one is used.">
        <ul className="export-list">
          {inOrder.map((ex) => (
            <li key={ex.name}>
              <div className="export-info">
                <strong>{days(ex.from, ex.to)}</strong>
                <span>
                  {countOf(ex.records.length, "stream")} · {ex.name}
                </span>
              </div>
              <button
                type="button"
                className="button small"
                aria-label={`Remove ${ex.name}`}
                onClick={() => onRemove(ex.name)}
              >
                Remove
              </button>
              <ExportFiles
                ex={ex}
                onRemove={(number) => onRemoveFile(ex.name, number)}
              />
            </li>
          ))}
        </ul>
        {overlaps.length > 0 && (
          <ul className="overlap-list">
            {overlaps.map((o) => (
              <li key={`${o.older} ${o.newer}`}>{overlapNote(o)}</li>
            ))}
          </ul>
        )}
        <div className="add-more">
          <h3>Add another export</h3>
          <p>Drop it anywhere on this page, or choose it below.</p>
          <AddFiles onAdd={onAdd} reading={reading} notice={notice} />
        </div>
      </Card>
    </>
  );
}

/**
 * An export's files, open to start with if any are missing. Removing the last
 * one removes the export.
 */
function ExportFiles({
  ex,
  onRemove,
}: {
  ex: Export;
  onRemove(number: number): void;
}) {
  const files = [
    ...ex.files.map(({ number, from, to, streams }) => ({
      number,
      detail: `${days(from, to)} · ${countOf(streams, "stream")}`,
    })),
    ...ex.missingFiles.map((number) => ({ number, detail: null })),
  ].sort((a, b) => a.number - b.number);
  const missing = ex.missingFiles.length;
  return (
    <details className="export-files" open={missing > 0}>
      <summary>
        {countOf(ex.files.length, "file")}
        {missing > 0 && `, ${missing} missing`}
      </summary>
      <ul>
        {files.map(({ number, detail }) => (
          <li key={number}>
            <span>StreamingHistory_music_{number}.json</span>
            {detail ?? <span className="missing">Missing</span>}
            {detail !== null && (
              <button
                type="button"
                className="file-remove"
                aria-label={`Remove StreamingHistory_music_${number}.json from ${ex.name}`}
                onClick={() => onRemove(number)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Two UTC endTimes as local days: "6 Nov 2024 – 7 Nov 2025". */
function days(from: string, to: string): string {
  return formatDays(toLocal(from).day, toLocal(to).day);
}

function streamsIn({ olderCount, newerCount }: Overlap): string {
  return olderCount === newerCount
    ? `${countOf(olderCount, "stream")} in each`
    : `${countOf(olderCount, "stream")} in the older and ${formatNumber(newerCount)} in the newer`;
}

function overlapNote(o: Overlap): string {
  return `${days(o.from, o.to)} is in two exports, with ${streamsIn(o)}. The newer one is used there.`;
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
  return `Two exports disagree about ${days(o.from, o.to)}, with ${streamsIn(o)}, so one may be incomplete. The newer one is used.`;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
