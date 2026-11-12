# Contract: 툴바 플러그인

헌장 원칙 I. 원본 인터페이스는 `docs/requirement.md §7`, `docs/TRD.md §3.1`.

## 인터페이스 — `src/plugins/types.ts`

```typescript
import type { LucideIcon } from "lucide-react";

export interface EditorState { doc: string; selectionStart: number; selectionEnd: number; }
export interface EditorChange { doc: string; selectionStart: number; selectionEnd: number; }
export type PluginGroup = "inline" | "block" | "special";

export interface MarkdownPlugin {
  id: string;
  label: string;        // 한글. 버튼 aria-label·title로 사용
  icon: LucideIcon;
  group: PluginGroup;
  shortcut?: string;    // M1 미사용
  apply(state: EditorState): EditorChange;
  isActive?(state: EditorState): boolean;  // M1 미사용
}
```

## 규칙

- `apply`는 순수 함수입니다. 같은 입력에 같은 출력, 입력 객체를 변경하지 않음, DOM·CM6·React 접근 없음.
- `selectionStart ≤ selectionEnd`이고 둘 다 `0 ≤ x ≤ doc.length`인 입력에서, 출력도 같은 조건을 만족해야
  합니다.
- 레지스트리 `src/plugins/index.ts`는 `pluginGroups: MarkdownPlugin[][]`(툴바 묶음 3개)를 내보냅니다.
  묶음 안 순서가 표시 순서이고, 툴바는 묶음 경계마다 구분선을 그립니다. 새 플러그인은 해당 묶음 배열에
  1줄 추가합니다. 평탄화 목록은 `plugins = pluginGroups.flat()`입니다.

## 헬퍼 — `src/plugins/helpers.ts`

| 헬퍼 | 동작 | 결과 선택 범위 |
|------|------|---------------|
| `wrapSelection(state, before, after, placeholder)` | 선택(없으면 placeholder)을 감쌈 | 감싼 안쪽 텍스트 |
| `prefixLines(state, prefix)` | 선택이 걸친 모든 줄 앞에 prefix | 바뀐 줄 전체 |
| `insertBlock(state, text)` | 선택을 text로 교체 | text 끝(빈 선택) |

## M1 플러그인 12개

| 순서 | 파일 | `id` | `label` | `group` | 동작 | placeholder |
|------|------|------|---------|---------|------|-------------|
| 1 | `heading.ts` | `heading` | 제목 | block | `prefixLines("## ")` | — |
| 2 | `bold.ts` | `bold` | 굵게 | inline | `wrapSelection("**", "**")` | 굵은 텍스트 |
| 3 | `italic.ts` | `italic` | 기울임 | inline | `wrapSelection("*", "*")` | 기울임 텍스트 |
| 4 | `strikethrough.ts` | `strikethrough` | 취소선 | inline | `wrapSelection("~~", "~~")` | 취소선 텍스트 |
| 5 | `blockquote.ts` | `blockquote` | 인용 | block | `prefixLines("> ")` | — |
| 6 | `inline-code.ts` | `inline-code` | 인라인 코드 | inline | ``wrapSelection("`", "`")`` | 코드 |
| 7 | `code-block.ts` | `code-block` | 코드 블록 | block | ``wrapSelection("\n```\n", "\n```\n")`` | 코드 |
| 8 | `link.ts` | `link` | 링크 | special | `[선택](https://)` 삽입, `https://` 선택 | 링크 텍스트 |
| 9 | `bullet-list.ts` | `bullet-list` | 글머리 목록 | block | `prefixLines("- ")` | — |
| 10 | `ordered-list.ts` | `ordered-list` | 번호 목록 | block | `prefixLines("1. ")` | — |
| 11 | `table.ts` | `table` | 표 | block | `insertBlock(TABLE)` | — |
| 12 | `horizontal-rule.ts` | `horizontal-rule` | 구분선 | block | `insertBlock("\n\n---\n\n")` | — |

`TABLE` = `"\n| 제목 | 설명 |\n|---|---|\n| 내용1 | 내용2 |\n"` (시안 값).

툴바 묶음은 시안 배치를 따릅니다: [1–4] 제목·굵게·기울임·취소선 | [5–8] 인용·인라인 코드·코드 블록·링크 |
[9–12] 글머리 목록·번호 목록·표·구분선. `group` 필드는 플러그인 동작 분류이고 툴바 묶음과 별개입니다.
인덱스 상수를 쓰지 않으므로 플러그인을 추가해도 구분선 위치가 어긋나지 않습니다.

## 테스트 기대 예시

| 플러그인 | 입력 (`|`=커서, `[…]`=선택) | 출력 |
|----------|-----------------------------|------|
| bold | `a[강조]b` | `a**[강조]**b` |
| bold | `a|b` | `a**[굵은 텍스트]**b` |
| bullet-list | `[x\ny]` | `[- x\n- y]` |
| heading | `ab|c` | `[## abc]` |
| link | `[문서]` | `[문서]([https://])` |
| horizontal-rule | `a|b` | `a\n\n---\n\n|b` |
