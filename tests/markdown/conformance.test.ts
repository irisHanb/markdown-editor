import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/pipeline";
import { conformanceCases } from "../fixtures/conformance";

// contracts/render-pipeline.md "알려진 차이" 4가지만 정규화한다. 그 외 차이는 실패.
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
      expect(normalize(renderMarkdown(c.markdown))).toBe(normalize(c.html));
    },
  );
});
