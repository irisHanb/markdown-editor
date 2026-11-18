import { type DBSchema, openDB } from "idb";
import { type Doc, type Folder, type Meta, newDoc, newFolder, type Repository } from "./repository";

// IndexedDB `mdeditor` v1 (specs/004-folder-storage data-model.md, research R1).
interface Schema extends DBSchema {
  folders: { key: string; value: Folder };
  documents: { key: string; value: Doc; indexes: { byFolder: string } };
  meta: { key: string; value: unknown };
}

const DB_NAME = "mdeditor";

/** 열기 실패(비공개 모드 제한 등) 시 reject — 호출부가 메모리 저장소로 대체한다. */
export async function createIdbRepository(): Promise<Repository> {
  const db = await openDB<Schema>(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore("folders", { keyPath: "id" });
      d.createObjectStore("documents", { keyPath: "id" }).createIndex("byFolder", "folderId");
      d.createObjectStore("meta");
    },
  });
  // 다른 탭·버전 업그레이드·DB 삭제가 이 연결 때문에 막히지 않게 스스로 닫는다.
  db.addEventListener("versionchange", () => db.close());

  const update = async <S extends "folders" | "documents">(
    store: S,
    id: string,
    patch: (v: Schema[S]["value"]) => void,
  ) => {
    const tx = db.transaction(store, "readwrite");
    const v = await tx.store.get(id);
    if (!v) throw new Error(`${store} ${id} 없음`);
    patch(v);
    await tx.store.put(v);
    await tx.done;
  };

  return {
    listFolders: () => db.getAll("folders"),
    // ponytail: 목록을 위해 본문까지 읽는다. 문서 1,000개에서 1초(SC-003)를 넘으면 본문 스토어를 분리한다.
    listDocuments: () => db.getAll("documents"),
    getDocument: (id) => db.get("documents", id),

    createFolder: async (name) => {
      const f = newFolder(name);
      await db.put("folders", f);
      return f;
    },
    renameFolder: (id, name) => update("folders", id, (f) => void (f.name = name)),
    setCollapsed: (id, collapsed) => update("folders", id, (f) => void (f.collapsed = collapsed)),
    deleteFolder: async (id) => {
      const tx = db.transaction(["folders", "documents"], "readwrite");
      const keys = await tx.objectStore("documents").index("byFolder").getAllKeys(id);
      await Promise.all([...keys.map((k) => tx.objectStore("documents").delete(k)), tx.objectStore("folders").delete(id)]);
      await tx.done;
      return keys.length;
    },

    createDocument: async (folderId, title, content = "") => {
      const tx = db.transaction(["folders", "documents"], "readwrite");
      if (!(await tx.objectStore("folders").get(folderId))) {
        tx.done.catch(() => {}); // abort로 생기는 거부는 아래 throw로 대신 알린다
        tx.abort();
        throw new Error(`folder ${folderId} 없음`);
      }
      const d = newDoc(folderId, title, content);
      await tx.objectStore("documents").put(d);
      await tx.done;
      return d;
    },
    renameDocument: (id, title) => update("documents", id, (d) => void (d.title = title)),
    updateDocument: async (id, patch) => {
      const tx = db.transaction(["folders", "documents"], "readwrite");
      const fail = (msg: string) => {
        tx.done.catch(() => {}); // abort로 생기는 거부는 아래 throw로 대신 알린다
        tx.abort();
        throw new Error(msg);
      };
      if (patch.folderId !== undefined && !(await tx.objectStore("folders").get(patch.folderId))) {
        fail(`folder ${patch.folderId} 없음`);
      }
      const d = await tx.objectStore("documents").get(id);
      if (!d) fail(`document ${id} 없음`);
      await tx.objectStore("documents").put({ ...(d as Doc), ...patch, updatedAt: Date.now() });
      await tx.done;
    },
    deleteDocument: (id) => db.delete("documents", id),

    getMeta: async <K extends keyof Meta>(key: K) => (await db.get("meta", key)) as Meta[K] | undefined,
    setMeta: async (key, value) => {
      await db.put("meta", value, key);
    },

    seed: async (folderName, title, content) => {
      const tx = db.transaction(["folders", "documents", "meta"], "readwrite");
      const all = await tx.objectStore("folders").getAll();
      let f = all.find((x) => x.name === folderName);
      if (!f) {
        f = newFolder(folderName);
        await tx.objectStore("folders").put(f);
      }
      const d = newDoc(f.id, title, content);
      await tx.objectStore("documents").put(d);
      await tx.objectStore("meta").put(true, "legacyImported");
      await tx.done;
      return d;
    },
  };
}
