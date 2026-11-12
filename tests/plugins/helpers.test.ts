import { describe, expect, it } from "vitest";
import {
  findBracketSyntax,
  insertAtSelectionEnd,
  insertBlock,
  isInlineActive,
  normalizeUrl,
  toggleInline,
  toggleLinePrefix,
  wrapSelection,
} from "@/plugins/helpers";
import type { EditorChange, EditorState } from "@/plugins/types";
import { parse, show } from "./fixture";

// 출력 선택 범위가 0 ≤ start ≤ end ≤ doc.length (contracts/plugin.md 규칙)
function expectValid(out: EditorChange) {
  expect(out.selectionStart).toBeGreaterThanOrEqual(0);
  expect(out.selectionStart).toBeLessThanOrEqual(out.selectionEnd);
  expect(out.selectionEnd).toBeLessThanOrEqual(out.doc.length);
}

export function run(fn: (s: EditorState) => EditorChange, marked: string): string {
  const input = parse(marked);
  const snapshot = structuredClone(input);
  const out = fn(input);
  expect(input).toEqual(snapshot); // 입력 객체를 변경하지 않음
  expectValid(out);
  return show(out);
}

describe("wrapSelection", () => {
  const bold = (s: EditorState) => wrapSelection(s, "**", "**", "굵은 텍스트");

  it("선택 영역을 감싸고 안쪽을 선택한다", () => {
    expect(run(bold, "a[강조]b")).toBe("a**[강조]**b");
  });

  it("선택이 없으면 placeholder를 넣고 선택한다", () => {
    expect(run(bold, "a|b")).toBe("a**[굵은 텍스트]**b");
  });
});

describe("toggleLinePrefix — 추가 (M2-b US1)", () => {
  it("커서가 있는 줄 전체에 접두사를 붙이고 그 줄을 선택한다", () => {
    expect(run((s) => toggleLinePrefix(s, "h2"), "ab|c")).toBe("[## abc]");
  });

  it("선택이 걸친 모든 줄에 접두사를 붙인다", () => {
    expect(run((s) => toggleLinePrefix(s, "bullet"), "[x\ny]")).toBe("[- x\n- y]");
  });

  it("선택이 줄 중간에서 시작해도 줄 전체를 처리한다", () => {
    expect(run((s) => toggleLinePrefix(s, "quote"), "a\nb[c\nd]e\nf")).toBe("a\n[> bc\n> de]\nf");
  });

  it("빈 줄에는 접두사를 붙이지 않는다", () => {
    expect(run((s) => toggleLinePrefix(s, "bullet"), "[a\n\nb]")).toBe("[- a\n\n- b]");
  });

  it("번호 목록은 줄마다 1씩 늘린다 (빈 줄은 세지 않음)", () => {
    expect(run((s) => toggleLinePrefix(s, "ordered"), "[x\n\ny\nz]")).toBe("[1. x\n\n2. y\n3. z]");
  });

  it("빈 줄 하나에 커서만 있어도 접두사를 붙인다", () => {
    expect(run((s) => toggleLinePrefix(s, "task"), "|")).toBe("[- [ ] ]");
  });
});

describe("insertBlock", () => {
  it("선택을 텍스트로 바꾸고 커서를 삽입 끝에 둔다", () => {
    expect(run((s) => insertBlock(s, "---"), "a[xy]b")).toBe("a---|b");
  });

  it("선택이 없으면 커서 위치에 삽입한다", () => {
    expect(run((s) => insertBlock(s, "\n\n---\n\n"), "a|b")).toBe("a\n\n---\n\n|b");
  });
});

describe("insertAtSelectionEnd", () => {
  it("커서 위치에 삽입하고 커서를 삽입 끝에 둔다", () => {
    expect(run((s) => insertAtSelectionEnd(s, "\\\n"), "foo|")).toBe("foo\\\n|");
  });

  it("선택 글자는 지우지 않고 선택 끝에 삽입한다", () => {
    expect(run((s) => insertAtSelectionEnd(s, "\\\n"), "[foo]bar")).toBe("foo\\\n|bar");
  });
});

// ── US2: 인라인 토글 (research R2, contracts/plugin-api.md 기대 예시) ──

describe("toggleInline", () => {
  const bold = (s: EditorState) => toggleInline(s, "*", 2, "굵은 텍스트");
  const italic = (s: EditorState) => toggleInline(s, "*", 1, "기울임 텍스트");
  const code = (s: EditorState) => toggleInline(s, "`", 1, "코드");

  it.each([
    ["선택 바깥 구분자 해제", bold, "**[강조]**", "[강조]"],
    ["선택 안쪽 구분자 해제", bold, "[**강조**]", "[강조]"],
    ["커서만 있으면 감싼 범위 해제", bold, "**강|조**", "강|조"],
    ["굵게 안에서 기울임은 추가", italic, "**[강조]**", "***[강조]***"],
    ["*** 에서 굵게만 해제", bold, "***[강조]***", "*[강조]*"],
    ["*** 에서 기울임만 해제", italic, "***[강조]***", "**[강조]**"],
    ["기울임 해제", italic, "a*[b]*c", "a[b]c"],
    ["기울임 안에서 굵게는 추가", bold, "*[b]*", "***[b]***"],
    ["취소선 해제", (s: EditorState) => toggleInline(s, "~", 2, "취소선 텍스트"), "~~[x]~~", "[x]"],
    ["인라인 코드 해제", code, "`[x]`", "[x]"],
    ["커서가 서식 밖이면 placeholder 추가", bold, "**a** |b", "**a** **[굵은 텍스트]**b"],
    ["다른 줄의 구분자는 보지 않음", bold, "**a\n|b**", "**a\n**[굵은 텍스트]**b**"],
  ])("%s", (_name, fn, input, expected) => {
    expect(run(fn, input)).toBe(expected);
  });

  it("내용에 백틱이 있으면 백틱 2개와 공백으로 감싼다", () => {
    const out = code({ doc: "ax`yb", selectionStart: 1, selectionEnd: 4 });
    expect(out.doc).toBe("a`` x`y ``b");
    expect(out.doc.slice(out.selectionStart, out.selectionEnd)).toBe("x`y");
  });

  it("백틱 2개 코드는 해제 시 안쪽 공백도 제거한다", () => {
    const out = code({ doc: "a`` x`y ``b", selectionStart: 4, selectionEnd: 7 });
    expect(out.doc).toBe("ax`yb");
  });
});

describe("isInlineActive", () => {
  it.each([
    ["**강|조**", "*", 2, true],
    ["**강|조**", "*", 1, false],
    ["***강|조***", "*", 1, true],
    ["*강|조*", "*", 1, true],
    ["강|조", "*", 2, false],
    ["~~[x]~~", "~", 2, true],
    ["`a|b`", "`", 1, true],
  ] as const)("%s %s×%d → %s", (input, char, size, expected) => {
    expect(isInlineActive(parse(input), char, size)).toBe(expected);
  });
});

// ── US3: 링크·이미지 문법 탐색, 주소 정규화 ──
describe("findBracketSyntax", () => {
  const doc = 'x [문서](https://a.com "t") y ![로고](/l.png) z';
  it("링크 안 커서 → 범위·값", () => {
    expect(findBracketSyntax(doc, 5, false)).toEqual({ from: 2, to: 25, text: "문서", url: "https://a.com", title: "t" });
  });
  it("이미지 안 커서 → 범위·값 (title 없음)", () => {
    const from = doc.indexOf("![");
    expect(findBracketSyntax(doc, from + 3, true)).toEqual({
      from,
      to: from + "![로고](/l.png)".length,
      text: "로고",
      url: "/l.png",
      title: null,
    });
  });
  it("링크 안에서 이미지 탐색은 null, 이미지 안에서 링크 탐색도 null", () => {
    expect(findBracketSyntax(doc, 5, true)).toBeNull();
    expect(findBracketSyntax(doc, doc.indexOf("![") + 3, false)).toBeNull();
  });
  it("문법 밖 커서는 null", () => {
    expect(findBracketSyntax(doc, 0, false)).toBeNull();
  });
});

describe("normalizeUrl (FR-013)", () => {
  it.each([
    [" https://a.com ", "https://a.com"],
    ["/my logo.png", "/my%20logo.png"],
    ["  ", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });
});
