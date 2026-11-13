import { describe, expect, it } from "vitest";
import type { Doc } from "@/lib/workspace/repository";
import { planSave, uniqueTitle } from "@/lib/workspace/save-plan";

describe("uniqueTitle (FR-004)", () => {
  it.each([
    ["주간 회의", [], "주간 회의"],
    ["주간 회의", ["주간 회의"], "주간 회의-1"],
    ["주간 회의", ["주간 회의", "주간 회의-2"], "주간 회의-1"],
    ["주간 회의", ["주간 회의", "주간 회의-1"], "주간 회의-2"],
    ["notes", ["Notes"], "notes-1"],
  ] as const)("%j vs %j → %j", (title, siblings, expected) => {
    expect(uniqueTitle(title, [...siblings])).toBe(expected);
  });
});

const doc = (id: string, folderId: string, title: string): Doc => ({
  id, folderId, title, content: "", createdAt: 0, updatedAt: 0,
});
const docs = [doc("a", "f1", "주간 회의"), doc("b", "f2", "기록")];

describe("planSave — 초안 (data-model.md 저장 결정)", () => {
  const draft = { kind: "draft" } as const;

  it("폴더 미선택 → noFolder (FR-003)", () => {
    expect(planSave(draft, { folderId: null, title: "x" }, "본문", docs)).toEqual({ kind: "error", reason: "noFolder" });
  });

  it("제목 규칙 위반 → 사유", () => {
    expect(planSave(draft, { folderId: "f1", title: "a/b" }, "", docs)).toEqual({ kind: "error", reason: "slash" });
  });

  it("빈 제목은 '제목 없는 문서'", () => {
    expect(planSave(draft, { folderId: "f1", title: "  " }, "", docs)).toEqual({
      kind: "create", folderId: "f1", title: "제목 없는 문서", renamed: false,
    });
  });

  it("같은 폴더에 같은 제목 → 접미사, renamed", () => {
    expect(planSave(draft, { folderId: "f1", title: "주간 회의" }, "", docs)).toEqual({
      kind: "create", folderId: "f1", title: "주간 회의-1", renamed: true,
    });
  });

  it("다른 폴더의 같은 제목은 겹치지 않음", () => {
    expect(planSave(draft, { folderId: "f2", title: "주간 회의" }, "", docs)).toEqual({
      kind: "create", folderId: "f2", title: "주간 회의", renamed: false,
    });
  });
});

describe("planSave — 저장된 문서 (FR-005, FR-006)", () => {
  const target = { kind: "doc", doc: docs[0] } as const;

  it("본문만 바뀌면 patch에 content만", () => {
    expect(planSave(target, { folderId: "f1", title: "주간 회의" }, "새 본문", docs)).toEqual({
      kind: "update", patch: { content: "새 본문" },
    });
  });

  it("제목·폴더가 바뀌면 patch에 포함", () => {
    expect(planSave(target, { folderId: "f2", title: "회고" }, "본문", docs)).toEqual({
      kind: "update", patch: { content: "본문", title: "회고", folderId: "f2" },
    });
  });

  it("옮길 폴더에 같은 제목 → duplicate, 저장 안 함", () => {
    expect(planSave(target, { folderId: "f2", title: "기록" }, "본문", docs)).toEqual({ kind: "error", reason: "duplicate" });
  });

  it("폴더 선택을 비우면 noFolder", () => {
    expect(planSave(target, { folderId: null, title: "주간 회의" }, "", docs)).toEqual({ kind: "error", reason: "noFolder" });
  });
});
