import { describe, expect, it } from "vitest";
import { bootstrap, LEGACY_KEY } from "@/lib/workspace/bootstrap";
import { createMemoryRepository } from "@/lib/workspace/memory-repository";
import type { Repository } from "@/lib/workspace/repository";

function storage(init: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(init));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const ON = { removeLegacy: true };
const SAMPLE = "# 샘플";

describe("bootstrap — 기존 문서 옮기기 (FR-002, research R3)", () => {
  it("저장본을 '내 문서/제목 없는 문서'로 옮기고 저장본을 지운다", async () => {
    const repo = createMemoryRepository();
    const legacy = storage({ [LEGACY_KEY]: "# 이전" });
    const id = await bootstrap(repo, legacy, SAMPLE, ON);
    const [folder] = await repo.listFolders();
    const [doc] = await repo.listDocuments();
    expect(folder.name).toBe("내 문서");
    expect(doc).toMatchObject({ folderId: folder.id, title: "제목 없는 문서", content: "# 이전" });
    expect(id).toBe(doc.id);
    expect(legacy.getItem(LEGACY_KEY)).toBeNull();
  });

  it("두 번 실행해도 문서가 늘지 않는다 (SC-001)", async () => {
    const repo = createMemoryRepository();
    const legacy = storage({ [LEGACY_KEY]: "# 이전" });
    await bootstrap(repo, legacy, SAMPLE, ON);
    legacy.setItem(LEGACY_KEY, "# 이전"); // removeItem이 실패해 남은 경우
    await bootstrap(repo, legacy, SAMPLE, ON);
    expect(await repo.listDocuments()).toHaveLength(1);
  });

  it("seed가 실패하면 reject하고 저장본을 남긴다", async () => {
    const repo: Repository = { ...createMemoryRepository(), seed: () => Promise.reject(new Error("quota")) };
    const legacy = storage({ [LEGACY_KEY]: "# 이전" });
    await expect(bootstrap(repo, legacy, SAMPLE, ON)).rejects.toThrow("quota");
    expect(legacy.getItem(LEGACY_KEY)).toBe("# 이전");
  });

  it("메모리 모드(removeLegacy:false)면 옮겨 보이되 저장본을 남긴다 (analyze U1)", async () => {
    const repo = createMemoryRepository();
    const legacy = storage({ [LEGACY_KEY]: "# 이전" });
    await bootstrap(repo, legacy, SAMPLE, { removeLegacy: false });
    expect((await repo.listDocuments())[0].content).toBe("# 이전");
    expect(legacy.getItem(LEGACY_KEY)).toBe("# 이전");
  });
});

describe("bootstrap — 첫 방문·열 문서 (FR-003, FR-004)", () => {
  it("저장본도 폴더도 없으면 '내 문서/시작하기' 샘플", async () => {
    const repo = createMemoryRepository();
    const id = await bootstrap(repo, storage(), SAMPLE, ON);
    const [doc] = await repo.listDocuments();
    expect(doc).toMatchObject({ title: "시작하기", content: SAMPLE });
    expect(id).toBe(doc.id);
  });

  it("폴더가 이미 있으면 샘플을 만들지 않는다", async () => {
    const repo = createMemoryRepository();
    await repo.createFolder("회의");
    expect(await bootstrap(repo, storage(), SAMPLE, ON)).toBeNull();
    expect(await repo.listDocuments()).toHaveLength(0);
  });

  it("lastDocId가 있으면 그 문서", async () => {
    const repo = createMemoryRepository();
    const f = await repo.createFolder("가");
    await repo.createDocument(f.id, "가");
    const b = await repo.createDocument(f.id, "나");
    await repo.setMeta("lastDocId", b.id);
    expect(await bootstrap(repo, storage(), SAMPLE, ON)).toBe(b.id);
  });

  it("lastDocId가 지워진 문서면 이름순 첫 폴더의 이름순 첫 문서", async () => {
    const repo = createMemoryRepository();
    const g = await repo.createFolder("나");
    const f = await repo.createFolder("가");
    await repo.createDocument(g.id, "가");
    await repo.createDocument(f.id, "나");
    const first = await repo.createDocument(f.id, "가");
    await repo.setMeta("lastDocId", "gone");
    expect(await bootstrap(repo, storage(), SAMPLE, ON)).toBe(first.id);
  });

  it("저장소 접근 불가(legacy null)여도 동작", async () => {
    const repo = createMemoryRepository();
    expect(await bootstrap(repo, null, SAMPLE, ON)).not.toBeNull();
  });
});
