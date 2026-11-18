# Contract: 플러그인 API·헬퍼·18개 플러그인

헌장 원칙 I. M1 계약(`specs/001-single-screen-editor/contracts/plugin.md`)을 확장합니다.

## 타입 — `src/plugins/types.ts` 추가분

```typescript
export type DialogInit = {
  mode: "insert" | "edit";
  first: string;
  url: string;
  title: string | null;
  from: number;
  to: number;
};
export type DialogValues = { first: string; url: string };

export interface PluginDialog {
  firstLabel: string;
  open(state: EditorState): DialogInit;
  submit(state: EditorState, init: DialogInit, values: DialogValues): EditorChange;
}

export interface MarkdownPlugin {
  // … M1 필드 그대로
  dialog?: PluginDialog;
}
```

## 헬퍼 — `src/plugins/helpers.ts`

| 헬퍼 | 동작 |
|------|------|
| `wrapSelection(state, before, after, placeholder)` | M1 그대로 (코드 블록·자동 링크) |
| `insertBlock(state, text)` | M1 그대로 (표·구분선) |
| `insertAtSelectionEnd(state, text)` | 선택은 두고 선택 끝에 삽입, 커서 = 삽입 끝 (강제 줄바꿈) |
| `toggleInline(state, char, size, placeholder)` | research R2. `char` = `*`·`~`·`` ` ``, `size` = 구분자 길이 |
| `isInlineActive(state, char, size)` | research R2 판정만 |
| `toggleLinePrefix(state, kind)` | research R3. kind가 속한 묶음 안에서 같은 종류면 제거, 아니면 교체·추가 |
| `isLinePrefixActive(state, kind)` | 커서 줄(선택이면 첫 비어있지 않은 줄)이 해당 종류인가 |
| `findBracketSyntax(doc, pos, image)` | `[t](u "title")` / `![t](u)` 범위·값 탐색 (같은 줄) |
| `normalizeUrl(url)` | trim + 공백 `%20` |

`family` 정의:

| family | kind → 접두 |
|--------|------------|
| `heading` | `h1` `# `, `h2` `## `, `h3` `### ` (판정 정규식 `^#{1,6} `) |
| `list` | `task` `- [ ] `(판정 `^- \[[ xX]\] `), `ordered` `{n}. `(판정 `^\d+[.)] `), `bullet` `- `(판정 `^[-*+] `) |
| `quote` | `quote` `> `(판정 `^> ?`) |

## 18개 플러그인 (`src/plugins/<file>.ts`, 레지스트리 순서)

| 묶음 | 파일 | id | label | shortcut | 동작 | 토글 |
|------|------|----|-------|----------|------|------|
| 제목 | `heading-1.ts` | `heading-1` | 제목 1 | Mod-Alt-1 | `toggleLinePrefix(heading, h1)` | O |
| | `heading-2.ts` | `heading-2` | 제목 2 | Mod-Alt-2 | `toggleLinePrefix(heading, h2)` | O |
| | `heading-3.ts` | `heading-3` | 제목 3 | Mod-Alt-3 | `toggleLinePrefix(heading, h3)` | O |
| 인라인 | `bold.ts` | `bold` | 굵게 | Mod-b | `toggleInline("*", 2, "굵은 텍스트")` | O |
| | `italic.ts` | `italic` | 기울임 | Mod-i | `toggleInline("*", 1, "기울임 텍스트")` | O |
| | `strikethrough.ts` | `strikethrough` | 취소선 | Mod-Shift-x | `toggleInline("~", 2, "취소선 텍스트")` | O |
| | `inline-code.ts` | `inline-code` | 인라인 코드 | Mod-e | `toggleInline("`", 1, "코드")` + 내용에 백틱 있으면 `` `` 내용 `` `` | O |
| 삽입 | `link.ts` | `link` | 링크 | Mod-k | `dialog` (firstLabel "텍스트", 기본값 "링크 텍스트") | X |
| | `image.ts` | `image` | 이미지 | — | `dialog` (firstLabel "대체 텍스트", 기본값 "이미지") | X |
| | `autolink.ts` | `autolink` | 자동 링크 | — | `wrapSelection("<", ">", "https://")` | X |
| 블록 | `blockquote.ts` | `blockquote` | 인용 | — | `toggleLinePrefix(quote, quote)` | O |
| | `code-block.ts` | `code-block` | 코드 블록 | — | M1 그대로 | X |
| | `bullet-list.ts` | `bullet-list` | 글머리 목록 | Mod-Shift-8 | `toggleLinePrefix(list, bullet)` | O |
| | `ordered-list.ts` | `ordered-list` | 번호 목록 | Mod-Shift-7 | `toggleLinePrefix(list, ordered)` | O |
| | `task-list.ts` | `task-list` | 작업 목록 | Mod-Shift-9 | `toggleLinePrefix(list, task)` | O |
| 구조 | `table.ts` | `table` | 표 | — | M1 그대로 | X |
| | `horizontal-rule.ts` | `horizontal-rule` | 구분선 | — | M1 그대로 | X |
| | `hard-break.ts` | `hard-break` | 강제 줄바꿈 | — | `insertAtSelectionEnd("\\\n")` | X |

`heading.ts`(M1 "제목")는 삭제합니다. 링크·이미지 공용 대화상자 로직은 `bracket-dialog.ts`(`createBracketDialog`)에 둡니다. 헤딩 3개는 `createHeadingPlugin(level)` 팩토리(`heading-factory.ts`,
requirement.md §7.4)로 만들고 파일 3개가 각각 1줄로 내보냅니다.

## 테스트 기대 예시 (`|`=커서, `[…]`=선택)

| 플러그인 | 입력 | 출력 |
|----------|------|------|
| bold | `**[강조]**` | `[강조]` |
| bold | `[**강조**]` | `[강조]` |
| bold | `**강\|조**` | `강\|조` |
| italic | `**[강조]**` | `***[강조]***` |
| bold | `***[강조]***` | `*[강조]*` |
| italic | `***[강조]***` | `**[강조]**` |
| inline-code | `a[x`y]b` | ``a`` [x`y] ``b`` |
| heading-1 | `## 제목\|` | `[# 제목]` |
| heading-2 | `## 제목\|` | `[제목]` |
| heading-1 | `#### 제목\|` | `[# 제목]` |
| ordered-list | `[x\ny]` | `[1. x\n2. y]` |
| ordered-list | `[- a\n- b]` | `[1. a\n2. b]` |
| bullet-list | `[- a\n- b]` | `[a\nb]` |
| task-list | `[- [x] a]` | `[a]` |
| bullet-list | `[a\n\nb]` | `[- a\n\n- b]` |
| hard-break | `foo\|` | `foo\\\n\|` |
| hard-break | `[foo]bar` | `foo\\\n\|bar` (선택 글자는 남고 선택은 해제) |
| autolink | `\|` | `<[https://]>` |
| link.submit | `[문서]` + `{first:"문서", url:" https://a.com "}` | `[문서](https://a.com)\|` |
| link.open | `[문서](https://a.com "t")` 안 커서 | `mode:"edit", first:"문서", url:"https://a.com", title:"t"` |
| link.submit(edit) | 위 + `{first:"문서", url:"https://b.com"}` | `[문서](https://b.com "t")\|` |
| image.submit | `\|` + `{first:"로고", url:"/my logo.png"}` | `![로고](/my%20logo.png)\|` |
