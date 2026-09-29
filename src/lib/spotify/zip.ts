import { unzipSync, type Unzipped } from "fflate";
import type { InputFile } from "./exports.ts";
import { historyFileNumber, splitPath } from "./files.ts";

/**
 * The StreamingHistory_music_N.json files in a zip, like the one Spotify
 * sends, as if the zip were a folder: "my_spotify_data.zip/Spotify Account
 * Data/StreamingHistory_music_0.json". Nothing else is unpacked, so files like
 * Payments.json are never read.
 */
export function historyFilesInZip(
  zipPath: string,
  bytes: Uint8Array,
): InputFile[] {
  let unzipped: Unzipped;
  try {
    unzipped = unzipSync(bytes, {
      filter: ({ name }) =>
        historyFileNumber(splitPath(name).fileName) !== null,
    });
  } catch {
    throw new Error(`${zipPath} isn't a zip file Statify can open`);
  }
  const decoder = new TextDecoder();
  return Object.entries(unzipped).map(([name, data]) => ({
    path: `${zipPath}/${name}`,
    text: decoder.decode(data),
  }));
}
