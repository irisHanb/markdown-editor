import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// 언어를 적지 않은 코드 블록의 자동 판별 후보 (specs/007-usability-fixes FR-010). 후보가 많을수록 판별이 느려진다.
// css는 뺀다 — 넣으면 JS·HTML·TS 블록까지 css로 판별했다. css는 ```css로 언어를 적으면 강조된다.
const DETECT = ["javascript", "typescript", "python", "java", "bash", "json", "xml", "sql", "go"];

// 하이라이트가 더하는 클래스만 추가 허용 — code의 hljs, span의 hljs-* (헌장 1.1.0 원칙 II, XSS 회귀: tests/markdown/highlight.test.ts)
const schema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", "hljs", /^language-./]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", /^hljs-./]],
  },
};

// 처리 순서 변경 금지 (헌장 원칙 II, contracts/render-pipeline.md).
// rehype-raw·rehype-highlight는 반드시 rehype-sanitize 앞 — 뒤에 두면 정제 이후 HTML이 생긴다.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeHighlight, { detect: true, subset: DETECT })
  .use(rehypeSanitize, schema)
  .use(rehypeStringify, { characterReferences: { useNamedReferences: true } });

/** 마크다운 → 정제된 HTML. 예외를 던지지 않고 실패 시 빈 문자열. */
export function renderMarkdown(markdown: string): string {
  try {
    return String(processor.processSync(markdown));
  } catch {
    return "";
  }
}
