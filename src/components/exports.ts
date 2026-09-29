import { useCallback, useEffect, useRef, useState } from "react";
import { countOf, formatList } from "../lib/format.ts";
import {
  describePicked,
  readHistoryFiles,
  type PickedFile,
} from "../lib/input.ts";
import { addExports, openSaved } from "../lib/saved.ts";
import { withoutFile, type Export } from "../lib/spotify/exports.ts";
import {
  forgetExports,
  forgetFile,
  saveExports,
  savedExports,
} from "../lib/storage.ts";

/** How the last change went, to show the user. */
export interface Notice {
  error: boolean;
  text: string;
}

export interface Exports {
  /** null until the exports kept in this browser are open. */
  exports: Export[] | null;
  /** What's being read, while files are being added. */
  reading: string | null;
  notice: Notice | null;
  add(picked: PickedFile[]): void;
  remove(name: string): void;
  /**
   * Removes one StreamingHistory_music_N.json file from an export, and the
   * export with its last file.
   */
  removeFile(name: string, number: number): void;
}

/**
 * The exports the user has added, kept in this browser so they're still there
 * next time. Adds happen one at a time: files chosen while others are being
 * read, or before the saved exports are open, are ignored.
 */
export function useExports(): Exports {
  const [exports, setExports] = useState<Export[] | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Read by adds after they've waited for files, so they see any removals
  const current = useRef<Export[]>([]);
  const busy = useRef(true);

  const show = useCallback((next: Export[]) => {
    current.current = next;
    setExports(next);
  }, []);

  useEffect(() => {
    let open = true;
    savedExports()
      .catch(() => [])
      .then((saved) => {
        if (!open) return;
        const { exports, broken } = openSaved(saved);
        show(exports);
        busy.current = false;
        if (broken.length > 0) {
          forgetExports(broken).catch(() => {});
          const them = broken.length === 1 ? "it" : "them";
          setNotice({
            error: true,
            text: `Couldn't open ${formatList(broken)} from this browser's storage, so Statify removed ${them}. You can add ${them} again.`,
          });
        }
      });
    return () => {
      open = false;
    };
  }, [show]);

  const add = useCallback(
    async (picked: PickedFile[]) => {
      if (busy.current || picked.length === 0) return;
      busy.current = true;
      const what = describePicked(picked);
      setReading(what);
      setNotice(null);
      try {
        const files = await readHistoryFiles(picked);
        const added = addExports(current.current, files);
        if (added.exports.length === 0) {
          setNotice(
            added.duplicates > 0
              ? {
                  error: false,
                  text: `Everything in ${what} is already added.`,
                }
              : {
                  error: true,
                  text: `There's no Spotify streaming history in ${what}. Statify reads the StreamingHistory_music files in Spotify's Account data export.`,
                },
          );
          return;
        }
        show([...current.current, ...added.exports]);
        let text = `Added ${countOf(added.exports.length, "export")} from ${what}`;
        if (added.duplicates > 0) {
          text += `. ${countOf(added.duplicates, "other")} ${added.duplicates === 1 ? "was" : "were"} already added`;
        }
        try {
          await saveExports(added.saved);
          setNotice({ error: false, text: `${text}.` });
        } catch {
          const them = added.exports.length === 1 ? "it" : "them";
          setNotice({
            error: true,
            text: `${text}, but couldn't keep ${them} in this browser, so you'll need to add ${them} again next time.`,
          });
        }
      } catch (e) {
        // Say what's wrong with the files, but not the browser's own wording
        const problem =
          e instanceof Error && !(e instanceof DOMException)
            ? e.message
            : `Couldn't read ${what}`;
        setNotice({ error: true, text: `${problem}, so nothing was added.` });
      } finally {
        busy.current = false;
        setReading(null);
      }
    },
    [show],
  );

  const remove = useCallback(
    (name: string) => {
      show(current.current.filter((ex) => ex.name !== name));
      setNotice({ error: false, text: `Removed ${name}.` });
      forgetExports([name]).catch(() =>
        setNotice({
          error: true,
          text: `Removed ${name}, but couldn't delete it from this browser's storage, so it'll be back next time.`,
        }),
      );
    },
    [show],
  );

  const removeFile = useCallback(
    (name: string, number: number) => {
      const ex = current.current.find((e) => e.name === name);
      if (!ex) return;
      const rest = withoutFile(ex, number);
      show(
        rest
          ? current.current.map((e) => (e === ex ? rest : e))
          : current.current.filter((e) => e !== ex),
      );
      const file = `StreamingHistory_music_${number}.json`;
      setNotice({
        error: false,
        text: rest
          ? `Removed ${file} from ${name}.`
          : `Removed ${file}, the last file in ${name}, so the export is gone too.`,
      });
      // Without its last file, the whole export goes
      (rest ? forgetFile(name, number) : forgetExports([name])).catch(() =>
        setNotice({
          error: true,
          text: `Removed ${file} from ${name}, but couldn't delete it from this browser's storage, so it'll be back next time.`,
        }),
      );
    },
    [show],
  );

  return { exports, reading, notice, add, remove, removeFile };
}
