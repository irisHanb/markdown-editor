import { ListOrdered } from "lucide-react";
import { isLinePrefixActive, toggleLinePrefix } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const orderedList: MarkdownPlugin = {
  id: "ordered-list",
  label: "번호 목록",
  icon: ListOrdered,
  group: "block",
  shortcut: "Mod-Shift-7",
  apply: (state) => toggleLinePrefix(state, "ordered"),
  isActive: (state) => isLinePrefixActive(state, "ordered"),
};
