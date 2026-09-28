import type { Stream } from "../history.ts";

/** A break of more than this between streams starts a new session. */
export const SESSION_BREAK_MS = 30 * 60_000;

/** A stretch of listening without a break of more than 30 minutes. */
export interface Session {
  first: number; // index of its first stream
  last: number; // index of its last stream
  start: number; // when it started, in milliseconds since 1970
  end: number; // when it ended
  ms: number; // listening time
}

/** Splits streams, which must be in time order, into sessions. */
export function sessions(streams: Stream[]): Session[] {
  const result: Session[] = [];
  let current: Session | undefined;
  streams.forEach((s, i) => {
    const start = s.time - s.ms;
    if (current && start - current.end <= SESSION_BREAK_MS) {
      current.last = i;
      current.start = Math.min(current.start, start);
      current.end = Math.max(current.end, s.time);
      current.ms += s.ms;
    } else {
      current = { first: i, last: i, start, end: s.time, ms: s.ms };
      result.push(current);
    }
  });
  return result;
}

/** The sessions with the most listening, most first; the earlier on a tie. */
export function longestSessions(
  streams: Stream[],
  limit = Infinity,
): Session[] {
  return sessions(streams)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit);
}
