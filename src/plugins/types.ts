import type { LucideIcon } from "lucide-react";

// 플러그인 계약 (헌장 원칙 I, contracts/plugin.md). 프레임워크 비종속 모델.
export interface EditorState {
  doc: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface EditorChange {
  doc: string;
  selectionStart: number;
  selectionEnd: number;
}

export type PluginGroup = "inline" | "block" | "special";

/** 대화상자를 열 때 계산한 초기값 (specs/003-full-toolbar/data-model.md) */
export type DialogInit = {
  mode: "insert" | "edit";
  first: string;
  url: string;
  title: string | null;
  /** 교체 범위 — 삽입 모드는 선택 범위, 수정 모드는 기존 문법 전체 */
  from: number;
  to: number;
};

export type DialogValues = { first: string; url: string };

/** 입력이 필요한 플러그인(링크·이미지). 입력 단계는 화면이, 값 해석·문법 조립은 플러그인이 맡는다. */
export interface PluginDialog {
  firstLabel: string;
  open(state: EditorState): DialogInit;
  submit(state: EditorState, init: DialogInit, values: DialogValues): EditorChange;
}

export interface MarkdownPlugin {
  id: string;
  /** 한글. 버튼 aria-label·title로 사용 */
  label: string;
  icon: LucideIcon;
  group: PluginGroup;
  shortcut?: string;
  /** 순수 함수 — 입력 불변, DOM·CM6·React 접근 없음 */
  apply(state: EditorState): EditorChange;
  isActive?(state: EditorState): boolean;
  /** 있으면 apply 대신 대화상자로 실행한다 */
  dialog?: PluginDialog;
}
