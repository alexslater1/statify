import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import { longestSessions, sessions } from "./sessions.ts";

// Three-minute streams, so each started three minutes before it ended
const { streams } = buildHistory(
  [
    stream("2025-01-01 10:03"),
    stream("2025-01-01 10:36"), // started 10:33, 30 min after the last ended
    stream("2025-01-01 11:10"), // started 11:07, 31 minutes after
    stream("2025-01-01 11:13"),
    stream("2025-01-01 11:16"),
  ],
  [],
);

describe("sessions", () => {
  it("starts a new session after a break of more than 30 minutes", () => {
    expect(sessions(streams)).toEqual([
      {
        first: 0,
        last: 1,
        start: Date.UTC(2025, 0, 1, 10, 0),
        end: Date.UTC(2025, 0, 1, 10, 36),
        ms: 360_000,
      },
      {
        first: 2,
        last: 4,
        start: Date.UTC(2025, 0, 1, 11, 7),
        end: Date.UTC(2025, 0, 1, 11, 16),
        ms: 540_000,
      },
    ]);
  });

  it("finds none without streams", () => {
    expect(sessions([])).toEqual([]);
  });
});

describe("longestSessions", () => {
  it("ranks sessions by listening time", () => {
    expect(longestSessions(streams).map((s) => s.first)).toEqual([2, 0]);
    expect(longestSessions(streams, 1)).toHaveLength(1);
  });
});
