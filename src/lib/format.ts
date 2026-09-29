// How numbers, dates and lists read on the page, in British English

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const NUMBER = new Intl.NumberFormat("en-GB");

/** 12345 as "12,345". */
export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

/** How many of something: "1 stream", "12,345 streams". */
export function countOf(n: number, one: string, many = `${one}s`): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

/** "2025-11-07" as "7 Nov 2025". */
export function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

/** "2025-11" as "Nov 2025". */
export function formatMonth(month: string): string {
  const [year, n] = month.split("-").map(Number);
  return `${MONTHS[n - 1]} ${year}`;
}

/** Two days, giving the year once if they share it: "18 Sep – 7 Nov 2025". */
export function formatDays(from: string, to: string): string {
  if (from === to) return formatDay(from);
  const start = formatDay(from);
  return from.slice(0, 4) === to.slice(0, 4)
    ? `${start.slice(0, -5)} – ${formatDay(to)}`
    : `${start} – ${formatDay(to)}`;
}

/** A local "YYYY-MM-DD HH:MM" as "7 Nov 2025, 16:32". */
export function formatMinute(minute: string): string {
  return `${formatDay(minute.slice(0, 10))}, ${minute.slice(11)}`;
}

/** A stretch of time, roughly: "3 days", "5 hours", "20 minutes". */
export function formatLength(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes >= 2 * 24 * 60) return countOf(Math.floor(minutes / 1440), "day");
  if (minutes >= 60) return countOf(Math.round(minutes / 60), "hour");
  return countOf(minutes, "minute");
}

/** "a", "a and b", "a, b and c" */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
