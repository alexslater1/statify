// Geometry shared by the charts, kept apart from the components so it can be
// tested on its own

import { addDays, daysBetween, weekday } from "../lib/dates.ts";

/** Where the left and right arrow keys lead along a row of marks. */
export function moveAlong(from: number, key: string, count: number) {
  const step = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  return step === 0 ? null : Math.max(0, Math.min(count - 1, from + step));
}

/**
 * A column rising from `base` to `top`, with rounded corners at the top only
 * (y grows downwards).
 */
export function columnPath(
  x: number,
  width: number,
  base: number,
  top: number,
) {
  const height = base - top;
  if (height <= 0) return "";
  const r = Math.min(4, width / 2, height);
  return (
    `M${x},${base}V${top + r}A${r},${r} 0 0 1 ${x + r},${top}` +
    `H${x + width - r}A${r},${r} 0 0 1 ${x + width},${top + r}V${base}Z`
  );
}

/**
 * Which of the marks with labels there's room to label, keeping every label
 * at least `gap` from the others. Marks in `first` are labelled before the
 * rest are fitted in around them, so months can line up with the years
 * under them. When the first two labels crowd each other the first is
 * dropped, so a year shows at its January rather than at a December that
 * starts the chart.
 */
export function spaced(
  labels: (string | undefined)[],
  middle: (i: number) => number,
  gap = 32,
  first: number[] = [],
): number[] {
  const labelled = labels.flatMap((label, i) => (label ? [i] : []));
  if (
    labelled.length > 1 &&
    labelled[0] === 0 &&
    middle(labelled[1]) - middle(0) < gap
  ) {
    labelled.shift();
  }
  const shown = first.filter((i) => labels[i]);
  for (const i of labelled) {
    if (shown.every((j) => j !== i && Math.abs(middle(i) - middle(j)) >= gap)) {
      shown.push(i);
    }
  }
  return shown.sort((a, b) => a - b);
}

/** Where arrow keys lead on a grid of marks numbered row by row. */
export function moveInGrid(
  from: number,
  key: string,
  rows: number,
  columns: number,
): number | null {
  const [row, column] = [Math.floor(from / columns), from % columns];
  const [dRow, dColumn] =
    key === "ArrowUp"
      ? [-1, 0]
      : key === "ArrowDown"
        ? [1, 0]
        : key === "ArrowLeft"
          ? [0, -1]
          : key === "ArrowRight"
            ? [0, 1]
            : [0, 0];
  if (dRow === 0 && dColumn === 0) return null;
  const clamp = (n: number, size: number) => Math.max(0, Math.min(size - 1, n));
  return clamp(row + dRow, rows) * columns + clamp(column + dColumn, columns);
}

/** The part of each calendar year between two days, both included. */
export function yearsBetween(
  first: string,
  last: string,
): { year: string; first: string; last: string }[] {
  const years = [];
  for (let y = Number(first.slice(0, 4)); y <= Number(last.slice(0, 4)); y++) {
    const year = String(y);
    years.push({
      year,
      first: first.startsWith(year) ? first : `${year}-01-01`,
      last: last.startsWith(year) ? last : `${year}-12-31`,
    });
  }
  return years;
}

/**
 * The column of a day in its year's calendar, where each column is a week
 * from Monday to Sunday and the week with 1 January is 0.
 */
export function weekColumn(day: string): number {
  const newYear = `${day.slice(0, 4)}-01-01`;
  return Math.floor((daysBetween(newYear, day) + weekday(newYear)) / 7);
}

/**
 * Where arrow keys lead in a calendar of weeks: left and right go a week,
 * up and down a day, staying between `first` and `last`.
 */
export function moveInCalendar(
  from: string,
  key: string,
  first: string,
  last: string,
): string | null {
  const days =
    key === "ArrowLeft"
      ? -7
      : key === "ArrowRight"
        ? 7
        : key === "ArrowUp"
          ? -1
          : key === "ArrowDown"
            ? 1
            : 0;
  if (days === 0) return null;
  const day = addDays(from, days);
  return day < first ? first : day > last ? last : day;
}
