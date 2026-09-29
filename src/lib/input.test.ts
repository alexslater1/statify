import { describe, expect, it } from "vitest";
import { daily, historyFile, zipOf } from "../test/fixtures.ts";
import { describePicked, readHistoryFiles, type PickedFile } from "./input.ts";

function picked(path: string, content: string | Uint8Array): PickedFile {
  return { path, file: new Blob([content as BlobPart]) };
}

/** A file that fails the test if it's read. */
function unreadable(path: string): PickedFile {
  const file = new Blob(["{}"]);
  const fail = () => {
    throw new Error(`${path} was read`);
  };
  file.text = fail;
  file.arrayBuffer = fail;
  return { path, file };
}

describe("readHistoryFiles", () => {
  const history = historyFile("export", 0, daily("2025-01-01", "2025-01-02"));

  it("reads history files where they are", async () => {
    expect(
      await readHistoryFiles([picked(history.path, history.text)]),
    ).toEqual([history]);
  });

  it("unpacks zips, whatever the case of .zip", async () => {
    const files = await readHistoryFiles([
      picked("downloads/my_spotify_data.ZIP", zipOf([history])),
    ]);
    expect(files).toEqual([
      {
        path: `downloads/my_spotify_data.ZIP/${history.path}`,
        text: history.text,
      },
    ]);
  });

  it("never reads other files", async () => {
    const files = await readHistoryFiles([
      unreadable("export/Payments.json"),
      unreadable("export/Userdata.json"),
      unreadable("export/StreamingHistory_music_0 (1).json"),
      unreadable("export/ReadMeFirst_AccountData.pdf"),
    ]);
    expect(files).toEqual([]);
  });

  it("keeps the order it was given", async () => {
    const other = historyFile("other", 1, daily("2025-02-01", "2025-02-01"));
    const files = await readHistoryFiles([
      picked("b.zip", zipOf([other])),
      picked(history.path, history.text),
    ]);
    expect(files.map((f) => f.path)).toEqual([
      `b.zip/${other.path}`,
      history.path,
    ]);
  });
});

describe("describePicked", () => {
  it("names one zip, file or folder", () => {
    expect(describePicked([picked("my_spotify_data.zip", "")])).toBe(
      "my_spotify_data.zip",
    );
    expect(
      describePicked([
        picked("2026-09/StreamingHistory_music_0.json", ""),
        picked("2026-09/StreamingHistory_music_1.json", ""),
      ]),
    ).toBe("2026-09");
  });

  it("counts loose files", () => {
    expect(
      describePicked([
        picked("StreamingHistory_music_0.json", ""),
        picked("StreamingHistory_music_1.json", ""),
      ]),
    ).toBe("2 files");
  });

  it("counts items once folders are involved", () => {
    expect(
      describePicked([
        picked("2025-11/StreamingHistory_music_0.json", ""),
        picked("2026-09/StreamingHistory_music_0.json", ""),
        picked("my_spotify_data.zip", ""),
      ]),
    ).toBe("3 items");
  });
});
