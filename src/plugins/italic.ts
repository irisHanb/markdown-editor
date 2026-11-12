import { Italic } from "lucide-react";
import { isInlineActive, toggleInline } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const italic: MarkdownPlugin = {
  id: "italic",
  label: "기울임",
  icon: Italic,
  group: "inline",
  shortcut: "Mod-i",
  apply: (state) => toggleInline(state, "*", 1, "기울임 텍스트"),
  isActive: (state) => isInlineActive(state, "*", 1),
};
