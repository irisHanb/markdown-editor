import { Table } from "lucide-react";
import { insertBlock } from "./helpers";
import type { MarkdownPlugin } from "./types";

// 2열 표 견본 (디자인 시안 값)
const TABLE = "\n| 제목 | 설명 |\n|---|---|\n| 내용1 | 내용2 |\n";
const HEAD = TABLE.indexOf("제목");

export const table: MarkdownPlugin = {
  id: "table",
  label: "표",
  icon: Table,
  group: "block",
  // 먼저 고칠 첫 제목 칸을 선택한다 (007 FR-002)
  apply: (state) => {
    const at = state.selectionStart + HEAD;
    return { ...insertBlock(state, TABLE), selectionStart: at, selectionEnd: at + "제목".length };
  },
};
