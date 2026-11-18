// 새 문서 샘플 본문 (specs/007-usability-fixes FR-011)
import { describe, expect, it } from "vitest";
import { SAMPLE } from "@/content/sample";
import { hasUnsavedChanges } from "@/lib/workspace/dirty";
import { createDraft } from "@/lib/workspace/draft";
import { UNTITLED } from "@/lib/workspace/save-plan";

describe("createDraft", () => {
  const draft = createDraft(1, SAMPLE);

  it("샘플 본문·기본 제목·폴더 없음으로 시작", () => {
    expect(draft).toEqual({ kind: "draft", key: 1, title: UNTITLED, folderId: null, content: SAMPLE });
  });

  const input = (content: string) => ({
    content,
    baseline: draft.content,
    form: { folderId: draft.folderId, title: draft.title },
    saved: { folderId: draft.folderId, title: draft.title },
    isDraft: true,
  });

  it("샘플을 고치지 않으면 저장하지 않은 변경이 아님", () => {
    expect(hasUnsavedChanges(input(SAMPLE))).toBe(false);
  });

  it("샘플을 1글자 고치면 저장하지 않은 변경", () => {
    expect(hasUnsavedChanges(input(`${SAMPLE}x`))).toBe(true);
  });
});
