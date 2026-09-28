import {
  historyFileNumber,
  parseHistoryFile,
  splitPath,
  type StreamRecord,
} from "./files.ts";

/** A file from a Spotify data export, from a zip, a folder or loose files. */
export interface InputFile {
  path: string;
  text: string;
}

/** A stretch of time between two UTC endTimes, both included. */
export interface Range {
  from: string;
  to: string;
}

/** A Spotify export: the StreamingHistory_music_N.json files in one folder. */
export interface Export {
  name: string; // the folder
  records: StreamRecord[];
  from: string; // first endTime
  to: string; // last endTime
  /**
   * The stretches it covers. Files are consecutive chunks of one timeline, so
   * a missing file splits it.
   */
  spans: Range[];
  /** Files missing from the middle, e.g. [2] for files 0, 1 and 3. */
  missingFiles: number[];
}

/**
 * One export per folder of StreamingHistory_music_N.json files, ordered by
 * folder. Other files are ignored without being parsed, and so are empty
 * history files. Files with no folder form one export named "".
 */
export function loadExports(files: InputFile[]): Export[] {
  const folders = new Map<string, Map<number, StreamRecord[]>>();
  for (const { path, text } of files) {
    const { folder, fileName } = splitPath(path);
    const n = historyFileNumber(fileName);
    if (n === null) continue;
    const records = parseHistoryFile(path, text);
    if (records.length === 0) continue;
    let byNumber = folders.get(folder);
    if (!byNumber) folders.set(folder, (byNumber = new Map()));
    byNumber.set(n, records);
  }
  return [...folders.keys()]
    .sort()
    .map((folder) => buildExport(folder, folders.get(folder)!));
}

function buildExport(
  name: string,
  byNumber: Map<number, StreamRecord[]>,
): Export {
  const parts = [...byNumber].sort(([a], [b]) => a - b);
  const spans: Range[] = [];
  const missingFiles: number[] = [];
  let from = earliest(parts[0][1]);
  for (let i = 1; i < parts.length; i++) {
    const [before, beforeRecords] = parts[i - 1];
    const [after, afterRecords] = parts[i];
    if (after === before + 1) continue;
    for (let n = before + 1; n < after; n++) missingFiles.push(n);
    spans.push({ from, to: latest(beforeRecords) });
    from = earliest(afterRecords);
  }
  spans.push({ from, to: latest(parts[parts.length - 1][1]) });
  return {
    name,
    records: parts.flatMap(([, records]) => records),
    from: spans[0].from,
    to: spans[spans.length - 1].to,
    spans,
    missingFiles,
  };
}

function earliest(records: StreamRecord[]): string {
  return records.reduce(
    (min, r) => (r.endTime < min ? r.endTime : min),
    records[0].endTime,
  );
}

function latest(records: StreamRecord[]): string {
  return records.reduce(
    (max, r) => (r.endTime > max ? r.endTime : max),
    records[0].endTime,
  );
}
