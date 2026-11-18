import { describe, expect, it } from "vitest";
import { countChars, countLines, formatCount } from "@/lib/text/count";

describe("countChars — 눈에 보이는 글자 단위 (FR-008)", () => {
  it("빈 문자열은 0자", () => {
    expect(countChars("")).toBe(0);
  });

  it("이모지와 결합 문자를 각각 1자로 센다", () => {
    expect(countChars("한글👍é")).toBe(4);
  });

  it("줄바꿈도 1자로 센다", () => {
    expect(countChars("a\nb")).toBe(3);
  });
});

describe("countLines — 줄바꿈 수 + 1", () => {
  it("빈 문서는 1줄", () => {
    expect(countLines("")).toBe(1);
  });

  it("끝 줄바꿈 뒤 빈 줄도 센다", () => {
    expect(countLines("a\nb\n")).toBe(3);
  });
});

describe("formatCount — ko-KR 천 단위 쉼표", () => {
  it("1,000 미만은 쉼표 없음", () => {
    expect(formatCount(999)).toBe("999");
  });

  it("1,000 이상은 쉼표", () => {
    expect(formatCount(12345)).toBe("12,345");
  });
});
