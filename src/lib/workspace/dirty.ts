import type { DocumentForm } from "./save-plan";

export type UnsavedInput = {
  /** 편집기 현재 본문 */
  content: string;
  /** 마지막 저장(또는 열기) 시점 본문. 초안은 "" */
  baseline: string;
  /** 문서 바 현재 값 */
  form: DocumentForm;
  /** 기준값 — 문서는 저장 시점, 초안은 초안을 연 시점 폴더·제목 */
  saved: { folderId: string | null; title: string };
  isDraft: boolean;
};

/**
 * 저장하지 않은 변경 여부 (specs/006-polish-a11y FR-002, data-model.md).
 * 이탈 경고(beforeunload)와 M6 앱 안 저장 확인이 같은 기준을 쓴다. 초안에서 폴더만 고른 것은 변경이 아니다.
 */
export function hasUnsavedChanges({ content, baseline, form, saved, isDraft }: UnsavedInput): boolean {
  return content !== baseline || form.title !== saved.title || (!isDraft && form.folderId !== saved.folderId);
}
