// How numbers, dates and lists read on the page, in British English

import { toLocal } from "./dates.ts";

export const MONTHS = [
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
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const NUMBER = new Intl.NumberFormat("en-GB");
const ONE_PLACE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** 12345 as "12,345". */
export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

/** Up to one decimal place: 1.25 as "1.3", 1234 as "1,234". */
export function formatDecimal(n: number): string {
  return ONE_PLACE.format(n);
}

/** A share as a percentage: 0.1234 as "12.3%". */
export function formatPercent(share: number): string {
  return `${ONE_PLACE.format(share * 100)}%`;
}

/** Listening time in hours, with a decimal under 10: "1.5 h", "1,234 h". */
export function formatHours(ms: number): string {
  const hours = ms / 3_600_000;
  return `${hours < 10 ? formatDecimal(hours) : formatNumber(Math.round(hours))} h`;
}

/** Listening time to the minute: "45 min", "2 h 5 min", "3 h". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
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

/** "2025-11-07" as "Fri 7 Nov 2025". */
export function formatDayLong(day: string): string {
  const weekday = (new Date(`${day}T00:00Z`).getUTCDay() + 6) % 7;
  return `${WEEKDAYS[weekday].slice(0, 3)} ${formatDay(day)}`;
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

/**
 * Two of Spotify's endTimes, which are UTC, as the local days they fall on:
 * "6 Nov 2024 – 7 Nov 2025".
 */
export function formatEndTimes(from: string, to: string): string {
  return formatDays(toLocal(from).day, toLocal(to).day);
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
