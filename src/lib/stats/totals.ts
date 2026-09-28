import { daysBetween } from "../dates.ts";
import { isPlay, type Stream } from "../history.ts";
import { inPeriod, type Period } from "./period.ts";

export interface Totals {
  ms: number;
  streams: number;
  plays: number;
  artists: number; // with at least one play
  songs: number; // with at least one play
  activeDays: number; // with any listening
  days: number; // in the period, leaving out days with no data
  missingDays: number; // in the period
}

/** Totals for the streams in `period`. */
export function totals(
  streams: Stream[],
  period: Period,
  missingDays: string[],
): Totals {
  const artists = new Set<number>();
  const songs = new Set<number>();
  const activeDays = new Set<string>();
  let ms = 0;
  let plays = 0;
  for (const s of streams) {
    ms += s.ms;
    activeDays.add(s.day);
    if (!isPlay(s)) continue;
    plays++;
    artists.add(s.artist);
    songs.add(s.song);
  }
  const missing = missingDays.filter((day) => inPeriod(day, period)).length;
  return {
    ms,
    streams: streams.length,
    plays,
    artists: artists.size,
    songs: songs.size,
    activeDays: activeDays.size,
    days: daysBetween(period.first, period.last) + 1 - missing,
    missingDays: missing,
  };
}
