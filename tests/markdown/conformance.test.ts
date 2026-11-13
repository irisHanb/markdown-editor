import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/pipeline";
import { conformanceCases } from "../fixtures/conformance";

// contracts/render-pipeline.md "알려진 차이" 4가지 + 코드 하이라이트(헌장 1.1.0 원칙 III)만 정규화한다. 그 외 차이는 실패.
// 5: 하이라이트가 더한 span 태그·hljs 클래스 제거. 기대값 <code>에 클래스가 없으면 자동 판별 language-*도 제거.
function stripHighlight(html: string, expected: string): string {
  let out = html
    .replace(/<span class="hljs-[^"]*">/g, "")
    .replace(/<\/span>/g, "")
    .replace(/<code class="hljs( language-[\w-]+)?">/g, (_m, lang: string | undefined) => (lang ? `<code class="${lang.trim()}">` : "<code>"));
  if (!/<code class=/.test(expected)) out = out.replace(/<code class="language-[\w-]+">/g, "<code>");
  return out;
}

function normalize(html: string): string {
  return html
    .replaceAll("user-content-", "") // 1
    .replace(/\s+/g, " ") // 2: 공백 연속 → 1칸
    .replace(/>\s+/g, ">") //    태그 뒤 공백
    .replace(/\s+</g, "<") //    태그 앞 공백
    .replace(/ class="(contains-task-list|task-list-item)"/g, "") // 3
    .replace(/\s*\/>/g, ">") // 4: void 태그 닫는 ` /`
    .trim();
}

describe("CommonMark 0.31.2 + GFM conformance (SC-002)", () => {
  it.each(conformanceCases.map((c) => [`§${c.section} ${JSON.stringify(c.markdown)}`, c] as const))(
    "%s",
    (_name, c) => {
      expect(normalize(stripHighlight(renderMarkdown(c.markdown), c.html))).toBe(normalize(c.html));
    },
  );
});
