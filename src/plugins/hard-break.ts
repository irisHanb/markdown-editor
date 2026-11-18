import { WrapText } from "lucide-react";
import { insertAtSelectionEnd } from "./helpers";
import type { MarkdownPlugin } from "./types";

// 줄 끝 공백 2개 방식 — 다음 줄을 쓰기 전에는 미리보기에 아무것도 더하지 않는다. 백슬래시 방식은 문단 끝에서
// `\` 글자가 그대로 보였다 (007 FR-004, CommonMark §6.7, markdown-editor-spec.md §4.9)
export const hardBreak: MarkdownPlugin = {
  id: "hard-break",
  label: "강제 줄바꿈",
  icon: WrapText,
  group: "inline",
  apply: (state) => insertAtSelectionEnd(state, "  \n"),
};
