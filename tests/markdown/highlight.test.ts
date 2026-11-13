// 코드 블록 문법 강조 (specs/007-usability-fixes FR-010, 헌장 1.1.0 원칙 II)
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/pipeline";

describe("코드 블록 하이라이트", () => {
  it("언어를 적은 블록은 그 언어로 강조", () => {
    const html = renderMarkdown("```js\nconst a = 1;\n```");
    expect(html).toContain('<code class="hljs language-js">');
    expect(html).toContain('<span class="hljs-keyword">const</span>');
  });

  it("언어를 적지 않은 블록은 자동 판별해 강조", () => {
    const html = renderMarkdown("```\nfunction add(a, b) {\n  return a + b;\n}\n```");
    expect(html).toContain("hljs");
    expect(html).toContain('<span class="hljs-keyword">');
  });

  it("인라인 코드는 강조하지 않음", () => {
    expect(renderMarkdown("`const a = 1`")).toBe("<p><code>const a = 1</code></p>");
  });
});

describe("하이라이트 허용 목록 XSS 회귀 (헌장 원칙 II)", () => {
  it("hljs 클래스 span의 이벤트 속성 제거, 클래스 유지", () => {
    const html = renderMarkdown('<span class="hljs-string" onclick="alert(1)">a</span>');
    expect(html).not.toContain("onclick");
    expect(html).toContain('class="hljs-string"');
  });

  it("hljs가 아닌 span 클래스 제거", () => {
    expect(renderMarkdown('<span class="evil">a</span>')).not.toContain("evil");
  });

  it("code의 style 제거", () => {
    const html = renderMarkdown('<pre><code class="hljs language-js" style="color:red">x</code></pre>');
    expect(html).not.toContain("style");
  });

  it("코드 안 원시 HTML 이벤트 속성 없음", () => {
    const html = renderMarkdown('<pre><code class="language-js"><img src=x onerror=alert(1)></code></pre>');
    expect(html).not.toContain("onerror");
  });
});

describe("성능", () => {
  it("코드 블록 위주 1만 자 렌더 중앙값 50ms 이하", () => {
    const block = "```\nfunction add(a, b) {\n  const sum = a + b;\n  return sum; // 합\n}\n```\n\n문단 텍스트\n\n";
    let doc = "";
    while (doc.length < 10_000) doc += block;
    renderMarkdown(doc);
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      renderMarkdown(doc);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThanOrEqual(50);
  });
});
