import { Link2 } from "lucide-react";
import { wrapSelection } from "./helpers";
import type { MarkdownPlugin } from "./types";

export const autolink: MarkdownPlugin = {
  id: "autolink",
  label: "자동 링크",
  icon: Link2,
  group: "inline",
  // 선택이 없으면 커서를 https:// 뒤에 둬 주소를 이어서 쓰게 한다 — 선택 상태면 입력이 https://를 지운다 (007 FR-003)
  apply: (state) => {
    const r = wrapSelection(state, "<", ">", "https://");
    if (state.selectionStart !== state.selectionEnd) return r;
    return { ...r, selectionStart: r.selectionEnd, selectionEnd: r.selectionEnd };
  },
};
