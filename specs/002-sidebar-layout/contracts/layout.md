# Contract: 레이아웃 순수 모듈

`src/lib/layout/layout.ts`. React·DOM 비종속(저장 함수는 `Storage`를 인자로 받음). 규칙은 data-model.md.

```typescript
export const LAYOUT_KEY = "mdeditor:layout:v1";

export type Bounds = { min: number; max: number; step: number; initial: number };
export const SIDEBAR: Bounds = { min: 180, max: 480, step: 10, initial: 260 };
export const EDITOR: Bounds = { min: 30, max: 70, step: 5, initial: 50 };

export type Layout = { sidebar: number; editor: number };
export const DEFAULT_LAYOUT: Layout; // { sidebar: 260, editor: 50 }

/** 범위 제한 + 반올림. 숫자가 아니면 initial. */
export function clamp(value: unknown, b: Bounds): number;

/** ←/→/Home/End → 새 값. 그 외 키는 null(처리 안 함). */
export function stepByKey(value: number, key: string, b: Bounds): number | null;

/** 저장값 해석. 예외를 던지지 않는다. */
export function loadLayout(storage: Storage | null): Layout;

/** 저장. 예외를 던지지 않는다(실패 무시, FR-015). */
export function saveLayout(storage: Storage | null, layout: Layout): void;
```

## `stepByKey` 표

| key | 결과 |
|-----|------|
| `ArrowRight` | `clamp(value + step)` |
| `ArrowLeft` | `clamp(value - step)` |
| `Home` | `min` |
| `End` | `max` |
| 그 외 | `null` |

사이드바 경계의 ←는 사이드바를 줄이고, 에디터 경계의 ←는 에디터 비율을 줄입니다(경계가 왼쪽으로
움직이는 방향과 같음).

## 테스트 — `tests/lib/layout.test.ts`

- `clamp`: 범위 안, 최소 미만, 최대 초과, 소수 반올림, `"260"`·`null`·`NaN` → initial
- `stepByKey`: 표 5행 × 두 Bounds, 최소·최대에서 더 누르면 그대로
- `loadLayout`: data-model.md 복원 규칙 표 6행(`null` storage 포함)
- `saveLayout`: JSON 형식·키 확인, `setItem` 예외 시 던지지 않음
