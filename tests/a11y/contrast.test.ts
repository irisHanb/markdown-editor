// 색 대비 (specs/006-polish-a11y FR-013, SC-005, research R8, 헌장 원칙 VI).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const css = read("src/app/globals.css");
const token = (name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

describe("유틸", () => {
  it("검정/흰색 21:1, 같은 색 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#3b5bdb", "#3b5bdb")).toBe(1);
  });
});

describe("글자 4.5:1 이상", () => {
  const text: [string, string, string][] = [
    ["보조 글자 / 흰색", "#6b7385", "#ffffff"],
    ["보조 글자 / 편집기 배경", "#6b7385", "#fbfcfe"],
    ["취소 버튼 글자", "#5a6577", "#ffffff"],
    ["저장 버튼 글자", "#ffffff", "#3b5bdb"],
    ["눌린 툴바 버튼", "#3b5bdb", "#e8edfb"],
    ["오류 글자", "#b42318", "#ffffff"],
  ];
  it.each(text)("%s", (_, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("프리뷰 목록 번호는 --fg-muted를 쓰고 4.5:1 이상", () => {
    const marker = css.match(/\.md-preview li::marker\s*\{\s*color:\s*([^;]+);/)?.[1]?.trim();
    expect(marker).toBe("var(--fg-muted)");
    expect(contrastRatio(token("--fg-muted")!, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("입력 칸 테두리 3:1 이상", () => {
  it("--input-border 토큰", () => {
    const v = token("--input-border");
    expect(v).toBeDefined();
    expect(contrastRatio(v!, "#ffffff")).toBeGreaterThanOrEqual(3);
  });
  it.each(["src/components/editor/DocumentBar.tsx", "src/components/editor/InsertDialog.tsx"])("%s 입력 칸이 토큰 사용", (file) => {
    expect(read(file).split("border-[var(--input-border)]").length - 1).toBeGreaterThanOrEqual(2);
  });
});

// 007 FR-010, 헌장 1.1.0 원칙 VI 예외 — 문법 강조 색도 코드 배경 대비 4.5:1 이상
describe("코드 하이라이트 색 4.5:1 이상", () => {
  const rules = [...css.matchAll(/\.md-preview \.hljs-[^{]+\{[^}]*color:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]);
  it("규칙이 있음", () => {
    expect(rules.length).toBeGreaterThanOrEqual(5);
  });
  it.each(rules.map((c) => [c]))("%s / #1a2030", (c) => {
    expect(contrastRatio(c, "#1a2030")).toBeGreaterThanOrEqual(4.5);
  });
});
