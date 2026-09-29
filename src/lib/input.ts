import type { InputFile } from "./spotify/exports.ts";
import { historyFileNumber, splitPath } from "./spotify/files.ts";
import { historyFilesInZip } from "./spotify/zip.ts";

/** A file the user chose or dropped, with its path inside what they chose. */
export interface PickedFile {
  path: string;
  file: Blob;
}

/**
 * The streaming history files among `picked`, unpacking zips. Other files,
 * like Payments.json, are skipped without being read.
 */
export async function readHistoryFiles(
  picked: PickedFile[],
): Promise<InputFile[]> {
  const files: InputFile[] = [];
  for (const { path, file } of picked) {
    const { fileName } = splitPath(path);
    if (isZip(fileName)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      files.push(...historyFilesInZip(path, bytes));
    } else if (historyFileNumber(fileName) !== null) {
      files.push({ path, text: await file.text() });
    }
  }
  return files;
}

/** What the user chose, for messages: "my_spotify_data.zip" or "3 files". */
export function describePicked(picked: PickedFile[]): string {
  const tops = new Set(picked.map(({ path }) => path.split("/")[0]));
  if (tops.size === 1) return [...tops][0];
  const folders = picked.some(({ path }) => path.includes("/"));
  return `${tops.size} ${folders ? "items" : "files"}`;
}

/** The files from a file input. */
export function pickedFiles(list: FileList): PickedFile[] {
  return [...list].map((file) => ({ path: file.name, file }));
}

/**
 * The files dropped on the page, including what's in dropped folders. Call it
 * during the drop event, since the browser forgets what was dropped once the
 * event is over.
 */
export async function droppedFiles(data: DataTransfer): Promise<PickedFile[]> {
  const entries = [...data.items]
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry())
    .filter((entry) => entry !== null);
  if (entries.length === 0) return pickedFiles(data.files);
  return (await Promise.all(entries.map(filesIn))).flat();
}

async function filesIn(entry: FileSystemEntry): Promise<PickedFile[]> {
  const path = entry.fullPath.replace(/^\//, "");
  if (entry.isFile) {
    if (!isZip(entry.name) && historyFileNumber(entry.name) === null) return [];
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return [{ path, file }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children: FileSystemEntry[] = [];
    // Browsers list a folder in batches, ending with an empty one
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      children.push(...batch);
    }
    return (await Promise.all(children.map(filesIn))).flat();
  }
  return [];
}

function isZip(fileName: string): boolean {
  return /\.zip$/i.test(fileName);
}
