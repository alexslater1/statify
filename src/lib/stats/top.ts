import { isPlay, type Stream } from "../history.ts";

export interface ArtistTotal {
  artist: number;
  ms: number;
  plays: number;
}

export interface SongTotal {
  song: number;
  plays: number;
  ms: number;
}

/**
 * Artists by listening time, most first. Artists with the same time stay in
 * the order they first appear.
 */
export function topArtists(streams: Stream[], limit = Infinity): ArtistTotal[] {
  const totals = new Map<number, ArtistTotal>();
  for (const s of streams) {
    let total = totals.get(s.artist);
    if (!total) {
      totals.set(s.artist, (total = { artist: s.artist, ms: 0, plays: 0 }));
    }
    total.ms += s.ms;
    if (isPlay(s)) total.plays++;
  }
  return [...totals.values()].sort((a, b) => b.ms - a.ms).slice(0, limit);
}

/**
 * Songs with at least one play, by plays, most first. Songs with the same
 * number of plays stay in the order they were first played.
 */
export function topSongs(streams: Stream[], limit = Infinity): SongTotal[] {
  const ms = new Map<number, number>();
  const totals = new Map<number, SongTotal>();
  for (const s of streams) {
    ms.set(s.song, (ms.get(s.song) ?? 0) + s.ms);
    if (!isPlay(s)) continue;
    let total = totals.get(s.song);
    if (!total) totals.set(s.song, (total = { song: s.song, plays: 0, ms: 0 }));
    total.plays++;
  }
  for (const total of totals.values()) total.ms = ms.get(total.song)!;
  return [...totals.values()].sort((a, b) => b.plays - a.plays).slice(0, limit);
}

/** The key with the highest count, or the first of them on a tie. */
export function topKey<K>(counts: Map<K, number>): K | null {
  let best: K | null = null;
  let bestCount = -Infinity;
  for (const [key, count] of counts) {
    if (count > bestCount) [best, bestCount] = [key, count];
  }
  return best;
}

/** Adds `n` to `key`'s count. */
export function count<K>(counts: Map<K, number>, key: K, n = 1): void {
  counts.set(key, (counts.get(key) ?? 0) + n);
}
