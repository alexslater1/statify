import { addDays, formatLocal, toLocal } from "./dates.ts";
import { matchKey, songTitle } from "./names.ts";
import type { Range } from "./spotify/exports.ts";
import type { StreamRecord } from "./spotify/files.ts";

export interface Artist {
  id: number;
  key: string; // see matchKey
  name: string; // the newest spelling
}

export interface Song {
  id: number;
  key: string; // see matchKey; only unique for one artist
  title: string; // the newest spelling, without tags like "Remastered"
  artist: number;
}

export interface Stream {
  time: number; // when it ended, in milliseconds since 1970
  day: string; // local "YYYY-MM-DD"
  hour: number; // local
  artist: number;
  song: number;
  ms: number; // how long it played
}

/** Spotify counts a stream as a play once it passes 30 seconds. */
export const PLAY_MS = 30_000;

export function isPlay(stream: Stream): boolean {
  return stream.ms >= PLAY_MS;
}

export interface History {
  streams: Stream[]; // oldest first
  artists: Artist[]; // indexed by ID
  songs: Song[]; // indexed by ID
  /** Stretches no export covers, as local "YYYY-MM-DD HH:MM". */
  gaps: Range[];
  /** Local days wholly inside a gap: "no data", not "no listening". */
  missingDays: string[];
}

/**
 * Turns merged streams into a history: unknown artists dropped, times in local
 * time, and each song and artist matched across spellings and given an ID.
 * Songs by different artists never match, even with the same title. `gaps` are
 * from findGaps.
 */
export function buildHistory(records: StreamRecord[], gaps: Range[]): History {
  const artists: Artist[] = [];
  const songs: Song[] = [];
  const artistIds = new Map<string, number>();
  const songIds = new Map<string, number>(); // by artist ID and song key
  const streams: Stream[] = [];

  const sorted = records
    .filter((r) => r.artistName !== "Unknown Artist")
    .sort((a, b) =>
      a.endTime < b.endTime ? -1 : a.endTime > b.endTime ? 1 : 0,
    );
  for (const r of sorted) {
    // Oldest first, so the newest spelling of each name wins
    const artistKey = matchKey(r.artistName);
    let artist = artistIds.get(artistKey);
    if (artist === undefined) {
      artist = artists.length;
      artistIds.set(artistKey, artist);
      artists.push({ id: artist, key: artistKey, name: r.artistName });
    }
    artists[artist].name = r.artistName;

    const title = songTitle(r.trackName);
    const songKey = matchKey(title);
    let song = songIds.get(`${artist} ${songKey}`);
    if (song === undefined) {
      song = songs.length;
      songIds.set(`${artist} ${songKey}`, song);
      songs.push({ id: song, key: songKey, title, artist });
    }
    songs[song].title = title;

    const { time, day, hour } = toLocal(r.endTime);
    streams.push({ time, day, hour, artist, song, ms: r.msPlayed });
  }

  const localGaps = gaps.map(({ from, to }) => ({
    from: formatLocal(toLocal(from)),
    to: formatLocal(toLocal(to)),
  }));
  const missingDays: string[] = [];
  for (const { from, to } of localGaps) {
    const last = to.slice(0, 10);
    for (
      let day = addDays(from.slice(0, 10), 1);
      day < last;
      day = addDays(day, 1)
    ) {
      missingDays.push(day);
    }
  }

  return {
    streams,
    artists,
    songs,
    gaps: localGaps,
    missingDays: [...new Set(missingDays)].sort(),
  };
}
