// 연결 폴더에 .md 쓰기 (specs/008-md-file-export FR-003·FR-004·FR-006). 가짜 디렉터리 핸들로 검사한다.
import { describe, expect, it } from "vitest";
import { type DirHandle, writeMarkdown } from "@/lib/export/fs-export";
import { mdPath } from "@/lib/export/md-path";

type Tree = Map<string, Tree | string>;

function fakeDir(tree: Tree, name = "md", perm: { state: PermissionState; afterRequest?: PermissionState; calls: string[] } = { state: "granted", calls: [] }, failWrite = false): DirHandle {
  return {
    name,
    async getDirectoryHandle(n, opts) {
      let sub = tree.get(n);
      if (sub === undefined) {
        if (!opts?.create) throw new DOMException("없음", "NotFoundError");
        sub = new Map();
        tree.set(n, sub);
      }
      if (typeof sub === "string") throw new DOMException("파일", "TypeMismatchError");
      return fakeDir(sub, n, perm, failWrite);
    },
    async getFileHandle(n, opts) {
      if (!tree.has(n) && !opts?.create) throw new DOMException("없음", "NotFoundError");
      return {
        async createWritable() {
          if (failWrite) throw new DOMException("쓰기 실패", "NotAllowedError");
          let buf = "";
          return {
            async write(data: string) {
              buf += data;
            },
            async close() {
              tree.set(n, buf);
            },
          };
        },
      };
    },
    async removeEntry(n) {
      if (!tree.delete(n)) throw new DOMException("없음", "NotFoundError");
    },
    async queryPermission() {
      perm.calls.push("query");
      return perm.state;
    },
    async requestPermission() {
      perm.calls.push("request");
      perm.state = perm.afterRequest ?? perm.state;
      return perm.state;
    },
  };
}

const read = (tree: Tree, dir: string, file: string) => (tree.get(dir) as Tree | undefined)?.get(file);

describe("writeMarkdown", () => {
  it("하위 폴더와 파일을 만들고 본문을 쓴다", async () => {
    const tree: Tree = new Map();
    const r = await writeMarkdown(fakeDir(tree), mdPath("회의", "주간 회의"), "# 본문");
    expect(r).toEqual({ ok: true, path: "md/회의/주간 회의.md" });
    expect(read(tree, "회의", "주간 회의.md")).toBe("# 본문");
  });

  it("이미 있으면 덮어쓴다", async () => {
    const tree: Tree = new Map([["회의", new Map([["주간 회의.md", "옛 본문"]])]]);
    await writeMarkdown(fakeDir(tree), mdPath("회의", "주간 회의"), "새 본문");
    expect(read(tree, "회의", "주간 회의.md")).toBe("새 본문");
  });

  it("제목·폴더가 바뀌면 이전 파일을 지운다", async () => {
    const tree: Tree = new Map([["회의", new Map([["주간 회의.md", "옛 본문"]])]]);
    await writeMarkdown(fakeDir(tree), mdPath("메모", "주간 회의 2"), "본문", mdPath("회의", "주간 회의"));
    expect(read(tree, "메모", "주간 회의 2.md")).toBe("본문");
    expect(read(tree, "회의", "주간 회의.md")).toBeUndefined();
    expect(tree.has("회의")).toBe(true); // 빈 폴더는 남김
  });

  it("이전 경로가 같으면 지우지 않는다", async () => {
    const tree: Tree = new Map();
    const p = mdPath("회의", "주간 회의");
    await writeMarkdown(fakeDir(tree), p, "본문", p);
    expect(read(tree, "회의", "주간 회의.md")).toBe("본문");
  });

  it("이전 파일이 이미 없어도 성공", async () => {
    const tree: Tree = new Map();
    const r = await writeMarkdown(fakeDir(tree), mdPath("메모", "새"), "본문", mdPath("회의", "옛"));
    expect(r.ok).toBe(true);
  });

  it("권한이 prompt면 요청하고, 허락되면 쓴다", async () => {
    const tree: Tree = new Map();
    const perm = { state: "prompt" as PermissionState, afterRequest: "granted" as PermissionState, calls: [] as string[] };
    const r = await writeMarkdown(fakeDir(tree, "md", perm), mdPath("회의", "a"), "본문");
    expect(perm.calls).toEqual(["query", "request"]);
    expect(r.ok).toBe(true);
  });

  it("권한 거절이면 쓰지 않고 permission 실패", async () => {
    const tree: Tree = new Map();
    const perm = { state: "denied" as PermissionState, calls: [] as string[] };
    expect(await writeMarkdown(fakeDir(tree, "md", perm), mdPath("회의", "a"), "본문")).toEqual({ ok: false, reason: "permission" });
    expect(tree.size).toBe(0);
  });

  it("쓰기 예외는 write 실패", async () => {
    const tree: Tree = new Map();
    const r = await writeMarkdown(fakeDir(tree, "md", { state: "granted", calls: [] }, true), mdPath("회의", "a"), "본문");
    expect(r).toEqual({ ok: false, reason: "write" });
  });
});
