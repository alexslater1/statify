import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import { months, streamsIn, wholeHistory } from "./period.ts";

const history = buildHistory(
  [
    stream("2025-01-01 09:00"),
    stream("2025-01-02 09:00"),
    stream("2025-01-03 09:00"),
    stream("2025-07-01 23:30"), // 00:30 on 2 July in UK summer time
  ],
  [],
);

describe("wholeHistory", () => {
  it("runs from the first local day with a stream to the last", () => {
    expect(wholeHistory(history)).toEqual({
      first: "2025-01-01",
      last: "2025-07-02",
    });
  });
});

describe("streamsIn", () => {
  it("includes both ends of the period", () => {
    const streams = streamsIn(history, {
      first: "2025-01-02",
      last: "2025-01-03",
    });
    expect(streams.map((s) => s.day)).toEqual(["2025-01-02", "2025-01-03"]);
  });

  it("goes by local days", () => {
    expect(
      streamsIn(history, { first: "2025-07-01", last: "2025-07-01" }),
    ).toEqual([]);
  });
});

describe("months", () => {
  it("lists every month the period touches", () => {
    expect(months({ first: "2024-11-15", last: "2025-02-01" })).toEqual([
      "2024-11",
      "2024-12",
      "2025-01",
      "2025-02",
    ]);
    expect(months({ first: "2025-03-01", last: "2025-03-31" })).toEqual([
      "2025-03",
    ]);
  });
});
