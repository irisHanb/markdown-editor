import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/pipeline";

// SC-004 XSS 견본 10종
const xssSamples = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '<a href="javascript:alert(1)">x</a>',
  "[x](javascript:alert(1))",
  "<svg onload=alert(1)>",
  '<iframe src="https://example.com">',
  "<style>body{display:none}</style>",
  '<object data="x">',
  '<div onclick="alert(1)">x</div>',
  '<a href="JaVaScRiPt:alert(1)">x</a>',
];

describe("원시 HTML 정제 (FR-007, SC-004)", () => {
  it.each(xssSamples)("%s 에서 실행 가능한 코드를 제거한다", (input) => {
    const html = renderMarkdown(input);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<iframe|<style|<object/i);
  });

  it("허용 목록 태그 <kbd>는 유지한다 (Clarification Q2)", () => {
    expect(renderMarkdown("<kbd>Ctrl</kbd>")).toContain("<kbd>Ctrl</kbd>");
  });

  it("허용 목록 태그 <details>·<summary>는 유지한다", () => {
    const html = renderMarkdown("<details><summary>a</summary>b</details>");
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>a</summary>");
  });

  it("빈 문자열은 빈 문자열", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
