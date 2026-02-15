"use client";

export type OfflineWordbookItem = {
  term: string;
  meaning: string;
  pronunciation?: string | null;
};

export type OfflineWordbook = {
  id: number;
  title: string;
  description?: string | null;
  fromLang: string;
  toLang: string;
  ownerEmail?: string | null;
  savedAt: string;
  items: OfflineWordbookItem[];
};

const DB_NAME = "englishapp_offline_v1";
const DB_VERSION = 1;
const STORE = "wordbooks";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB.open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error ?? new Error("indexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function saveOfflineWordbook(wb: OfflineWordbook): Promise<void> {
  await withStore("readwrite", (store) => store.put(wb));
}

export async function getOfflineWordbook(id: number): Promise<OfflineWordbook | null> {
  const result = await withStore<OfflineWordbook | undefined>("readonly", (store) => store.get(id));
  return result ?? null;
}

export async function listOfflineWordbooks(): Promise<OfflineWordbook[]> {
  const items = await withStore<OfflineWordbook[]>("readonly", (store) => store.getAll());
  return (items ?? []).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function deleteOfflineWordbook(id: number): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

