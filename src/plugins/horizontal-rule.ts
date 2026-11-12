import { Minus } from "lucide-react";
import { insertBlock } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const horizontalRule: MarkdownPlugin = {
  id: "horizontal-rule",
  label: "구분선",
  icon: Minus,
  group: "block",
  apply: (state) => insertBlock(state, "\n\n---\n\n"),
};
