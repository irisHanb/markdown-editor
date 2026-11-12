import { Link2 } from "lucide-react";
import { wrapSelection } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const autolink: MarkdownPlugin = {
  id: "autolink",
  label: "자동 링크",
  icon: Link2,
  group: "inline",
  apply: (state) => wrapSelection(state, "<", ">", "https://"),
};
