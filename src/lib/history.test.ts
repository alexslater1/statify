import { describe, expect, it } from "vitest";
import { stream } from "../test/fixtures.ts";
import { buildHistory, isPlay } from "./history.ts";

describe("buildHistory", () => {
  it("drops streams with an unknown artist", () => {
    const history = buildHistory(
      [
        stream("2025-01-01 10:00"),
        stream("2025-01-02 10:00", "Track", "Unknown Artist"),
      ],
      [],
    );
    expect(history.streams).toHaveLength(1);
    expect(history.artists.map((a) => a.name)).toEqual(["The Test Pilots"]);
  });

  it("puts streams in time order, in local time", () => {
    const history = buildHistory(
      [stream("2025-07-01 23:30"), stream("2025-01-15 09:00")],
      [],
    );
    expect(history.streams).toEqual([
      {
        time: Date.UTC(2025, 0, 15, 9),
        day: "2025-01-15",
        hour: 9,
        artist: 0,
        song: 0,
        ms: 180_000,
      },
      {
        time: Date.UTC(2025, 6, 1, 23, 30),
        day: "2025-07-02",
        hour: 0,
        artist: 0,
        song: 0,
        ms: 180_000,
      },
    ]);
  });

  it("matches spellings of a song and shows the newest", () => {
    const history = buildHistory(
      [
        stream("2025-02-01 10:00", "Paper Lanterns", "The Test Pilots"),
        stream(
          "2025-01-01 10:00",
          "Paper lanterns - Remastered",
          "The Test pilots",
        ),
      ],
      [],
    );
    expect(history.streams.map((s) => s.song)).toEqual([0, 0]);
    expect(history.songs).toEqual([
      { id: 0, key: "paperlanterns", title: "Paper Lanterns", artist: 0 },
    ]);
    expect(history.artists).toEqual([
      { id: 0, key: "thetestpilots", name: "The Test Pilots" },
    ]);
  });

  it("keeps songs by different artists apart, even with the same title", () => {
    const history = buildHistory(
      [
        stream("2025-01-01 10:00", "Paper Lanterns", "The Test Pilots"),
        stream("2025-01-01 10:05", "Paper Lanterns", "Jo Example"),
      ],
      [],
    );
    expect(history.songs.map((s) => [s.title, s.artist])).toEqual([
      ["Paper Lanterns", 0],
      ["Paper Lanterns", 1],
    ]);
  });

  it("numbers artists and songs in the order they're first played", () => {
    const history = buildHistory(
      [
        stream("2025-01-03 10:00", "Sun Dial", "Jo Example"),
        stream("2025-01-01 10:00", "Paper Lanterns", "The Test Pilots"),
        stream("2025-01-02 10:00", "Night Bus", "The Test Pilots"),
      ],
      [],
    );
    expect(history.artists.map((a) => a.name)).toEqual([
      "The Test Pilots",
      "Jo Example",
    ]);
    expect(history.songs.map((s) => [s.title, s.artist])).toEqual([
      ["Paper Lanterns", 0],
      ["Night Bus", 0],
      ["Sun Dial", 1],
    ]);
  });

  it("counts the whole local days inside a gap as missing", () => {
    const { missingDays } = buildHistory(
      [],
      [{ from: "2025-01-10 12:00", to: "2025-01-14 12:00" }],
    );
    expect(missingDays).toEqual(["2025-01-11", "2025-01-12", "2025-01-13"]);
  });

  it("finds no missing days in a gap without a whole day", () => {
    const { missingDays } = buildHistory(
      [],
      [{ from: "2025-01-10 12:00", to: "2025-01-11 23:00" }],
    );
    expect(missingDays).toEqual([]);
  });

  it("works out gaps and missing days in local time", () => {
    const history = buildHistory(
      [],
      [{ from: "2025-07-10 23:30", to: "2025-07-13 23:30" }],
    );
    expect(history.gaps).toEqual([
      { from: "2025-07-11 00:30", to: "2025-07-14 00:30" },
    ]);
    expect(history.missingDays).toEqual(["2025-07-12", "2025-07-13"]);
  });
});

describe("isPlay", () => {
  it("counts a stream as a play from 30 seconds", () => {
    const [short, play] = buildHistory(
      [
        stream("2025-01-01 10:00", "A", "B", 29_999),
        stream("2025-01-01 10:01", "A", "B", 30_000),
      ],
      [],
    ).streams;
    expect(isPlay(short)).toBe(false);
    expect(isPlay(play)).toBe(true);
  });
});
