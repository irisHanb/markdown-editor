import { type Doc, type Folder, type Meta, newDoc, newFolder, type Repository } from "./repository";

/** IndexedDB를 열 수 없을 때 쓰는 대체 저장소 — 새로고침하면 사라진다 (spec Edge Cases). */
export function createMemoryRepository(): Repository {
  const folders = new Map<string, Folder>();
  const docs = new Map<string, Doc>();
  const meta: Partial<Meta> = {};

  const mustFolder = (id: string) => {
    const f = folders.get(id);
    if (!f) throw new Error(`folder ${id} 없음`);
    return f;
  };
  const mustDoc = (id: string) => {
    const d = docs.get(id);
    if (!d) throw new Error(`document ${id} 없음`);
    return d;
  };

  return {
    listFolders: async () => [...folders.values()].map((f) => ({ ...f })),
    listDocuments: async () => [...docs.values()].map((d) => ({ ...d })),
    getDocument: async (id) => {
      const d = docs.get(id);
      return d && { ...d };
    },
    createFolder: async (name) => {
      const f = newFolder(name);
      folders.set(f.id, f);
      return { ...f };
    },
    renameFolder: async (id, name) => {
      mustFolder(id).name = name;
    },
    setCollapsed: async (id, collapsed) => {
      mustFolder(id).collapsed = collapsed;
    },
    deleteFolder: async (id) => {
      folders.delete(id);
      let n = 0;
      for (const d of [...docs.values()]) {
        if (d.folderId === id) {
          docs.delete(d.id);
          n++;
        }
      }
      return n;
    },
    createDocument: async (folderId, title, content = "") => {
      mustFolder(folderId);
      const d = newDoc(folderId, title, content);
      docs.set(d.id, d);
      return { ...d };
    },
    renameDocument: async (id, title) => {
      mustDoc(id).title = title;
    },
    updateDocument: async (id, patch) => {
      const d = mustDoc(id);
      if (patch.folderId !== undefined) mustFolder(patch.folderId);
      Object.assign(d, patch, { updatedAt: Date.now() });
    },
    deleteDocument: async (id) => {
      docs.delete(id);
    },
    getMeta: async (key) => meta[key],
    setMeta: async (key, value) => {
      meta[key] = value;
    },
    seed: async (folderName, title, content) => {
      let f = [...folders.values()].find((x) => x.name === folderName);
      if (!f) {
        f = newFolder(folderName);
        folders.set(f.id, f);
      }
      const d = newDoc(f.id, title, content);
      docs.set(d.id, d);
      meta.legacyImported = true;
      return { ...d };
    },
  };
}
