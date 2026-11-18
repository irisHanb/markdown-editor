import { Image } from "lucide-react";
import { createBracketDialog } from "./bracket-dialog";
import type { MarkdownPlugin } from "./types";

// 입력은 대화상자로 받는다 (FR-010). 기존 이미지 안이면 수정 모드 (FR-010a).
export const image: MarkdownPlugin = {
  id: "image",
  label: "이미지",
  icon: Image,
  group: "special",
  apply: (state) => ({ ...state }),
  dialog: createBracketDialog(true, "대체 텍스트", "이미지"),
};
