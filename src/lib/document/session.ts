import type { LoadResult, SaveResult } from "@/lib/storage/local-document";

// 시작·저장·취소 상태 전이 (data-model.md). 화면 컴포넌트는 분기 없이 이 결과만 반영한다.
export type ToastKey = "toastSaved" | "toastSaveFailed" | "toastReverted";
export type ToastKind = "success" | "error";

/** 저장본이 있으면(빈 문자열 포함) 저장본, 없거나 읽기 실패면 샘플. */
export function resolveInitial(load: LoadResult, sample: string): { doc: string; baseline: string } {
  const doc = load.ok && load.content !== null ? load.content : sample;
  return { doc, baseline: doc };
}

/** 저장 성공 시에만 baseline을 현재 문서로 바꾼다. */
export function applySave(
  result: SaveResult,
  doc: string,
  baseline: string,
): { baseline: string; toast: ToastKey; kind: ToastKind } {
  return result.ok
    ? { baseline: doc, toast: "toastSaved", kind: "success" }
    : { baseline, toast: "toastSaveFailed", kind: "error" };
}

/** [취소] — 마지막 저장본(없으면 샘플)으로 되돌린다. */
export function revert(baseline: string): { doc: string; toast: ToastKey; kind: "success" } {
  return { doc: baseline, toast: "toastReverted", kind: "success" };
}
