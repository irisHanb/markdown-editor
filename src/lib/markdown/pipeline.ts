import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// 처리 순서 변경 금지 (헌장 원칙 II, contracts/render-pipeline.md).
// rehype-raw는 반드시 rehype-sanitize 앞 — 뒤에 두면 정제 이후 HTML이 생긴다.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, defaultSchema)
  .use(rehypeStringify, { characterReferences: { useNamedReferences: true } });

/** 마크다운 → 정제된 HTML. 예외를 던지지 않고 실패 시 빈 문자열. */
export function renderMarkdown(markdown: string): string {
  try {
    return String(processor.processSync(markdown));
  } catch {
    return "";
  }
}
