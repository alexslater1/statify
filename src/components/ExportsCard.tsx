import type { Exports } from "./exports.ts";
import { AddFiles } from "./AddFiles.tsx";
import { Card } from "./Card.tsx";
import { overlapNote } from "../lib/coverage.ts";
import { countOf, formatEndTimes } from "../lib/format.ts";
import type { Export } from "../lib/spotify/exports.ts";
import type { Overlap } from "../lib/spotify/merge.ts";
import "../styles/button.css";
import "../styles/exports-card.css";

type ExportsCardProps = Pick<Exports, "reading" | "notice"> & {
  /** Oldest first. */
  exports: Export[];
  overlaps: Overlap[];
  onAdd: Exports["add"];
  onRemove: Exports["remove"];
  onRemoveFile: Exports["removeFile"];
};

/** The exports added so far, their files, and a way to add more. */
export function ExportsCard({
  exports,
  overlaps,
  onAdd,
  onRemove,
  onRemoveFile,
  reading,
  notice,
}: ExportsCardProps) {
  return (
    <Card title="Exports" sub="Where two overlap, the newer one is used.">
      <ul className="export-list">
        {exports.map((ex) => (
          <li key={ex.name}>
            <div className="export-info">
              <strong>{formatEndTimes(ex.from, ex.to)}</strong>
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
      detail: `${formatEndTimes(from, to)} · ${countOf(streams, "stream")}`,
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
