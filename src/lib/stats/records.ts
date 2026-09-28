import { addDays } from "../dates.ts";
import { isPlay, type Stream } from "../history.ts";
import { count, topKey } from "./top.ts";

/** A run of consecutive days. */
export interface Streak {
  days: number;
  first: string;
  last: string;
}

export interface SongStreak extends Streak {
  song: number;
}

export interface ArtistStreak extends Streak {
  artist: number;
}

export interface BigDay {
  day: string;
  ms: number;
  topArtist: number; // by listening time
  topSong: number | null; // by plays, or null if nothing was played for 30s
}

/** Plays of one song in one day. */
export interface Repeat {
  day: string;
  song: number;
  plays: number;
}

/**
 * The longest run of consecutive days, the earliest on a tie. `days` must be
 * in order.
 */
export function longestStreak(days: Iterable<string>): Streak {
  let best: Streak = { days: 0, first: "", last: "" };
  let run: Streak | undefined;
  for (const day of days) {
    if (run && day === addDays(run.last, 1)) {
      run = { ...run, days: run.days + 1, last: day };
    } else {
      run = { days: 1, first: day, last: day };
    }
    if (run.days > best.days) best = run;
  }
  return best;
}

/**
 * Each song's longest run of days with a play, longest first. Ties go to the
 * song with more plays, then the one played first.
 */
export function songStreaks(streams: Stream[], limit = Infinity): SongStreak[] {
  const days = daysPlayed(streams, (s) => s.song);
  const plays = new Map<number, number>();
  for (const s of streams) if (isPlay(s)) count(plays, s.song);
  return [...days]
    .map(([song, d]) => ({ song, ...longestStreak(d) }))
    .sort((a, b) => b.days - a.days || plays.get(b.song)! - plays.get(a.song)!)
    .slice(0, limit);
}

/**
 * Each artist's longest run of days with a play, longest first. Ties go to
 * the artist with more listening time, then the one played first.
 */
export function artistStreaks(
  streams: Stream[],
  limit = Infinity,
): ArtistStreak[] {
  const days = daysPlayed(streams, (s) => s.artist);
  const ms = new Map<number, number>();
  for (const s of streams) count(ms, s.artist, s.ms);
  return [...days]
    .map(([artist, d]) => ({ artist, ...longestStreak(d) }))
    .sort((a, b) => b.days - a.days || ms.get(b.artist)! - ms.get(a.artist)!)
    .slice(0, limit);
}

interface DayTotals {
  ms: number;
  artists: Map<number, number>; // listening time
  songs: Map<number, number>; // plays
}

/** The days with the most listening, most first; the earlier day on a tie. */
export function biggestDays(streams: Stream[], limit = Infinity): BigDay[] {
  const days = new Map<string, DayTotals>();
  for (const s of streams) {
    let day = days.get(s.day);
    if (!day) {
      days.set(s.day, (day = { ms: 0, artists: new Map(), songs: new Map() }));
    }
    day.ms += s.ms;
    count(day.artists, s.artist, s.ms);
    if (isPlay(s)) count(day.songs, s.song);
  }
  return [...days]
    .sort(([, a], [, b]) => b.ms - a.ms)
    .slice(0, limit)
    .map(([day, { ms, artists, songs }]) => ({
      day,
      ms,
      topArtist: topKey(artists)!,
      topSong: topKey(songs),
    }));
}

/** The most plays of a song in a day, most first; the earlier day on a tie. */
export function repeats(streams: Stream[], limit = Infinity): Repeat[] {
  const repeats = new Map<string, Repeat>(); // by day and song
  for (const s of streams) {
    if (!isPlay(s)) continue;
    const key = `${s.day} ${s.song}`;
    let repeat = repeats.get(key);
    if (!repeat) {
      repeats.set(key, (repeat = { day: s.day, song: s.song, plays: 0 }));
    }
    repeat.plays++;
  }
  return [...repeats.values()]
    .sort((a, b) => b.plays - a.plays || byDay(a, b))
    .slice(0, limit);
}

function byDay(a: { day: string }, b: { day: string }): number {
  return a.day < b.day ? -1 : a.day > b.day ? 1 : 0;
}

/** The days each song or artist was played for 30s or more, in order. */
function daysPlayed(
  streams: Stream[],
  idOf: (s: Stream) => number,
): Map<number, Set<string>> {
  const days = new Map<number, Set<string>>();
  for (const s of streams) {
    if (!isPlay(s)) continue;
    let set = days.get(idOf(s));
    if (!set) days.set(idOf(s), (set = new Set()));
    set.add(s.day);
  }
  return days;
}
