import { autolink } from "./autolink";
import { blockquote } from "./blockquote";
import { bold } from "./bold";
import { bulletList } from "./bullet-list";
import { codeBlock } from "./code-block";
import { hardBreak } from "./hard-break";
import { heading1 } from "./heading-1";
import { heading2 } from "./heading-2";
import { heading3 } from "./heading-3";
import { horizontalRule } from "./horizontal-rule";
import { image } from "./image";
import { inlineCode } from "./inline-code";
import { italic } from "./italic";
import { link } from "./link";
import { orderedList } from "./ordered-list";
import { strikethrough } from "./strikethrough";
import { table } from "./table";
import { taskList } from "./task-list";
import type { MarkdownPlugin } from "./types";

// 툴바 묶음 5개 (specs/003-full-toolbar FR-001). 새 플러그인은 해당 묶음에 1줄 추가한다 (헌장 원칙 I).
// 구분선은 묶음 경계에서 툴바가 그리므로 인덱스 상수가 없다.
export const pluginGroups: MarkdownPlugin[][] = [
  [heading1, heading2, heading3],
  [bold, italic, strikethrough, inlineCode],
  [link, image, autolink],
  [blockquote, codeBlock, bulletList, orderedList, taskList],
  [table, horizontalRule, hardBreak],
];

export const plugins: MarkdownPlugin[] = pluginGroups.flat();
