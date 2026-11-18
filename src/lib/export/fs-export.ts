import type { MdPath } from "./md-path";

// File System Access API 중 이 기능이 쓰는 부분만 (specs/008-md-file-export). Chromium 전용 메서드는 선택 항목.
// 테스트는 같은 모양의 가짜 객체를 넘긴다.
export interface WritableFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
export interface FileHandleLike {
  createWritable(): Promise<WritableFile>;
}
export interface DirHandle {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
  removeEntry(name: string): Promise<void>;
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
}

export type WriteResult = { ok: true; path: string } | { ok: false; reason: "permission" | "write" };

/** 쓰기 권한 확인 — prompt면 요청한다(사용자 동작 직후에만 브라우저가 묻는다). */
async function ensurePermission(root: DirHandle): Promise<boolean> {
  if (!root.queryPermission) return true;
  let state = await root.queryPermission({ mode: "readwrite" });
  if (state === "prompt" && root.requestPermission) state = await root.requestPermission({ mode: "readwrite" });
  return state === "granted";
}

/**
 * <연결 폴더>/<target>에 본문을 쓴다. previous가 다른 경로면 그 파일을 지운다(빈 폴더는 남김) (FR-003·FR-004).
 * 실패해도 예외를 던지지 않는다 — 호출부는 브라우저 저장소 저장을 되돌리지 않는다(FR-006).
 */
export async function writeMarkdown(root: DirHandle, target: MdPath, content: string, previous?: MdPath): Promise<WriteResult> {
  try {
    if (!(await ensurePermission(root))) return { ok: false, reason: "permission" };
    const dir = await root.getDirectoryHandle(target.dir, { create: true });
    const writable = await (await dir.getFileHandle(target.file, { create: true })).createWritable();
    await writable.write(content);
    await writable.close();
  } catch {
    return { ok: false, reason: "write" };
  }
  if (previous && previous.display !== target.display) {
    try {
      await (await root.getDirectoryHandle(previous.dir)).removeEntry(previous.file);
    } catch {
      // 이전 파일이 이미 없으면 그대로 둔다
    }
  }
  return { ok: true, path: `${root.name}/${target.display}` };
}
