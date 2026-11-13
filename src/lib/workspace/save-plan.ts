import { type NameCheck, validateName } from "./names";
import type { Doc, DocPatch } from "./repository";

// [저장] 결정 — 초안 만들기·문서 갱신·옮기기 (specs/005-document-flow data-model.md "저장 결정").
export type SaveTarget = { kind: "draft" } | { kind: "doc"; doc: Doc };
export type DocumentForm = { folderId: string | null; title: string };
export type SavePlan =
  | { kind: "create"; folderId: string; title: string; renamed: boolean }
  | { kind: "update"; patch: DocPatch & { content: string } }
  | { kind: "error"; reason: "noFolder" | Exclude<NameCheck, { ok: true }>["reason"] };

export const UNTITLED = "제목 없는 문서";

const fold = (s: string) => s.trim().toLocaleLowerCase("ko");

/** 겹치면 "제목-1", "제목-2"… 비어 있는 가장 작은 번호 (requirement.md FR-3.4, 대소문자 무시) */
export function uniqueTitle(title: string, siblings: string[]): string {
  const taken = new Set(siblings.map(fold));
  if (!taken.has(fold(title))) return title;
  for (let n = 1; ; n++) {
    const candidate = `${title}-${n}`;
    if (!taken.has(fold(candidate))) return candidate;
  }
}

export function planSave(target: SaveTarget, form: DocumentForm, content: string, docs: Doc[]): SavePlan {
  if (form.folderId === null) return { kind: "error", reason: "noFolder" };
  const folderId = form.folderId;
  const title = form.title.trim() || UNTITLED;
  const siblings = docs
    .filter((d) => d.folderId === folderId && !(target.kind === "doc" && d.id === target.doc.id))
    .map((d) => d.title);

  if (target.kind === "draft") {
    // 중복은 접미사로 해결하므로 이름 형식만 검사한다 (FR-004)
    const check = validateName(title, []);
    if (!check.ok) return { kind: "error", reason: check.reason };
    const unique = uniqueTitle(check.name, siblings);
    return { kind: "create", folderId, title: unique, renamed: unique !== check.name };
  }

  // 저장된 문서는 중복을 막는다 — 아무것도 저장하지 않음 (FR-005, FR-006)
  const check = validateName(title, siblings);
  if (!check.ok) return { kind: "error", reason: check.reason };
  const patch: DocPatch & { content: string } = { content };
  if (check.name !== target.doc.title) patch.title = check.name;
  if (folderId !== target.doc.folderId) patch.folderId = folderId;
  return { kind: "update", patch };
}
