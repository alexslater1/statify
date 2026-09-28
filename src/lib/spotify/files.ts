/**
 * One stream from a StreamingHistory_music_N.json file. `endTime` is UTC to the
 * minute: "2025-11-07 23:59".
 */
export interface StreamRecord {
  endTime: string;
  artistName: string;
  trackName: string;
  msPlayed: number;
}

// Only exact names count, so a "StreamingHistory_music_3 (1).json" left by
// downloading twice is ignored
const HISTORY_FILE = /^StreamingHistory_music_(\d+)\.json$/;
const END_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Splits "2026-09/StreamingHistory_music_0.json" into folder and file name. */
export function splitPath(path: string): { folder: string; fileName: string } {
  const slash = path.lastIndexOf("/");
  return {
    folder: path.slice(0, Math.max(slash, 0)),
    fileName: path.slice(slash + 1),
  };
}

/** The N in StreamingHistory_music_N.json, or null for any other file. */
export function historyFileNumber(fileName: string): number | null {
  const match = HISTORY_FILE.exec(fileName);
  return match ? Number(match[1]) : null;
}

/** The streams in a StreamingHistory_music_N.json file. Throws if it isn't. */
export function parseHistoryFile(path: string, text: string): StreamRecord[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${path} isn't valid JSON`);
  }
  if (!Array.isArray(data)) {
    throw new Error(
      `${path} doesn't look like Spotify streaming history: it isn't a list of streams`,
    );
  }
  return data.map((item: unknown, i) => {
    if (!isStreamRecord(item)) {
      throw new Error(
        `${path} doesn't look like Spotify streaming history: stream ${i + 1} is malformed`,
      );
    }
    const { endTime, artistName, trackName, msPlayed } = item;
    return { endTime, artistName, trackName, msPlayed };
  });
}

function isStreamRecord(item: unknown): item is StreamRecord {
  if (typeof item !== "object" || item === null) return false;
  const { endTime, artistName, trackName, msPlayed } = item as Record<
    string,
    unknown
  >;
  return (
    typeof endTime === "string" &&
    END_TIME.test(endTime) &&
    typeof artistName === "string" &&
    typeof trackName === "string" &&
    typeof msPlayed === "number" &&
    Number.isFinite(msPlayed)
  );
}
