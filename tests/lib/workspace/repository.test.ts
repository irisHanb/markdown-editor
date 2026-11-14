import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createIdbRepository } from "@/lib/workspace/idb-repository";
import { createMemoryRepository } from "@/lib/workspace/memory-repository";
import type { Repository } from "@/lib/workspace/repository";

// contracts/repository.md — 두 구현에 같은 계약 테스트
const impls: [string, () => Promise<Repository>][] = [
  ["idb", () => createIdbRepository()],
  ["memory", async () => createMemoryRepository()],
];

const deleteDb = () =>
  new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("mdeditor");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });

describe.each(impls)("Repository 계약: %s", (_name, make) => {
  let repo: Repository;
  beforeEach(async () => {
    await deleteDb();
    repo = await make();
  });

  it("폴더를 만들면 루트·펼침 상태로 목록에 나온다", async () => {
    const f = await repo.createFolder("회의");
    expect(await repo.listFolders()).toEqual([
      { id: f.id, name: "회의", parentId: null, collapsed: false, createdAt: f.createdAt },
    ]);
  });

  it("문서를 만들면 빈 본문, 폴더 소속", async () => {
    const f = await repo.createFolder("회의");
    const d = await repo.createDocument(f.id, "첫 회의");
    expect(d).toMatchObject({ folderId: f.id, title: "첫 회의", content: "" });
    expect(await repo.getDocument(d.id)).toEqual(d);
  });

  it("없는 폴더에 문서를 만들면 reject", async () => {
    await expect(repo.createDocument("nope", "x")).rejects.toThrow();
  });

  it("이름 바꾸기·접힘 상태 반영", async () => {
    const f = await repo.createFolder("회의");
    const d = await repo.createDocument(f.id, "a");
    await repo.renameFolder(f.id, "기록");
    await repo.setCollapsed(f.id, true);
    await repo.renameDocument(d.id, "b");
    expect(await repo.listFolders()).toMatchObject([{ name: "기록", collapsed: true }]);
    expect((await repo.getDocument(d.id))?.title).toBe("b");
  });

  it("updateDocument는 본문과 updatedAt을 갱신한다", async () => {
    const f = await repo.createFolder("회의");
    const d = await repo.createDocument(f.id, "a");
    await new Promise((r) => setTimeout(r, 5));
    await repo.updateDocument(d.id, { content: "# 본문" });
    const saved = await repo.getDocument(d.id);
    expect(saved?.content).toBe("# 본문");
    expect(saved?.updatedAt).toBeGreaterThan(d.updatedAt);
  });

  it("updateDocument로 제목·폴더를 바꾼다 (옮기기)", async () => {
    const f = await repo.createFolder("회의");
    const g = await repo.createFolder("기록");
    const d = await repo.createDocument(f.id, "a", "본문");
    await repo.updateDocument(d.id, { title: "b", folderId: g.id });
    expect(await repo.getDocument(d.id)).toMatchObject({ title: "b", folderId: g.id, content: "본문" });
  });

  it("없는 폴더로 옮기면 reject하고 문서는 그대로", async () => {
    const f = await repo.createFolder("회의");
    const d = await repo.createDocument(f.id, "a", "본문");
    await expect(repo.updateDocument(d.id, { title: "b", folderId: "nope", content: "새" })).rejects.toThrow();
    expect(await repo.getDocument(d.id)).toEqual(d);
  });

  it("없는 문서는 reject", async () => {
    await expect(repo.updateDocument("nope", { content: "x" })).rejects.toThrow();
  });

  it("deleteDocument", async () => {
    const f = await repo.createFolder("회의");
    const d = await repo.createDocument(f.id, "a");
    await repo.deleteDocument(d.id);
    expect(await repo.getDocument(d.id)).toBeUndefined();
  });

  it("deleteFolder는 소속 문서도 지우고 개수를 돌려준다, 다른 폴더는 유지", async () => {
    const f = await repo.createFolder("회의");
    const g = await repo.createFolder("기록");
    await repo.createDocument(f.id, "a");
    await repo.createDocument(f.id, "b");
    const keep = await repo.createDocument(g.id, "c");
    expect(await repo.deleteFolder(f.id)).toBe(2);
    expect((await repo.listFolders()).map((x) => x.id)).toEqual([g.id]);
    expect((await repo.listDocuments()).map((x) => x.id)).toEqual([keep.id]);
  });

  it("meta 왕복", async () => {
    expect(await repo.getMeta("lastDocId")).toBeUndefined();
    await repo.setMeta("lastDocId", "abc");
    expect(await repo.getMeta("lastDocId")).toBe("abc");
    // 008 FR-002 — 연결 폴더 핸들(구조화 복제 가능한 값) 왕복
    expect(await repo.getMeta("exportDir")).toBeUndefined();
    await repo.setMeta("exportDir", { kind: "directory", name: "md" });
    expect(await repo.getMeta("exportDir")).toEqual({ kind: "directory", name: "md" });
  });

  it("seed는 같은 이름 폴더를 재사용하고 legacyImported를 설정한다", async () => {
    const f = await repo.createFolder("내 문서");
    const d = await repo.seed("내 문서", "제목 없는 문서", "# 이전");
    expect(d).toMatchObject({ folderId: f.id, title: "제목 없는 문서", content: "# 이전" });
    expect(await repo.listFolders()).toHaveLength(1);
    expect(await repo.getMeta("legacyImported")).toBe(true);
  });

  it("seed는 폴더가 없으면 만든다", async () => {
    const d = await repo.seed("내 문서", "시작하기", "샘플");
    const folders = await repo.listFolders();
    expect(folders).toMatchObject([{ name: "내 문서" }]);
    expect(d.folderId).toBe(folders[0].id);
  });
});
