import { List } from "lucide-react";
import { isLinePrefixActive, toggleLinePrefix } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const bulletList: MarkdownPlugin = {
  id: "bullet-list",
  label: "글머리 목록",
  icon: List,
  group: "block",
  shortcut: "Mod-Shift-8",
  apply: (state) => toggleLinePrefix(state, "bullet"),
  isActive: (state) => isLinePrefixActive(state, "bullet"),
};
