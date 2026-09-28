// Days are "YYYY-MM-DD" strings, which sort and compare in date order.

/** When a stream ended, in this computer's timezone. */
export interface LocalTime {
  time: number; // milliseconds since 1970, as for Date
  day: string;
  hour: number;
  minute: number;
}

/**
 * Converts one of Spotify's endTimes, which are UTC to the minute ("2025-11-07
 * 23:59"), to local time, allowing for summer time.
 */
export function toLocal(endTime: string): LocalTime {
  const [year, month, day, hour, minute] = endTime.split(/[- :]/).map(Number);
  const time = Date.UTC(year, month - 1, day, hour, minute);
  const local = new Date(time);
  return {
    time,
    day: dayOf(local),
    hour: local.getHours(),
    minute: local.getMinutes(),
  };
}

/** "YYYY-MM-DD HH:MM" */
export function formatLocal({ day, hour, minute }: LocalTime): string {
  return `${day} ${pad(hour)}:${pad(minute)}`;
}

/** The day `n` days after `day`, or before it if `n` is negative. */
export function addDays(day: string, n: number): string {
  const date = new Date(`${day}T00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** How many days `to` is after `from`: 1 for the next day. */
export function daysBetween(from: string, to: string): number {
  return (
    (Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / 86_400_000
  );
}

/** 0 for Monday to 6 for Sunday. */
export function weekday(day: string): number {
  return (new Date(`${day}T00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * The ISO week, like "2025-W01". Weeks run Monday to Sunday and belong to the
 * year their Thursday is in, so a week never splits at New Year.
 */
export function isoWeek(day: string): string {
  const thursday = addDays(day, 3 - weekday(day));
  const year = thursday.slice(0, 4);
  const week = Math.floor(daysBetween(`${year}-01-01`, thursday) / 7) + 1;
  return `${year}-W${pad(week)}`;
}

function dayOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
