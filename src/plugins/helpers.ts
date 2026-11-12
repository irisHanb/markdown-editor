import type { EditorChange, EditorState } from "./types";

/** 선택(없으면 placeholder)을 before/after로 감싸고 안쪽 텍스트를 선택한다. */
export function wrapSelection(state: EditorState, before: string, after: string, placeholder: string): EditorChange {
  const { doc, selectionStart: s, selectionEnd: e } = state;
  const inner = doc.slice(s, e) || placeholder;
  const start = s + before.length;
  return {
    doc: doc.slice(0, s) + before + inner + after + doc.slice(e),
    selectionStart: start,
    selectionEnd: start + inner.length,
  };
}

/** 선택을 text로 바꾸고 커서를 삽입 끝에 둔다. */
export function insertBlock(state: EditorState, text: string): EditorChange {
  const { doc, selectionStart: s, selectionEnd: e } = state;
  const caret = s + text.length;
  return { doc: doc.slice(0, s) + text + doc.slice(e), selectionStart: caret, selectionEnd: caret };
}

/** 선택 글자는 두고 선택 끝에 text를 넣는다. 커서는 삽입 끝 (강제 줄바꿈). */
export function insertAtSelectionEnd(state: EditorState, text: string): EditorChange {
  const { doc, selectionEnd: e } = state;
  const caret = e + text.length;
  return { doc: doc.slice(0, e) + text + doc.slice(e), selectionStart: caret, selectionEnd: caret };
}

// ── 줄 접두 (research R3) ──────────────────────────────────────────────

export type LineKind = "h1" | "h2" | "h3" | "quote" | "bullet" | "ordered" | "task";

type KindDef = { family: RegExp; detect: RegExp; prefix: (n: number) => string };

// 같은 family 안의 접두는 서로 배타 — 다른 종류가 있으면 교체한다 (FR-008).
const HEADING = /^#{1,6} /;
const LIST = /^(- \[[ xX]\] |\d+[.)] |[-*+] )/;
const QUOTE = /^> ?/;

const KINDS: Record<LineKind, KindDef> = {
  h1: { family: HEADING, detect: /^# /, prefix: () => "# " },
  h2: { family: HEADING, detect: /^## /, prefix: () => "## " },
  h3: { family: HEADING, detect: /^### /, prefix: () => "### " },
  quote: { family: QUOTE, detect: QUOTE, prefix: () => "> " },
  task: { family: LIST, detect: /^- \[[ xX]\] /, prefix: () => "- [ ] " },
  ordered: { family: LIST, detect: /^\d+[.)] /, prefix: (n) => `${n}. ` },
  bullet: { family: LIST, detect: /^[-*+] (?!\[[ xX]\] )/, prefix: () => "- " },
};

function lineRange(doc: string, s: number, e: number): [number, number] {
  const start = doc.lastIndexOf("\n", s - 1) + 1;
  const nl = doc.indexOf("\n", e);
  return [start, nl === -1 ? doc.length : nl];
}

/** 대상 줄 인덱스 — 빈 줄은 제외, 전부 빈 줄이면 전부 대상 */
function targetIndexes(lines: string[]): number[] {
  const nonBlank = lines.flatMap((l, i) => (l.trim() ? [i] : []));
  return nonBlank.length ? nonBlank : lines.map((_, i) => i);
}

/**
 * 선택이 걸친 줄들에 kind 접두를 토글한다. 대상 줄이 모두 kind면 제거, 아니면 같은 family 접두를
 * kind로 교체(없으면 추가). 바뀐 줄 전체를 선택한다.
 * ponytail: 줄 맨 앞만 본다 — 인용 안 목록(`> - a`)의 목록 접두는 판정하지 않는다.
 */
export function toggleLinePrefix(state: EditorState, kind: LineKind): EditorChange {
  const { doc, selectionStart: s, selectionEnd: e } = state;
  const def = KINDS[kind];
  const [start, end] = lineRange(doc, s, e);
  const lines = doc.slice(start, end).split("\n");
  const targets = targetIndexes(lines);
  const remove = targets.every((i) => def.detect.test(lines[i]));
  let n = 0;
  for (const i of targets) {
    const body = lines[i].replace(def.family, "");
    lines[i] = remove ? body : def.prefix(++n) + body;
  }
  const block = lines.join("\n");
  return { doc: doc.slice(0, start) + block + doc.slice(end), selectionStart: start, selectionEnd: start + block.length };
}

/** 커서 줄(선택이면 첫 비어있지 않은 줄)이 kind인가. */
export function isLinePrefixActive(state: EditorState, kind: LineKind): boolean {
  const { doc, selectionStart: s, selectionEnd: e } = state;
  const [start, end] = lineRange(doc, s, e);
  const lines = doc.slice(start, end).split("\n");
  return KINDS[kind].detect.test(lines[targetIndexes(lines)[0]]);
}

// ── 인라인 토글 (research R2) ─────────────────────────────────────────

export type InlineChar = "*" | "~" | "`";

/** 구분자 연속 길이 run이 size 서식을 포함하는가. `*`: 1 기울임, 2 굵게, 3 둘 다 (FR-006). */
function hasMarker(char: InlineChar, run: number, size: number): boolean {
  if (char === "*") return size === 2 ? run === 2 || run === 3 : run === 1 || run === 3;
  if (char === "~") return run === 2;
  return run >= 1;
}

function edgeRun(text: string, char: string, fromEnd: boolean): number {
  let n = 0;
  while (n < text.length && text[fromEnd ? text.length - 1 - n : n] === char) n++;
  return n;
}

const escapeRe = (c: string) => c.replace(/[*~`]/g, "\\$&");

/** 해제 계획: 내용 [from, to) 양옆 구분자 k개(+ 백틱 코드 안쪽 공백 pad개)를 지운다. */
type Removal = { from: number; to: number; k: number; pad: number; selectContent: boolean };

/**
 * 선택(또는 커서)을 감싼 같은 줄의 서식을 찾는다. 없거나 size 서식이 아니면 null.
 * ponytail: 같은 줄·단순 중첩만 판정 — `**a *b* c**`의 안쪽 기울임 같은 중첩은 바깥 범위 기준.
 */
function findInline(state: EditorState, char: InlineChar, size: number): Removal | null {
  const { doc, selectionStart: s, selectionEnd: e } = state;
  const k = (run: number) => (char === "`" ? run : size);

  // 1) 선택이 구분자까지 포함 — [**강조**]
  if (e > s) {
    const t = doc.slice(s, e);
    const run = Math.min(edgeRun(t, char, false), edgeRun(t, char, true));
    if (run > 0 && t.length > run * 2 && hasMarker(char, run, size)) {
      return { from: s + run, to: e - run, k: k(run), pad: 0, selectContent: true };
    }
  }

  // 2) 선택·커서가 같은 줄 서식 범위 안 — **[강조]**, **강|조**
  const lineStart = doc.lastIndexOf("\n", s - 1) + 1;
  const nl = doc.indexOf("\n", s);
  const line = doc.slice(lineStart, nl === -1 ? doc.length : nl);
  const c = escapeRe(char);
  const span = new RegExp(`(${c}+)(?!${c})(.+?)(?<!${c})\\1(?!${c})`, "g");
  for (const m of line.matchAll(span)) {
    const run = m[1].length;
    const from = lineStart + (m.index ?? 0) + run;
    const to = from + m[2].length;
    if (s < from || e > to) continue;
    if (!hasMarker(char, run, size)) return null;
    const pad = char === "`" && run > 1 && doc[from] === " " && doc[to - 1] === " " && to - from > 2 ? 1 : 0;
    return { from, to, k: k(run), pad, selectContent: false };
  }
  return null;
}

/** 감싼 서식이 있으면 해제, 없으면 추가(선택 없으면 placeholder). FR-005, FR-006. */
export function toggleInline(state: EditorState, char: InlineChar, size: number, placeholder: string): EditorChange {
  const r = findInline(state, char, size);
  if (!r) {
    const inner = state.doc.slice(state.selectionStart, state.selectionEnd);
    // 내용에 백틱이 있으면 백틱 2개 + 안쪽 공백으로 감싼다 (markdown-editor-spec.md §4.4)
    if (char === "`" && inner.includes("`")) return wrapSelection(state, "`` ", " ``", placeholder);
    const marker = char.repeat(size);
    return wrapSelection(state, marker, marker, placeholder);
  }
  const { doc, selectionStart: s, selectionEnd: e } = state;
  const contentFrom = r.from + r.pad;
  const contentTo = r.to - r.pad;
  const start = r.from - r.k; // 새 문서에서 내용 시작
  const len = contentTo - contentFrom;
  const next = doc.slice(0, start) + doc.slice(contentFrom, contentTo) + doc.slice(r.to + r.k);
  if (r.selectContent) return { doc: next, selectionStart: start, selectionEnd: start + len };
  const shift = (p: number) => Math.min(start + len, Math.max(start, p - r.k - r.pad));
  return { doc: next, selectionStart: shift(s), selectionEnd: shift(e) };
}

export function isInlineActive(state: EditorState, char: InlineChar, size: number): boolean {
  return findInline(state, char, size) !== null;
}

// ── 링크·이미지 문법 (specs/003-full-toolbar FR-010a, FR-013) ─────────────

export type BracketSyntax = { from: number; to: number; text: string; url: string; title: string | null };

/** pos를 포함하는 같은 줄의 `[t](u "title")`(image면 `![t](u)`)를 찾는다. 없으면 null. */
export function findBracketSyntax(doc: string, pos: number, image: boolean): BracketSyntax | null {
  const lineStart = doc.lastIndexOf("\n", pos - 1) + 1;
  const nl = doc.indexOf("\n", pos);
  const line = doc.slice(lineStart, nl === -1 ? doc.length : nl);
  for (const m of line.matchAll(/(!?)\[([^\]\n]*)\]\(([^)\s]*)(?:\s+"([^"]*)")?\)/g)) {
    const from = lineStart + (m.index ?? 0);
    const to = from + m[0].length;
    if (pos < from || pos > to) continue;
    if ((m[1] === "!") !== image) return null;
    return { from, to, text: m[2], url: m[3], title: m[4] ?? null };
  }
  return null;
}

/** 앞뒤 공백 제거, 가운데 공백은 %20 — 공백이 있으면 링크가 끊긴다. */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\s+/g, "%20");
}
