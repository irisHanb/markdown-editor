import { Quote } from "lucide-react";
import { isLinePrefixActive, toggleLinePrefix } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const blockquote: MarkdownPlugin = {
  id: "blockquote",
  label: "인용",
  icon: Quote,
  group: "block",
  apply: (state) => toggleLinePrefix(state, "quote"),
  isActive: (state) => isLinePrefixActive(state, "quote"),
};
