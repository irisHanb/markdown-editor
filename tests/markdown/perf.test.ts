import { describe, expect, it } from "vitest";
import { SAMPLE } from "@/content/sample";
import { renderMarkdown } from "@/lib/markdown/pipeline";

// SC-001 예산(150ms) 중 렌더 몫 50ms. 디바운스 100ms는 research R6.
describe("렌더 성능 예산", () => {
  it("1만 자 문서 렌더 중앙값이 50ms 이하", () => {
    let doc = SAMPLE;
    while (doc.length < 10_000) doc += `\n\n${SAMPLE}`;

    renderMarkdown(doc); // 예열
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      renderMarkdown(doc);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[2];

    expect(doc.length).toBeGreaterThanOrEqual(10_000);
    expect(median).toBeLessThanOrEqual(50);
  });
});
