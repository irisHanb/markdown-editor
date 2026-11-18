import { ListChecks } from "lucide-react";
import { isLinePrefixActive, toggleLinePrefix } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const taskList: MarkdownPlugin = {
  id: "task-list",
  label: "작업 목록",
  icon: ListChecks,
  group: "block",
  shortcut: "Mod-Shift-9",
  apply: (state) => toggleLinePrefix(state, "task"),
  isActive: (state) => isLinePrefixActive(state, "task"),
};
