import { Strikethrough } from "lucide-react";
import { isInlineActive, toggleInline } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const strikethrough: MarkdownPlugin = {
  id: "strikethrough",
  label: "취소선",
  icon: Strikethrough,
  group: "inline",
  shortcut: "Mod-Shift-x",
  apply: (state) => toggleInline(state, "~", 2, "취소선 텍스트"),
  isActive: (state) => isInlineActive(state, "~", 2),
};
