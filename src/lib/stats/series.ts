import { addDays, isoWeek, weekday } from "../dates.ts";
import { isPlay, type Stream } from "../history.ts";
import { inPeriod, months, type Period } from "./period.ts";
import { count, topKey } from "./top.ts";

export type Unit = "day" | "week" | "month";

/** Listening in one day, week or month. */
export interface Bucket {
  key: string; // "2025-01-15", "2025-W03" or "2025-01"
  first: string; // its first day
  last: string; // its last day
  ms: number;
  streams: number;
  plays: number;
  topArtist: number | null; // by listening time
  /** Whether it runs past the period or has days with no data. */
  partial: boolean;
}

/**
 * Listening in every day, week or month of `period`, including empty ones.
 * Weeks run Monday to Sunday. Streams outside the period are ignored.
 */
export function series(
  streams: Stream[],
  period: Period,
  unit: Unit,
  missingDays: string[],
): Bucket[] {
  const buckets: Bucket[] = [];
  const byFirstDay = new Map<string, Bucket>();
  for (let first = startOf(period.first, unit); first <= period.last;) {
    const next = following(first, unit);
    const last = addDays(next, -1);
    const bucket: Bucket = {
      key: keyOf(first, unit),
      first,
      last,
      ms: 0,
      streams: 0,
      plays: 0,
      topArtist: null,
      partial: first < period.first || last > period.last,
    };
    buckets.push(bucket);
    byFirstDay.set(first, bucket);
    first = next;
  }
  for (const day of missingDays) {
    if (inPeriod(day, period)) {
      byFirstDay.get(startOf(day, unit))!.partial = true;
    }
  }

  const artistMs = new Map<Bucket, Map<number, number>>();
  // The first day of each day's bucket, worked out once per day
  const firstDays = new Map<string, string>();
  for (const s of streams) {
    if (!inPeriod(s.day, period)) continue;
    let firstDay = firstDays.get(s.day);
    if (!firstDay) firstDays.set(s.day, (firstDay = startOf(s.day, unit)));
    const bucket = byFirstDay.get(firstDay)!;
    bucket.ms += s.ms;
    bucket.streams++;
    if (isPlay(s)) bucket.plays++;
    let perArtist = artistMs.get(bucket);
    if (!perArtist) artistMs.set(bucket, (perArtist = new Map()));
    count(perArtist, s.artist, s.ms);
  }
  for (const [bucket, perArtist] of artistMs) {
    bucket.topArtist = topKey(perArtist);
  }
  return buckets;
}

/** Listening time by weekday (Monday first) and hour of the day. */
export function weekdayHour(streams: Stream[]): number[][] {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const weekdays = new Map<string, number>();
  for (const s of streams) {
    let day = weekdays.get(s.day);
    if (day === undefined) weekdays.set(s.day, (day = weekday(s.day)));
    grid[day][s.hour] += s.ms;
  }
  return grid;
}

/**
 * Each of `artists`' listening time in each month of `period`: a row per
 * artist, in the order given, with a column per month.
 */
export function artistMonths(
  streams: Stream[],
  period: Period,
  artists: number[],
): number[][] {
  const columns = new Map(months(period).map((month, i) => [month, i]));
  const rows = new Map(
    artists.map((a) => [a, new Array<number>(columns.size).fill(0)]),
  );
  for (const s of streams) {
    const row = rows.get(s.artist);
    if (row && inPeriod(s.day, period))
      row[columns.get(s.day.slice(0, 7))!] += s.ms;
  }
  return artists.map((a) => rows.get(a)!);
}

function keyOf(first: string, unit: Unit): string {
  if (unit === "week") return isoWeek(first);
  if (unit === "month") return first.slice(0, 7);
  return first;
}

function startOf(day: string, unit: Unit): string {
  if (unit === "week") return addDays(day, -weekday(day));
  if (unit === "month") return `${day.slice(0, 7)}-01`;
  return day;
}

function following(first: string, unit: Unit): string {
  if (unit === "day") return addDays(first, 1);
  if (unit === "week") return addDays(first, 7);
  const [year, month] = [Number(first.slice(0, 4)), Number(first.slice(5, 7))];
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}
