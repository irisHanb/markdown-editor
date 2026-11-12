"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { type Bounds, clamp, stepByKey } from "@/lib/layout/layout";

type Props = {
  label: string;
  bounds: Bounds;
  value: number;
  valueText: (v: number) => string;
  /** 포인터 x → 원시 값 (clamp 전) */
  fromPointer: (clientX: number) => number;
  /** 끌기 중·키 입력 시 */
  onChange: (v: number) => void;
  /** 끌기 종료·키 입력 직후 (저장) */
  onCommit: (v: number) => void;
};

// WAI-ARIA Window Splitter 패턴 (specs/002-sidebar-layout/contracts/ui.md, research R4·R6).
export function ResizeHandle({ label, bounds, value, valueText, fromPointer, onChange, onCommit }: Props) {
  const dragging = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onCommit(latest.current);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); // 편집 영역 텍스트 선택 방지 (FR-012)
    e.currentTarget.setPointerCapture(e.pointerId); // 창 밖으로 나가도 이벤트 수신
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const next = clamp(fromPointer(e.clientX), bounds);
    latest.current = next;
    onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = stepByKey(value, e.key, bounds);
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    onCommit(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      aria-valuetext={valueText(value)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={onKeyDown}
      className="group relative z-10 -mx-1 flex w-2 flex-none cursor-col-resize touch-none justify-center outline-none focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      <span className="h-full w-px bg-[var(--border)] group-hover:bg-[var(--accent)] group-active:bg-[var(--accent)]" />
    </div>
  );
}
