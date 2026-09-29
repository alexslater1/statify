import { useEffect, useEffectEvent, useState } from "react";
import { droppedFiles, type PickedFile } from "../lib/input.ts";
import "../styles/file-drop.css";

/**
 * Lets files be dropped anywhere on the page, showing where they'll go while
 * they're dragged over it. Without this, a browser opens a file dropped just
 * outside a drop zone in place of the app.
 */
export function FileDrop({ onDrop }: { onDrop(picked: PickedFile[]): void }) {
  const [dragging, setDragging] = useState(false);
  const drop = useEffectEvent((data: DataTransfer) => {
    // Called during the drop event, before the browser forgets the files
    droppedFiles(data).then(onDrop, () => {});
  });

  useEffect(() => {
    // Entering a child element fires before leaving its parent, so count
    let depth = 0;
    const files = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!files(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (!files(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!files(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const land = (e: DragEvent) => {
      if (!files(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      drop(e.dataTransfer!);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", land);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", land);
    };
  }, []);

  return (
    dragging && (
      <div className="file-drop" aria-hidden="true">
        <p>Drop to add your Spotify data</p>
      </div>
    )
  );
}
