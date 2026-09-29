import { useRef, type ChangeEvent } from "react";
import { pickedFiles, type PickedFile } from "../lib/input.ts";
import "../styles/add-files.css";
import "../styles/button.css";
import type { Notice } from "./exports.ts";

interface AddFilesProps {
  onAdd(picked: PickedFile[]): void;
  reading: string | null;
  notice: Notice | null;
}

/**
 * A button to choose a zip or history files, and how adding them went. A
 * folder can't be chosen with the same button, so folders are dropped instead.
 */
export function AddFiles({ onAdd, reading, notice }: AddFilesProps) {
  const files = useRef<HTMLInputElement>(null);

  const choose = (e: ChangeEvent<HTMLInputElement>) => {
    onAdd(pickedFiles(e.currentTarget.files!));
    // So choosing the same file again still counts as a change
    e.currentTarget.value = "";
  };

  return (
    <div className="add-files">
      <button
        type="button"
        className="button primary"
        disabled={reading !== null}
        onClick={() => files.current!.click()}
      >
        Choose files
      </button>
      <input
        ref={files}
        type="file"
        accept=".zip,.json"
        multiple
        hidden
        onChange={choose}
      />
      <p className="add-files-status" role="status">
        {reading !== null ? (
          `Reading ${reading}…`
        ) : notice ? (
          <>
            <span
              className={notice.error ? "status-icon error" : "status-icon"}
              aria-hidden="true"
            >
              {notice.error ? "!" : "✓"}
            </span>
            {notice.text}
          </>
        ) : null}
      </p>
    </div>
  );
}
