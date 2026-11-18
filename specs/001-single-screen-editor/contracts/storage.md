# Contract: 로컬 저장

헌장 원칙 V(M1 예외). 데이터 형식은 data-model.md, 결정 근거는 research R8.

## 함수 — `src/lib/storage/local-document.ts`

```typescript
export const STORAGE_KEY = "mdeditor:v1";

export type LoadResult = { ok: true; content: string | null } | { ok: false };
export type SaveResult = { ok: true } | { ok: false };

export function loadDocument(storage: Storage): LoadResult;
export function saveDocument(storage: Storage, content: string): SaveResult;
```

## 규칙

| 상황 | 결과 |
|------|------|
| 키 없음 | `{ ok: true, content: null }` |
| 값 `""` | `{ ok: true, content: "" }` |
| `getItem` 예외 | `{ ok: false }` — 호출부는 샘플 문서로 시작 |
| `setItem` 성공 | `{ ok: true }` |
| `setItem` 예외(`QuotaExceededError`, `SecurityError` 등) | `{ ok: false }` — 기존 저장본 유지 |

- 두 함수는 예외를 밖으로 던지지 않습니다.
- `window.localStorage` 접근 자체가 예외를 던지는 환경(일부 비공개 모드)이 있으므로, 호출부는
  `localStorage` 참조도 `try`로 감쌉니다.

## 테스트

`tests/lib/local-document.test.ts`: `Storage` 가짜 객체로 위 표 5행을 검증합니다. jsdom 불필요.
