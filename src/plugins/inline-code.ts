import { Code } from "lucide-react";
import { isInlineActive, toggleInline } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const inlineCode: MarkdownPlugin = {
  id: "inline-code",
  label: "인라인 코드",
  icon: Code,
  group: "inline",
  shortcut: "Mod-e",
  apply: (state) => toggleInline(state, "`", 1, "코드"),
  isActive: (state) => isInlineActive(state, "`", 1),
};
