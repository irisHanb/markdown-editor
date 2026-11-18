# Contract: 모듈 (M7)

## `src/lib/workspace/dirty.ts`

```ts
import type { DocumentForm } from "./save-plan";

export type UnsavedInput = {
  content: string;
  baseline: string;
  form: DocumentForm;
  saved: { folderId: string | null; title: string };
  isDraft: boolean;
};

/** 저장하지 않은 변경 여부 (spec FR-002, data-model.md 판단 규칙). 순수 함수 */
export function hasUnsavedChanges(input: UnsavedInput): boolean;
```

| 입력 | 기대 |
|------|------|
| 문서, 모두 같음 | `false` |
| 문서, 본문만 다름 | `true` |
| 문서, 제목만 다름 | `true` |
| 문서, 폴더만 다름 | `true` |
| 초안, 본문 `""`·제목 "제목 없는 문서"·폴더 `null` | `false` |
| 초안, 폴더만 고름 | `false` |
| 초안, 본문 1글자 | `true` |
| 초안, 제목 바꿈 | `true` |
| 문서, 제목을 바꿨다가 원래 값으로 되돌림 | `false` |

## `EditorGuard.isDirty` (M6 `useWorkspace.ts`) — 시그니처 그대로

`EditorScreen`이 `hasUnsavedChanges({ content: view 본문, baseline, form, saved, isDraft: screen === "new" })`로 구현합니다.
`beforeunload`와 `openRoute`가 같은 객체를 씁니다.

## 테스트 전용 (`tests/a11y/`)

| 파일 | 내용 |
|------|------|
| `tests/a11y/accessible-name.ts` | `unnamedElements(html: string): string[]` — parse5로 파싱, 이름 없는 `button`·`a[href]`·`input`·`select`·`textarea`·`[role=treeitem]`의 요약(태그+class 앞부분) 목록. 이름 출처: `aria-label`(공백 아님) → `aria-labelledby`(같은 문서 id의 텍스트) → 조상 `<label>` 텍스트 → `aria-hidden="true"` 하위를 뺀 텍스트. `type="hidden"` 입력 제외 |
| `tests/a11y/contrast.ts` | `contrastRatio(fg: string, bg: string): number` — WCAG 2.x 상대 휘도, `#rrggbb` |
