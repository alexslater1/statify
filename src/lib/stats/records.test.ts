import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import {
  artistStreaks,
  biggestDays,
  longestStreak,
  repeats,
  songStreaks,
} from "./records.ts";

describe("longestStreak", () => {
  it("finds the longest run of consecutive days", () => {
    expect(
      longestStreak([
        "2025-01-01",
        "2025-01-02",
        "2025-01-04",
        "2025-01-05",
        "2025-01-06",
      ]),
    ).toEqual({
      days: 3,
      first: "2025-01-04",
      last: "2025-01-06",
    });
  });

  it("picks the earliest run on a tie", () => {
    expect(
      longestStreak(["2025-01-01", "2025-01-02", "2025-01-04", "2025-01-05"]),
    ).toMatchObject({
      first: "2025-01-01",
    });
  });

  it("runs across the end of a month", () => {
    expect(longestStreak(["2025-01-31", "2025-02-01"]).days).toBe(2);
  });

  it("is empty without days", () => {
    expect(longestStreak([]).days).toBe(0);
  });
});

describe("songStreaks", () => {
  it("counts only days with a play", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "Paper Lanterns"),
        stream("2025-01-02 09:00", "Paper Lanterns", undefined, 10_000),
        stream("2025-01-03 09:00", "Paper Lanterns"),
      ],
      [],
    );
    expect(songStreaks(streams)).toEqual([
      { song: 0, days: 1, first: "2025-01-01", last: "2025-01-01" },
    ]);
  });

  it("puts the song with more plays first on a tie", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "Paper Lanterns"),
        stream("2025-01-01 10:00", "Sundial"),
        stream("2025-01-01 11:00", "Sundial"),
      ],
      [],
    );
    expect(songStreaks(streams).map((s) => s.song)).toEqual([1, 0]);
  });
});

describe("artistStreaks", () => {
  it("puts the artist with more listening time first on a tie", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "A", "Jo Example", 60_000),
        stream("2025-01-02 09:00", "A", "Jo Example", 10_000), // not a play
        stream("2025-01-01 10:00", "B", "The Test Pilots", 120_000),
      ],
      [],
    );
    expect(artistStreaks(streams)).toEqual([
      { artist: 1, days: 1, first: "2025-01-01", last: "2025-01-01" },
      { artist: 0, days: 1, first: "2025-01-01", last: "2025-01-01" },
    ]);
  });
});

describe("biggestDays", () => {
  const { streams } = buildHistory(
    [
      stream("2025-01-01 09:00", "Paper Lanterns", "The Test Pilots", 60_000),
      stream("2025-01-02 09:00", "Sundial", "Jo Example", 240_000),
      stream("2025-01-02 09:10", "Night Bus", "The Test Pilots", 100_000),
      stream("2025-01-02 09:20", "Night Bus", "The Test Pilots", 100_000),
      stream("2025-01-03 09:00", "Paper Lanterns", "The Test Pilots", 20_000),
      stream("2025-01-04 09:00", "Sundial", "Jo Example", 60_000),
    ],
    [],
  );

  it("ranks days by listening time, the earlier first on a tie", () => {
    expect(biggestDays(streams).map((d) => [d.day, d.ms])).toEqual([
      ["2025-01-02", 440_000],
      ["2025-01-01", 60_000],
      ["2025-01-04", 60_000],
      ["2025-01-03", 20_000],
    ]);
  });

  it("names the day's top artist by time and top song by plays", () => {
    // Jo Example has more time with one Sundial; Night Bus has two plays
    expect(biggestDays(streams, 1)).toEqual([
      { day: "2025-01-02", ms: 440_000, topArtist: 1, topSong: 2 },
    ]);
  });

  it("has no top song on a day without a play", () => {
    expect(
      biggestDays(streams).find((d) => d.day === "2025-01-03")?.topSong,
    ).toBeNull();
  });
});

describe("repeats", () => {
  it("finds the most plays of a song in a day, earlier first on a tie", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "Paper Lanterns"),
        stream("2025-01-01 09:05", "Paper Lanterns"),
        stream("2025-01-01 09:10", "Paper Lanterns", undefined, 10_000),
        stream("2025-01-02 09:00", "Sundial"),
        stream("2025-01-02 09:05", "Sundial"),
        stream("2025-01-02 09:10", "Sundial"),
        stream("2025-01-03 09:00", "Paper Lanterns"),
        stream("2025-01-03 09:05", "Paper Lanterns"),
      ],
      [],
    );
    expect(repeats(streams)).toEqual([
      { day: "2025-01-02", song: 1, plays: 3 },
      { day: "2025-01-01", song: 0, plays: 2 },
      { day: "2025-01-03", song: 0, plays: 2 },
    ]);
  });
});
