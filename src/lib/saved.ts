import { toLocal } from "./dates.ts";
import { formatMonth } from "./format.ts";
import { loadExports, type Export, type InputFile } from "./spotify/exports.ts";
import { historyFileNumber, splitPath } from "./spotify/files.ts";

/**
 * An export as kept in the browser: its StreamingHistory_music_N.json files,
 * in a folder named after it, so loadExports opens it under the same name.
 */
export interface SavedExport {
  name: string;
  files: InputFile[];
}

/** What some added files held. */
export interface Added {
  exports: Export[]; // the new ones, each with a name of its own
  saved: SavedExport[]; // the same, to keep
  duplicates: number; // exports already added, so left out
}

/**
 * The exports in `files` that aren't in `current` yet. Each is named after
 * its folder, or if it wasn't in one, the month it ends ("Nov 2025 export"),
 * which is about when it was requested. " (2)" and so on is added if the name
 * is taken. Throws if a history file is malformed, so nothing is added from a
 * broken export.
 */
export function addExports(current: Export[], files: InputFile[]): Added {
  const known = [...current];
  const names = new Set(current.map((ex) => ex.name));
  const added: Added = { exports: [], saved: [], duplicates: 0 };
  for (const found of loadExports(files)) {
    if (known.some((ex) => sameStreams(ex, found))) {
      added.duplicates++;
      continue;
    }
    const name = unusedName(
      found.name || `${formatMonth(toLocal(found.to).day.slice(0, 7))} export`,
      names,
    );
    const ex = { ...found, name };
    names.add(name);
    known.push(ex);
    added.exports.push(ex);
    added.saved.push({
      name,
      files: files.flatMap(({ path, text }) => {
        const { folder, fileName } = splitPath(path);
        return folder === found.name && historyFileNumber(fileName) !== null
          ? [{ path: `${name}/${fileName}`, text }]
          : [];
      }),
    });
  }
  return added;
}

/**
 * Opens the exports kept in the browser. Any that no longer open are left out
 * and named in `broken`, so one bad export doesn't lose the rest.
 */
export function openSaved(saved: SavedExport[]): {
  exports: Export[];
  broken: string[];
} {
  const exports: Export[] = [];
  const broken: string[] = [];
  for (const { name, files } of saved) {
    try {
      const [ex] = loadExports(files);
      if (ex?.name !== name) throw new Error();
      exports.push(ex);
    } catch {
      broken.push(name);
    }
  }
  return { exports, broken };
}

/** `saved` without its file `number`. */
export function withoutSavedFile(
  saved: SavedExport,
  number: number,
): SavedExport {
  return {
    ...saved,
    files: saved.files.filter(
      ({ path }) => historyFileNumber(splitPath(path).fileName) !== number,
    ),
  };
}

function sameStreams(a: Export, b: Export): boolean {
  return (
    a.records.length === b.records.length &&
    a.records.every((r, i) => {
      const s = b.records[i];
      return (
        r.endTime === s.endTime &&
        r.artistName === s.artistName &&
        r.trackName === s.trackName &&
        r.msPlayed === s.msPlayed
      );
    })
  );
}

function unusedName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  for (let n = 2; ; n++) {
    if (!taken.has(`${name} (${n})`)) return `${name} (${n})`;
  }
}
