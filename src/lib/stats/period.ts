import type { History, Stream } from "../history.ts";

/** Local days from `first` to `last`, both included, like "2025-01-01". */
export interface Period {
  first: string;
  last: string;
}

/** From the first day with a stream to the last. */
export function wholeHistory({ streams }: History): Period {
  return { first: streams[0].day, last: streams[streams.length - 1].day };
}

/** The streams on days in `period`. */
export function streamsIn({ streams }: History, period: Period): Stream[] {
  return streams.filter((s) => inPeriod(s.day, period));
}

export function inPeriod(day: string, { first, last }: Period): boolean {
  return first <= day && day <= last;
}

/** Every month `period` touches, like "2025-01". */
export function months({ first, last }: Period): string[] {
  // Count months from year 0, so January 2025 is 2025 * 12
  const count = (day: string) =>
    Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
  const result: string[] = [];
  for (let n = count(first); n <= count(last); n++) {
    const month = String((n % 12) + 1).padStart(2, "0");
    result.push(`${Math.floor(n / 12)}-${month}`);
  }
  return result;
}
