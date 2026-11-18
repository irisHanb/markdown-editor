# Data Model: 단일 화면 마크다운 에디터 (M1)

## Document (편집 중 문서)

| 필드 | 타입 | 규칙 |
|------|------|------|
| `content` | `string` | 마크다운 원문. 빈 문자열 허용. 길이 상한 없음(저장 용량은 브라우저 한도) |

- 메모리에만 존재합니다. 출처는 CM6 `EditorState.doc`입니다.
- 제목·폴더·작성일은 없습니다(M3에서 `documents` 스토어로 확장).

## SavedSnapshot (저장본)

| 필드 | 타입 | 규칙 |
|------|------|------|
| `content` | `string` | 마지막 [저장] 시점의 `Document.content` |

- 영속 위치: `localStorage["mdeditor:v1"]`, 값은 본문 문자열 그대로(JSON 아님).
- 브라우저당 1개. 저장할 때마다 덮어씁니다.
- 키가 없으면(`getItem` → `null`) 저장본 없음으로 봅니다. 빈 문자열 `""`은 유효한 저장본입니다.

## 상태 전이

```
[열기]
 ├─ 저장본 있음 ──→ Document = 저장본, baseline = 저장본
 ├─ 저장본 없음 ──→ Document = SAMPLE, baseline = SAMPLE
 └─ 읽기 예외   ──→ Document = SAMPLE, baseline = SAMPLE   (FR-015)

[편집]  Document 변경, baseline 유지

[저장]
 ├─ 성공 ──→ SavedSnapshot = Document, baseline = Document, 알림 toastSaved
 └─ 실패 ──→ 변경 없음, 알림 toastSaveFailed (FR-014)

[취소]  Document = baseline, 알림 toastReverted
```

`baseline`은 [취소]의 복원 대상입니다. 저장본이 있으면 저장본, 없으면 샘플 문서입니다. 메모리에만
둡니다. 알림 문구는 contracts/ui.md 문구 표의 키를 따릅니다.

## 상태 전이 모듈 — `src/lib/document/session.ts`

위 전이를 React 밖 순수 함수로 둡니다(헌장 원칙 IV: 테스트 먼저).

```typescript
export type ToastKey = "toastSaved" | "toastSaveFailed" | "toastReverted";

export function resolveInitial(load: LoadResult, sample: string): { doc: string; baseline: string };
export function applySave(result: SaveResult, doc: string, baseline: string):
  { baseline: string; toast: ToastKey; kind: "success" | "error" };
export function revert(baseline: string): { doc: string; toast: ToastKey; kind: "success" };
```

| 함수 | 입력 | 출력 |
|------|------|------|
| `resolveInitial` | `{ ok: true, content: "저장본" }` | `doc = baseline = "저장본"` |
| `resolveInitial` | `{ ok: true, content: "" }` | `doc = baseline = ""` (빈 저장본 유효) |
| `resolveInitial` | `{ ok: true, content: null }` | `doc = baseline = sample` |
| `resolveInitial` | `{ ok: false }` | `doc = baseline = sample` (FR-015) |
| `applySave` | `{ ok: true }` | `baseline = doc`, `toastSaved`, success |
| `applySave` | `{ ok: false }` | `baseline` 그대로, `toastSaveFailed`, error |
| `revert` | `baseline` | `doc = baseline`, `toastReverted`, success |

## 파생 값

| 값 | 계산 | 출처 |
|----|------|------|
| `charCount` | grapheme 수, `ko-KR` 천 단위 쉼표 | FR-008, research R7 |
| `lineCount` | `content.split("\n").length` | FR-008 |
| `previewHtml` | 렌더 파이프라인 출력 | FR-004–FR-007, contracts/render-pipeline.md |
