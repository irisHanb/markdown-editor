import { SquareCode } from "lucide-react";
import { wrapSelection } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const codeBlock: MarkdownPlugin = {
  id: "code-block",
  label: "코드 블록",
  // 박스 안 <> — 사용자 지정(2026-11-13). [인라인 코드](<>) 바로 옆에 두어 박스 유무로 구별한다 (007 FR-008·FR-009)
  icon: SquareCode,
  group: "block",
  apply: (state) => wrapSelection(state, "\n```\n", "\n```\n", "코드"),
};
