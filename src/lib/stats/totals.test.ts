import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import { totals } from "./totals.ts";

describe("totals", () => {
  const { streams } = buildHistory(
    [
      stream("2025-01-01 09:00", "Paper Lanterns", "The Test Pilots", 180_000),
      stream("2025-01-01 09:05", "Night Bus", "The Test Pilots", 10_000),
      stream("2025-01-01 09:06", "Sundial", "Jo Example", 20_000),
      stream("2025-01-03 09:00", "Sundial", "Jo Example", 60_000),
    ],
    [],
  );
  const period = { first: "2025-01-01", last: "2025-01-05" };

  it("adds up time, streams and plays", () => {
    expect(totals(streams, period, [])).toMatchObject({
      ms: 270_000,
      streams: 4,
      plays: 2,
    });
  });

  it("counts only artists and songs played for 30 seconds or more", () => {
    const { streams } = buildHistory(
      [
        stream(
          "2025-01-01 09:00",
          "Paper Lanterns",
          "The Test Pilots",
          180_000,
        ),
        stream("2025-01-01 09:05", "Sundial", "Jo Example", 20_000),
      ],
      [],
    );
    expect(totals(streams, period, [])).toMatchObject({ artists: 1, songs: 1 });
  });

  it("counts days with any listening as active", () => {
    expect(totals(streams, period, []).activeDays).toBe(2);
  });

  it("leaves days with no data out of the period's days", () => {
    const result = totals(streams, period, ["2025-01-04", "2025-02-01"]);
    expect(result).toMatchObject({ days: 4, missingDays: 1 });
  });
});
