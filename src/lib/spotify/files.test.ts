import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { historyFileNumber, parseHistoryFile, splitPath } from "./files.ts";

describe("splitPath", () => {
  it("splits off the folder", () => {
    expect(splitPath("exports/2026-09/StreamingHistory_music_0.json")).toEqual({
      folder: "exports/2026-09",
      fileName: "StreamingHistory_music_0.json",
    });
  });

  it("gives an empty folder for a bare file name", () => {
    expect(splitPath("StreamingHistory_music_0.json")).toEqual({
      folder: "",
      fileName: "StreamingHistory_music_0.json",
    });
  });
});

describe("historyFileNumber", () => {
  it("reads N from StreamingHistory_music_N.json", () => {
    expect(historyFileNumber("StreamingHistory_music_0.json")).toBe(0);
    expect(historyFileNumber("StreamingHistory_music_12.json")).toBe(12);
  });

  it.each([
    "StreamingHistory_music_3 (1).json",
    "StreamingHistory_music_.json",
    "StreamingHistory_music_0.json.bak",
    "streaminghistory_music_0.json",
    "StreamingHistory_podcast_0.json",
    "Streaming_History_Audio_2024_0.json",
    "Payments.json",
  ])("ignores %s", (name) => {
    expect(historyFileNumber(name)).toBeNull();
  });
});

describe("parseHistoryFile", () => {
  it("reads each stream's four fields and drops anything else", () => {
    const text = JSON.stringify([
      { ...stream("2025-03-01 09:15"), extra: true },
    ]);
    expect(parseHistoryFile("a.json", text)).toEqual([
      stream("2025-03-01 09:15"),
    ]);
  });

  it("reads an empty file as no streams", () => {
    expect(parseHistoryFile("a.json", "[]")).toEqual([]);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseHistoryFile("a.json", "[{")).toThrow(
      "a.json isn't valid JSON",
    );
  });

  it.each([
    ["an object", { endTime: "2025-03-01 09:15" }],
    [
      "a missing field",
      [{ endTime: "2025-03-01 09:15", artistName: "A", trackName: "B" }],
    ],
    ["msPlayed as text", [{ ...stream("2025-03-01 09:15"), msPlayed: "1000" }]],
    ["another date format", [stream("2025-03-01T09:15:00Z")]],
  ])("rejects %s", (_, data) => {
    expect(() => parseHistoryFile("a.json", JSON.stringify(data))).toThrow(
      "a.json doesn't look like Spotify streaming history",
    );
  });
});
