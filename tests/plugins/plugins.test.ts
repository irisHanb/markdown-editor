import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/pipeline";
import { pluginGroups, plugins } from "@/plugins";
import type { EditorChange, EditorState, MarkdownPlugin } from "@/plugins/types";
import { parse, show } from "./fixture";

// specs/003-full-toolbar/contracts/plugin-api.md "18개 플러그인" 표 순서
const ORDER = [
  "heading-1", "heading-2", "heading-3",
  "bold", "italic", "strikethrough", "inline-code",
  "link", "image", "autolink",
  "blockquote", "code-block", "bullet-list", "ordered-list", "task-list",
  "table", "horizontal-rule", "hard-break",
];

const TABLE = "\n| 제목 | 설명 |\n|---|---|\n| 내용1 | 내용2 |\n";
const HEAD = TABLE.indexOf("제목");

export function byId(id: string): MarkdownPlugin {
  const p = plugins.find((x) => x.id === id);
  if (!p) throw new Error(`plugin ${id} 없음`);
  return p;
}

export function state(doc: string, selectionStart: number, selectionEnd = selectionStart): EditorState {
  return { doc, selectionStart, selectionEnd };
}

describe("레지스트리 (FR-001)", () => {
  it("묶음 5개 [3,4,3,5,3] = 18개, 표 순서와 일치", () => {
    expect(pluginGroups.map((g) => g.length)).toEqual([3, 4, 3, 5, 3]);
    expect(plugins).toHaveLength(18);
    expect(plugins.map((p) => p.id)).toEqual(ORDER);
  });

  it("모든 label이 비어 있지 않은 한글(숫자 허용)", () => {
    for (const p of plugins) expect(p.label).toMatch(/^[가-힣 0-9]+$/);
  });

  it("H4–H6 버튼이 없다", () => {
    expect(plugins.some((p) => /heading-[4-6]/.test(p.id))).toBe(false);
  });
});

// 표기 [ ] = 선택, | = 커서 (본문에 [ ] | 가 없는 경우)
const marked: [id: string, input: string, expected: string][] = [
  ["heading-1", "ab|c", "# ab|c"],
  ["heading-2", "ab|c", "## ab|c"],
  ["heading-3", "[x\ny]", "[### x\n### y]"],
  ["bold", "a[강조]b", "a**[강조]**b"],
  ["bold", "a|b", "a**[굵은 텍스트]**b"],
  ["italic", "a[강조]b", "a*[강조]*b"],
  ["italic", "a|b", "a*[기울임 텍스트]*b"],
  ["strikethrough", "a[강조]b", "a~~[강조]~~b"],
  ["strikethrough", "a|b", "a~~[취소선 텍스트]~~b"],
  ["inline-code", "a[x]b", "a`[x]`b"],
  ["inline-code", "a|b", "a`[코드]`b"],
  ["autolink", "|", "<https://|>"], // 007 FR-003 — 주소를 이어서 입력
  ["autolink", "[a.com]", "<[a.com]>"],
  ["blockquote", "[x\ny]", "[> x\n> y]"],
  ["blockquote", "ab|c", "> ab|c"],
  ["code-block", "a[x]b", "a\n```\n[x]\n```\nb"],
  ["code-block", "a|b", "a\n```\n[코드]\n```\nb"],
  ["bullet-list", "[x\ny]", "[- x\n- y]"],
  ["bullet-list", "ab|c", "- ab|c"],
  ["ordered-list", "[x\ny]", "[1. x\n2. y]"],
  ["ordered-list", "ab|c", "1. ab|c"],
  ["horizontal-rule", "a[xy]b", "a\n\n---\n\n|b"],
  ["horizontal-rule", "a|b", "a\n\n---\n\n|b"],
  ["hard-break", "foo|", "foo  \n|"], // 007 FR-004 — 줄 끝 공백 2개
  ["hard-break", "[foo]bar", "foo  \n|bar"],
];

// 본문에 [ ] | 가 들어가는 플러그인은 객체로 직접 비교
const literal: [id: string, input: EditorState, expected: EditorChange][] = [
  ["task-list", state("x\ny", 0, 3), state("- [ ] x\n- [ ] y", 0, 15)],
  ["task-list", state("abc", 1), state("- [ ] abc", 7)],
  // 007 FR-002 — 첫 제목 칸 "제목" 선택
  ["table", state("axyb", 1, 3), state(`a${TABLE}b`, 1 + HEAD, 3 + HEAD)],
  ["table", state("ab", 1), state(`a${TABLE}b`, 1 + HEAD, 3 + HEAD)],
];

describe("플러그인 apply — 추가 (US1)", () => {
  it.each(marked)("%s: %j → %j", (id, input, expected) => {
    expect(show(byId(id).apply(parse(input)))).toBe(expected);
  });

  it.each(literal)("%s: %j", (id, input, expected) => {
    const snapshot = structuredClone(input);
    expect(byId(id).apply(input)).toEqual(expected);
    expect(input).toEqual(snapshot);
  });
});

// ── US2: 토글·활성 (FR-005–FR-009, SC-002, SC-003) ──
const TOGGLES = [
  "heading-1", "heading-2", "heading-3", "bold", "italic", "strikethrough", "inline-code",
  "blockquote", "bullet-list", "ordered-list", "task-list",
];

describe("줄 접두 교체·해제", () => {
  it.each([
    ["heading-1", "## 제목|", "# 제목|"],
    ["heading-2", "## 제목|", "제목|"],
    ["heading-1", "#### 제목|", "# 제목|"],
    ["ordered-list", "[- a\n- b]", "[1. a\n2. b]"],
    ["bullet-list", "[- a\n- b]", "[a\nb]"],
    ["bullet-list", "[1. a\n2. b]", "[- a\n- b]"],
    ["blockquote", "[> a\n> b]", "[a\nb]"],
  ])("%s: %j → %j", (id, input, expected) => {
    expect(show(byId(id).apply(parse(input)))).toBe(expected);
  });

  it("완료된 작업 목록도 해제한다", () => {
    expect(byId("task-list").apply(state("- [x] a", 0, 7))).toEqual(state("a", 0, 1));
  });

  it("작업 목록 줄에 글머리 목록을 누르면 글머리로 교체", () => {
    expect(byId("bullet-list").apply(state("- [ ] a", 0, 7))).toEqual(state("- a", 0, 3));
  });
});

describe("토글 왕복 = 원문 (SC-002)", () => {
  // 인라인은 선택 상태, 줄 접두는 커서 상태에서 2회 적용
  const inline = new Set(["bold", "italic", "strikethrough", "inline-code"]);
  it.each(TOGGLES)("%s", (id) => {
    const input = inline.has(id) ? parse("앞 [강조] 뒤") : parse("본|문");
    const once = byId(id).apply(input);
    const twice = byId(id).apply(once);
    expect(twice.doc).toBe(input.doc);
  });
});

describe("연속 클릭 시 중복 구분자 없음 (SC-003)", () => {
  it.each(TOGGLES)("%s 2–10회", (id) => {
    let s: EditorState = parse("앞 [강조] 뒤");
    for (let i = 0; i < 10; i++) {
      s = byId(id).apply(s);
      expect(s.doc).not.toMatch(/\*{4}|~{3}|## ## |# # |- - |> > |1\. 1\. /);
    }
  });
});

describe("isActive (FR-009)", () => {
  it("토글 버튼만 isActive를 가진다", () => {
    expect(plugins.filter((p) => p.isActive).map((p) => p.id)).toEqual(TOGGLES);
  });

  it.each([
    ["bold", "**강|조**", true],
    ["bold", "강|조", false],
    ["heading-2", "## 제|목", true],
    ["heading-1", "## 제|목", false],
    ["task-list", "- [x] |a", true],
    ["bullet-list", "- [ ] |a", false],
  ])("%s @ %j → %s", (id, input, expected) => {
    expect(byId(id).isActive?.(parse(input))).toBe(expected);
  });
});

// ── US3: 링크·이미지 대화상자 (FR-010–FR-014, Clarification Q2) ──
function dialogOf(id: string) {
  const d = byId(id).dialog;
  if (!d) throw new Error(`${id}에 dialog 없음`);
  return d;
}

describe("link·image dialog", () => {
  it("대화상자 플러그인은 link·image 2개", () => {
    expect(plugins.filter((p) => p.dialog).map((p) => p.id)).toEqual(["link", "image"]);
  });

  it("첫 칸 이름", () => {
    expect(dialogOf("link").firstLabel).toBe("텍스트");
    expect(dialogOf("image").firstLabel).toBe("대체 텍스트");
  });

  it("선택 텍스트로 삽입 모드 열기", () => {
    expect(dialogOf("link").open(state("문서", 0, 2))).toEqual({
      mode: "insert", first: "문서", url: "", title: null, from: 0, to: 2,
    });
  });

  it("선택 없으면 기본값", () => {
    expect(dialogOf("link").open(state("ab", 1)).first).toBe("링크 텍스트");
    expect(dialogOf("image").open(state("ab", 1)).first).toBe("이미지");
  });

  it("link.submit: 주소 공백 제거, 커서는 문법 뒤", () => {
    const s = state("문서", 0, 2);
    const init = dialogOf("link").open(s);
    expect(dialogOf("link").submit(s, init, { first: "문서", url: " https://a.com " })).toEqual(
      state("[문서](https://a.com)", 19),
    );
  });

  it("image.submit: 가운데 공백은 %20", () => {
    const s = state("", 0);
    const init = dialogOf("image").open(s);
    expect(dialogOf("image").submit(s, init, { first: "로고", url: "/my logo.png" })).toEqual(
      state("![로고](/my%20logo.png)", 21),
    );
  });

  it("기존 링크 안 커서 → 수정 모드, title 유지", () => {
    const s = state('a [문서](https://a.com "t") b', 4);
    const init = dialogOf("link").open(s);
    expect(init).toEqual({ mode: "edit", first: "문서", url: "https://a.com", title: "t", from: 2, to: 25 });
    const out = dialogOf("link").submit(s, init, { first: "문서", url: "https://b.com" });
    expect(out.doc).toBe('a [문서](https://b.com "t") b');
    expect(out.selectionStart).toBe(25);
  });

  it("링크 안에서 이미지 버튼은 삽입 모드", () => {
    expect(dialogOf("image").open(state("[문서](https://a.com)", 2)).mode).toBe("insert");
  });
});

// 007 FR-004 — 다음 줄을 쓰기 전에는 미리보기에 아무것도 더해지지 않고, 쓰면 <br>
describe("강제 줄바꿈 미리보기", () => {
  const insert = (doc: string) => byId("hard-break").apply(state(doc, doc.length)).doc;
  it("문단 끝에서는 출력 없음", () => {
    expect(renderMarkdown(insert("hello"))).toBe("<p>hello</p>");
  });
  it("다음 줄을 쓰면 <br>", () => {
    expect(renderMarkdown(`${insert("hello")}world`)).toContain("<br>");
  });
});
