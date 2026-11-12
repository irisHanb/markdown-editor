import { Heading1, Heading2, Heading3 } from "lucide-react";
import { isLinePrefixActive, toggleLinePrefix } from "./helpers";
import type { MarkdownPlugin } from "./types";

const kinds = ["h1", "h2", "h3"] as const;
const icons = [Heading1, Heading2, Heading3];

/** H1–H3 제목 플러그인 팩토리 (H4–H6 버튼 없음, 2026-11-12 결정). */
export function createHeadingPlugin(level: 1 | 2 | 3): MarkdownPlugin {
  const kind = kinds[level - 1];
  return {
    id: `heading-${level}`,
    label: `제목 ${level}`,
    icon: icons[level - 1],
    group: "block",
    shortcut: `Mod-Alt-${level}`,
    apply: (state) => toggleLinePrefix(state, kind),
    isActive: (state) => isLinePrefixActive(state, kind),
  };
}
