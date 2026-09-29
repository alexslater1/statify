import { withoutSavedFile, type SavedExport } from "./saved.ts";

// Exports are kept in IndexedDB, in this browser only, so they're still there
// next time. localStorage holds only a few megabytes.
const DATABASE = "statify";
const STORE = "exports";

/** The exports kept in this browser. */
export async function savedExports(): Promise<SavedExport[]> {
  const request = await inStore("readonly", (store) => store.getAll());
  return request.result as SavedExport[];
}

export function saveExports(exports: SavedExport[]): Promise<void> {
  return inStore("readwrite", (store) => {
    for (const ex of exports) store.put(ex);
  });
}

export function forgetExports(names: string[]): Promise<void> {
  return inStore("readwrite", (store) => {
    for (const name of names) store.delete(name);
  });
}

/** Forgets one of an export's files, or the export if it was the last. */
export function forgetFile(name: string, number: number): Promise<void> {
  return inStore("readwrite", (store) => {
    const request = store.get(name);
    request.onsuccess = () => {
      if (!request.result) return;
      const rest = withoutSavedFile(request.result as SavedExport, number);
      if (rest.files.length > 0) store.put(rest);
      else store.delete(name);
    };
  });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "name" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Does `work` in one transaction, and resolves once it's all written. */
async function inStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => T,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const result = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
