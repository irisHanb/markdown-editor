import { describe, expect, it } from "vitest";
import { applySave, resolveInitial, revert } from "@/lib/document/session";

const sample = "# 샘플";

describe("resolveInitial (data-model.md 상태 전이)", () => {
  it("저장본이 있으면 저장본", () => {
    expect(resolveInitial({ ok: true, content: "저장본" }, sample)).toEqual({ doc: "저장본", baseline: "저장본" });
  });

  it("빈 저장본은 빈 문서 (샘플로 바꾸지 않음)", () => {
    expect(resolveInitial({ ok: true, content: "" }, sample)).toEqual({ doc: "", baseline: "" });
  });

  it("저장본이 없으면 샘플", () => {
    expect(resolveInitial({ ok: true, content: null }, sample)).toEqual({ doc: sample, baseline: sample });
  });

  it("읽기 실패면 샘플 (FR-015)", () => {
    expect(resolveInitial({ ok: false }, sample)).toEqual({ doc: sample, baseline: sample });
  });
});

describe("applySave", () => {
  it("성공하면 baseline = doc, toastSaved", () => {
    expect(applySave({ ok: true }, "새 문서", "이전")).toEqual({
      baseline: "새 문서",
      toast: "toastSaved",
      kind: "success",
    });
  });

  it("실패하면 baseline 유지, toastSaveFailed", () => {
    expect(applySave({ ok: false }, "새 문서", "이전")).toEqual({
      baseline: "이전",
      toast: "toastSaveFailed",
      kind: "error",
    });
  });
});

describe("revert", () => {
  it("doc = baseline, toastReverted", () => {
    expect(revert("이전")).toEqual({ doc: "이전", toast: "toastReverted", kind: "success" });
  });
});
