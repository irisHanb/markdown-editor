import { Link } from "lucide-react";
import { createBracketDialog } from "./bracket-dialog";
import type { MarkdownPlugin } from "./types";

// 입력은 대화상자로 받는다 (FR-010). 기존 링크 안이면 수정 모드 (FR-010a).
export const link: MarkdownPlugin = {
  id: "link",
  label: "링크",
  icon: Link,
  group: "special",
  shortcut: "Mod-k",
  apply: (state) => ({ ...state }),
  dialog: createBracketDialog(false, "텍스트", "링크 텍스트"),
};
