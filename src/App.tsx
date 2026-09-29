import { useExports } from "./components/exports.ts";
import { FileDrop } from "./components/FileDrop.tsx";
import { TooltipProvider } from "./components/TooltipProvider.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { Welcome } from "./pages/Welcome.tsx";
import { Overview } from "./pages/Overview.tsx";

export default function App() {
  const { exports, reading, notice, add, remove, removeFile } = useExports();
  return (
    <TooltipProvider>
      <TopBar />
      <FileDrop onDrop={add} />
      <main>
        {exports === null ? (
          <p className="lede opening">Opening your data…</p>
        ) : exports.length === 0 ? (
          <Welcome onAdd={add} reading={reading} notice={notice} />
        ) : (
          <Overview
            exports={exports}
            onAdd={add}
            onRemove={remove}
            onRemoveFile={removeFile}
            reading={reading}
            notice={notice}
          />
        )}
      </main>
    </TooltipProvider>
  );
}
