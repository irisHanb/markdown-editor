import { SquareCode } from "lucide-react";
import { wrapSelection } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const codeBlock: MarkdownPlugin = {
  id: "code-block",
  label: "코드 블록",
  icon: SquareCode,
  group: "block",
  apply: (state) => wrapSelection(state, "\n```\n", "\n```\n", "코드"),
};
