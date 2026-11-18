// 레이아웃 설정 범위·키 처리·저장 (specs/002-sidebar-layout/contracts/layout.md, data-model.md).
// React·DOM 비종속. 저장 함수는 Storage를 인자로 받는다.
export const LAYOUT_KEY = "mdeditor:layout:v1";

export type Bounds = { min: number; max: number; step: number; initial: number };
export const SIDEBAR: Bounds = { min: 180, max: 480, step: 10, initial: 260 };
export const EDITOR: Bounds = { min: 30, max: 70, step: 5, initial: 50 };

export type Layout = { sidebar: number; editor: number };
export const DEFAULT_LAYOUT: Layout = { sidebar: SIDEBAR.initial, editor: EDITOR.initial };

/** 범위 제한 + 반올림. 숫자가 아니면 initial. */
export function clamp(value: unknown, b: Bounds): number {
  if (typeof value !== "number" || Number.isNaN(value)) return b.initial;
  return Math.min(b.max, Math.max(b.min, Math.round(value)));
}

/** ←/→/Home/End → 새 값. 그 외 키는 null. */
export function stepByKey(value: number, key: string, b: Bounds): number | null {
  switch (key) {
    case "ArrowRight":
      return clamp(value + b.step, b);
    case "ArrowLeft":
      return clamp(value - b.step, b);
    case "Home":
      return b.min;
    case "End":
      return b.max;
    default:
      return null;
  }
}

/** 저장값 해석. 예외를 던지지 않는다. */
export function loadLayout(storage: Storage | null): Layout {
  try {
    const raw = storage?.getItem(LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const v = JSON.parse(raw) as Partial<Record<keyof Layout, unknown>>;
    return { sidebar: clamp(v?.sidebar, SIDEBAR), editor: clamp(v?.editor, EDITOR) };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

/** 저장. 실패해도 던지지 않는다 (FR-015). */
export function saveLayout(storage: Storage | null, layout: Layout): void {
  try {
    storage?.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // 레이아웃은 데이터 손실이 없으므로 무시한다.
  }
}
