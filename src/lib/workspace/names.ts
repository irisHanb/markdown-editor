import { countChars } from "@/lib/text/count";
import type { Doc, Folder } from "./repository";

// 이름 규칙·정렬·다음 문서 선택 (specs/004-folder-storage spec Edge Cases, research R9).

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "tooLong" | "slash" | "duplicate" };

const MAX = 50;
const fold = (s: string) => s.trim().toLocaleLowerCase("ko");

/** 길이는 눈에 보이는 글자(M1 countChars) 기준. self는 이름 바꾸기 시 자기 자신 이름. */
export function validateName(input: string, siblings: string[], self?: string): NameCheck {
  const name = input.trim();
  if (!name) return { ok: false, reason: "empty" };
  if (countChars(name) > MAX) return { ok: false, reason: "tooLong" };
  if (/[\\/]/.test(name)) return { ok: false, reason: "slash" };
  const skip = self === undefined ? null : fold(self);
  if (siblings.some((s) => fold(s) === fold(name) && fold(s) !== skip)) return { ok: false, reason: "duplicate" };
  return { ok: true, name };
}

const UNTITLED = "제목 없는 문서";

/** "제목 없는 문서" → 있으면 비어 있는 가장 작은 번호 " 2", " 3"… (FR-016) */
export function nextUntitled(siblings: string[]): string {
  const taken = new Set(siblings.map(fold));
  if (!taken.has(fold(UNTITLED))) return UNTITLED;
  for (let n = 2; ; n++) {
    const candidate = `${UNTITLED} ${n}`;
    if (!taken.has(fold(candidate))) return candidate;
  }
}

export const byName =
  <T>(get: (x: T) => string) =>
  (a: T, b: T) =>
    get(a).localeCompare(get(b), "ko");

/** 삭제 후 열 문서: 같은 폴더 이름순 첫 문서 → 폴더 이름순 첫 폴더의 첫 문서 → null (US3-2) */
export function pickNextDocument(docs: Doc[], folders: Folder[], removedId: string): string | null {
  const removed = docs.find((d) => d.id === removedId);
  const rest = docs.filter((d) => d.id !== removedId).sort(byName((d) => d.title));
  const same = removed && rest.find((d) => d.folderId === removed.folderId);
  if (same) return same.id;
  for (const f of [...folders].sort(byName((x) => x.name))) {
    const first = rest.find((d) => d.folderId === f.id);
    if (first) return first.id;
  }
  return null;
}
