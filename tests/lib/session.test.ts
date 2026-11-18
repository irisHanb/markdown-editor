import { describe, expect, it } from "vitest";
import { applySave, revert } from "@/lib/document/session";

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
