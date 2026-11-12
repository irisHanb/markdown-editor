import { WrapText } from "lucide-react";
import { insertAtSelectionEnd } from "./helpers";
import type { MarkdownPlugin } from "./types";

// 백슬래시 방식 — 줄 끝 공백 2개는 보이지 않아 혼란 (markdown-editor-spec.md §4.9)
export const hardBreak: MarkdownPlugin = {
  id: "hard-break",
  label: "강제 줄바꿈",
  icon: WrapText,
  group: "inline",
  apply: (state) => insertAtSelectionEnd(state, "\\\n"),
};
