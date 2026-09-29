import { useExports } from "./components/exports.ts";
import { FileDrop } from "./components/FileDrop.tsx";
import { TooltipProvider } from "./components/TooltipProvider.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { Welcome } from "./pages/Welcome.tsx";
import { YourData } from "./pages/YourData.tsx";

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
          <YourData
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
