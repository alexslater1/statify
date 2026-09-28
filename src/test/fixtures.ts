// Made-up listening data for tests. Never put real exports here.
import type { InputFile } from "../lib/spotify/exports.ts";
import type { StreamRecord } from "../lib/spotify/files.ts";

/** A three-minute stream ending at `endTime` (UTC, "YYYY-MM-DD HH:MM"). */
export function stream(
  endTime: string,
  trackName = "Paper Lanterns",
  artistName = "The Test Pilots",
  msPlayed = 180_000,
): StreamRecord {
  return { endTime, artistName, trackName, msPlayed };
}

/** A stream at noon UTC each day from `first` to `last` ("YYYY-MM-DD"). */
export function daily(
  first: string,
  last: string,
  trackName?: string,
): StreamRecord[] {
  const records: StreamRecord[] = [];
  const end = new Date(`${last}T12:00Z`);
  for (
    const day = new Date(`${first}T12:00Z`);
    day <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    records.push(stream(`${day.toISOString().slice(0, 10)} 12:00`, trackName));
  }
  return records;
}

/** StreamingHistory_music_`n`.json in `folder`. */
export function historyFile(
  folder: string,
  n: number,
  records: StreamRecord[],
): InputFile {
  return {
    path: `${folder}/StreamingHistory_music_${n}.json`,
    text: JSON.stringify(records),
  };
}
