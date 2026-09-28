import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import { topArtists, topKey, topSongs } from "./top.ts";

const minutes = (n: number) => n * 60_000;

describe("topArtists", () => {
  it("ranks by listening time, not plays", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "Sundial", "Jo Example", minutes(10)),
        stream("2025-01-01 10:00", "A", "The Test Pilots", minutes(3)),
        stream("2025-01-01 10:03", "B", "The Test Pilots", minutes(3)),
        stream("2025-01-01 10:06", "C", "The Test Pilots", minutes(3)),
      ],
      [],
    );
    expect(topArtists(streams)).toEqual([
      { artist: 0, ms: minutes(10), plays: 1 },
      { artist: 1, ms: minutes(9), plays: 3 },
    ]);
  });

  it("keeps artists with the same time in the order they first appear", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "A", "The Test Pilots"),
        stream("2025-01-01 09:05", "B", "Jo Example"),
        stream("2025-01-01 09:10", "C", "Al Placeholder"),
      ],
      [],
    );
    expect(topArtists(streams, 2).map((a) => a.artist)).toEqual([0, 1]);
  });
});

describe("topSongs", () => {
  const { streams } = buildHistory(
    [
      stream("2025-01-01 09:00", "Paper Lanterns", "The Test Pilots", 10_000),
      stream("2025-01-01 09:05", "Sundial", "Jo Example"),
      stream("2025-01-01 09:10", "Paper Lanterns", "The Test Pilots"),
      stream("2025-01-01 09:15", "Night Bus", "The Test Pilots", 10_000),
      stream("2025-01-01 09:20", "Sundial", "Jo Example"),
    ],
    [],
  );

  it("ranks songs with a play by plays, and counts all their time", () => {
    expect(topSongs(streams)).toEqual([
      { song: 1, plays: 2, ms: 360_000 },
      { song: 0, plays: 1, ms: 190_000 },
    ]);
  });

  it("keeps songs with equal plays in the order they were first played", () => {
    // Paper Lanterns is streamed first but played second
    const first = streams.slice(0, 3);
    expect(topSongs(first).map((s) => s.song)).toEqual([1, 0]);
  });
});

describe("topKey", () => {
  it("picks the highest count, or the first on a tie", () => {
    expect(
      topKey(
        new Map([
          ["a", 1],
          ["b", 3],
          ["c", 3],
        ]),
      ),
    ).toBe("b");
    expect(topKey(new Map([["a", 0]]))).toBe("a");
    expect(topKey(new Map())).toBeNull();
  });
});
