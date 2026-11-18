import { Bold } from "lucide-react";
import { isInlineActive, toggleInline } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const bold: MarkdownPlugin = {
  id: "bold",
  label: "굵게",
  icon: Bold,
  group: "inline",
  shortcut: "Mod-b",
  apply: (state) => toggleInline(state, "*", 2, "굵은 텍스트"),
  isActive: (state) => isInlineActive(state, "*", 2),
};
