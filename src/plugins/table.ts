import { Table } from "lucide-react";
import { insertBlock } from "./helpers";
import type { MarkdownPlugin } from "./types";

// 2열 표 견본 (디자인 시안 값)
const TABLE = "\n| 제목 | 설명 |\n|---|---|\n| 내용1 | 내용2 |\n";

export const table: MarkdownPlugin = {
  id: "table",
  label: "표",
  icon: Table,
  group: "block",
  apply: (state) => insertBlock(state, TABLE),
};
