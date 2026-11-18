import type { SaveResult } from "@/lib/storage/local-document";

// 저장·취소 상태 전이 (M1 data-model.md). 시작은 src/lib/workspace/bootstrap.ts. 화면 컴포넌트는 분기 없이 이 결과만 반영한다.
export type ToastKey = "toastSaved" | "toastSaveFailed" | "toastReverted";
export type ToastKind = "success" | "error";

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
