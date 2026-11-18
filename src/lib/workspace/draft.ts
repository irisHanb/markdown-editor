import { UNTITLED } from "./save-plan";

/** 저장 전 새 문서(상단 [새 문서]). content는 편집기 초기값이자 저장하지 않은 변경의 비교 기준(baseline)이다. */
export type Draft = { kind: "draft"; key: number; title: string; folderId: string | null; content: string };

/** 새 초안 — 본문은 호출부가 넘긴 샘플로 시작한다 (specs/007-usability-fixes FR-011) */
export const createDraft = (key: number, content: string): Draft => ({
  kind: "draft",
  key,
  title: UNTITLED,
  folderId: null,
  content,
});
