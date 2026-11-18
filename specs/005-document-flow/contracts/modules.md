# Contract: 순수 모듈 (M6)

## `src/lib/route/route.ts`

```typescript
export type Route =
  | { view: "doc"; id: string }
  | { view: "new" }
  | { view: "dashboard" }
  | { view: "home" };

export function parseRoute(hash: string): Route;   // "#/doc/a%20b" → { view: "doc", id: "a b" }
export function formatRoute(route: Route): string;  // { view: "home" } → ""
export function sameRoute(a: Route, b: Route): boolean;
```

## `src/lib/workspace/save-plan.ts`

```typescript
import type { Doc } from "./repository";
import type { NameCheck } from "./names";

export type SaveTarget = { kind: "draft" } | { kind: "doc"; doc: Doc };
export type DocumentForm = { folderId: string | null; title: string };
export type SavePlan =
  | { kind: "create"; folderId: string; title: string; renamed: boolean }
  | { kind: "update"; patch: { content: string; title?: string; folderId?: string } }
  | { kind: "error"; reason: "noFolder" | Exclude<NameCheck, { ok: true }>["reason"] };

export const UNTITLED = "제목 없는 문서";
/** "제목" → 겹치면 "제목-1", "제목-2"… 비어 있는 가장 작은 번호 (대소문자 무시) */
export function uniqueTitle(title: string, siblings: string[]): string;
/** data-model.md "저장 결정" 표 */
export function planSave(target: SaveTarget, form: DocumentForm, content: string, docs: Doc[]): SavePlan;
```

## `src/lib/text/date.ts`

```typescript
/** epoch ms → "YYYY-MM-DD HH:mm" (실행 환경 시간대) */
export function formatDateTime(epoch: number): string;
```

## Repository 추가 — `updateDocument`

contracts는 `specs/004-folder-storage/contracts/repository.md`를 따르며 `saveContent`를 대체합니다.

## 테스트

| 파일 | 대상 |
|------|------|
| `tests/lib/route.test.ts` | parse 4종 + 알 수 없는 형식 → home, `%20` 인코딩 왕복, `sameRoute` |
| `tests/lib/workspace/save-plan.test.ts` | `uniqueTitle`(없음·-1·-2 비어 있음 채우기·대소문자), `planSave` 표 7행, 빈 제목 → "제목 없는 문서" |
| `tests/lib/date.test.ts` | `formatDateTime` 자릿수 채우기 (`TZ=UTC` 고정 또는 지역 시각으로 기대값 계산) |
| `tests/lib/workspace/repository.test.ts` | `updateDocument` 본문·제목·폴더 변경, 없는 폴더로 옮기기 reject(문서 그대로), `updatedAt` 증가 — 두 구현 |
