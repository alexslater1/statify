import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import { newArtists } from "./discovery.ts";

const history = buildHistory(
  [
    stream("2024-12-10 09:00", "A", "The Test Pilots"),
    stream("2025-01-05 09:00", "A", "The Test Pilots"),
    stream("2025-01-06 09:00", "B", "Jo Example"),
    // Too short to count as a play
    stream("2025-01-07 09:00", "C", "Al Placeholder", 10_000),
    stream("2025-02-02 09:00", "C", "Al Placeholder", 60_000),
    stream("2025-02-03 09:00", "D", "Bo Sample", 240_000),
  ],
  [],
);
const name = (id: number) => history.artists[id].name;

describe("newArtists", () => {
  it("lists artists by the month of their first play", () => {
    const result = newArtists(history, {
      first: "2024-12-01",
      last: "2025-03-31",
    });
    // December, when the history starts, is left out
    expect(result.map((m) => [m.month, m.artists.map(name)])).toEqual([
      ["2025-01", ["Jo Example"]],
      ["2025-02", ["Bo Sample", "Al Placeholder"]], // most listened to first
      ["2025-03", []],
    ]);
  });

  it("only counts an artist as new the first time they're ever played", () => {
    const result = newArtists(history, {
      first: "2025-01-01",
      last: "2025-01-31",
    });
    expect(result.map((m) => [m.month, m.artists.map(name)])).toEqual([
      ["2025-01", ["Jo Example"]],
    ]);
  });
});
