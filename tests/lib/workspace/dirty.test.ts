// 저장하지 않은 변경 판단 (specs/006-polish-a11y FR-002, data-model.md, contracts/modules.md)
import { describe, expect, it } from "vitest";
import { hasUnsavedChanges, type UnsavedInput } from "@/lib/workspace/dirty";
import { UNTITLED } from "@/lib/workspace/save-plan";

const doc: UnsavedInput = {
  content: "a",
  baseline: "a",
  form: { folderId: "f1", title: "t" },
  saved: { folderId: "f1", title: "t" },
  isDraft: false,
};
const draft: UnsavedInput = {
  content: "",
  baseline: "",
  form: { folderId: null, title: UNTITLED },
  saved: { folderId: null, title: UNTITLED },
  isDraft: true,
};

describe("hasUnsavedChanges", () => {
  it("문서 — 모두 같으면 false", () => expect(hasUnsavedChanges(doc)).toBe(false));
  it("문서 — 본문만 다름", () => expect(hasUnsavedChanges({ ...doc, content: "ab" })).toBe(true));
  it("문서 — 제목만 다름", () => expect(hasUnsavedChanges({ ...doc, form: { ...doc.form, title: "u" } })).toBe(true));
  it("문서 — 폴더만 다름", () => expect(hasUnsavedChanges({ ...doc, form: { ...doc.form, folderId: "f2" } })).toBe(true));
  it("초안 — 아무것도 안 함", () => expect(hasUnsavedChanges(draft)).toBe(false));
  it("초안 — 폴더만 고름", () => expect(hasUnsavedChanges({ ...draft, form: { ...draft.form, folderId: "f1" } })).toBe(false));
  it("초안 — 본문 1글자", () => expect(hasUnsavedChanges({ ...draft, content: "x" })).toBe(true));
  it("초안 — 제목 바꿈", () => expect(hasUnsavedChanges({ ...draft, form: { ...draft.form, title: "회의" } })).toBe(true));
  it("문서 — 제목을 바꿨다가 원래 값으로 되돌림", () => {
    const changed = { ...doc, form: { ...doc.form, title: "u" } };
    expect(hasUnsavedChanges({ ...changed, form: { ...changed.form, title: "t" } })).toBe(false);
  });
});
