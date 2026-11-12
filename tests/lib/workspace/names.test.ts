import { describe, expect, it } from "vitest";
import { byName, nextUntitled, pickNextDocument, validateName } from "@/lib/workspace/names";
import type { Doc, Folder } from "@/lib/workspace/repository";

describe("validateName (spec Edge Cases)", () => {
  it("앞뒤 공백을 지운다", () => {
    expect(validateName("  회의 ", [])).toEqual({ ok: true, name: "회의" });
  });

  it.each(["", "   "])("빈 이름 %j → empty", (v) => {
    expect(validateName(v, [])).toEqual({ ok: false, reason: "empty" });
  });

  it("50자는 통과, 51자는 tooLong (눈에 보이는 글자 기준)", () => {
    expect(validateName("가".repeat(50), []).ok).toBe(true);
    expect(validateName("가".repeat(51), [])).toEqual({ ok: false, reason: "tooLong" });
    expect(validateName("👍".repeat(50), []).ok).toBe(true); // 이모지 1개 = 1자
  });

  it.each(["a/b", "a\\b"])("%j → slash", (v) => {
    expect(validateName(v, [])).toEqual({ ok: false, reason: "slash" });
  });

  it.each([
    ["회의", ["회의"]],
    [" 회의 ", ["회의"]],
    ["Notes", ["notes"]],
  ])("%j vs %j → duplicate", (v, siblings) => {
    expect(validateName(v, siblings)).toEqual({ ok: false, reason: "duplicate" });
  });

  it("이름 바꾸기는 자기 자신을 중복으로 보지 않는다", () => {
    expect(validateName("회의", ["회의", "기록"], "회의")).toEqual({ ok: true, name: "회의" });
    expect(validateName("기록", ["회의", "기록"], "회의")).toEqual({ ok: false, reason: "duplicate" });
  });
});

describe("nextUntitled (FR-016)", () => {
  it.each([
    [[], "제목 없는 문서"],
    [["제목 없는 문서"], "제목 없는 문서 2"],
    [["제목 없는 문서", "제목 없는 문서 3"], "제목 없는 문서 2"],
    [["제목 없는 문서", "제목 없는 문서 2"], "제목 없는 문서 3"],
  ])("%j → %j", (siblings, expected) => {
    expect(nextUntitled(siblings)).toBe(expected);
  });
});

describe("byName", () => {
  it("한국어 사전순", () => {
    expect(["하", "가", "나"].sort(byName((x) => x))).toEqual(["가", "나", "하"]);
  });
});

const folder = (id: string, name: string): Folder => ({ id, name, parentId: null, collapsed: false, createdAt: 0 });
const doc = (id: string, folderId: string, title: string): Doc => ({
  id, folderId, title, content: "", createdAt: 0, updatedAt: 0,
});

describe("pickNextDocument (US3-2)", () => {
  const folders = [folder("f2", "나"), folder("f1", "가")];

  it("같은 폴더의 이름순 첫 문서", () => {
    const docs = [doc("a", "f1", "다"), doc("b", "f1", "나"), doc("c", "f1", "가"), doc("x", "f2", "가")];
    expect(pickNextDocument(docs, folders, "c")).toBe("b");
  });

  it("같은 폴더에 없으면 폴더 이름순 첫 폴더의 첫 문서", () => {
    const docs = [doc("a", "f1", "가"), doc("y", "f2", "나"), doc("x", "f2", "가")];
    expect(pickNextDocument(docs, folders, "a")).toBe("x");
  });

  it("남은 문서가 없으면 null", () => {
    expect(pickNextDocument([doc("a", "f1", "가")], folders, "a")).toBeNull();
  });
});
