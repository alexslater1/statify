import { isPlay, type History } from "../history.ts";
import { inPeriod, months, streamsIn, type Period } from "./period.ts";
import { count } from "./top.ts";

export interface NewArtists {
  month: string; // "2025-01"
  artists: number[]; // most listened to in the period first
}

/**
 * The artists first played in each month of `period`, where "first" means
 * first anywhere in the history. The month the history starts is left out,
 * since everything is new then, and the months after it run high.
 */
export function newArtists(history: History, period: Period): NewArtists[] {
  const firstPlayed = new Map<number, string>(); // artist → day
  for (const s of history.streams) {
    if (isPlay(s) && !firstPlayed.has(s.artist)) {
      firstPlayed.set(s.artist, s.day);
    }
  }
  const byMonth = new Map<string, number[]>();
  for (const [artist, day] of firstPlayed) {
    if (!inPeriod(day, period)) continue;
    const month = day.slice(0, 7);
    let artists = byMonth.get(month);
    if (!artists) byMonth.set(month, (artists = []));
    artists.push(artist);
  }
  const ms = new Map<number, number>();
  for (const s of streamsIn(history, period)) count(ms, s.artist, s.ms);

  const historyStart = history.streams[0].day.slice(0, 7);
  return months(period)
    .filter((month) => month !== historyStart)
    .map((month) => ({
      month,
      artists: (byMonth.get(month) ?? []).sort(
        (a, b) => ms.get(b)! - ms.get(a)!,
      ),
    }));
}
