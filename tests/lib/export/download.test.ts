// 문서 1개 다운로드 (specs/008-md-file-export FR-008·FR-009). Node의 Blob·URL과 가짜 document로 검사한다.
import { describe, expect, it } from "vitest";
import { downloadMarkdown } from "@/lib/export/download";

describe("downloadMarkdown", () => {
  it("blob URL을 단 앵커를 한 번 클릭하고 URL을 해제한다", async () => {
    const anchor = { href: "", download: "", clicks: 0, click() { this.clicks++; } };
    const fakeDoc = { createElement: (tag: string) => (tag === "a" ? anchor : null) } as unknown as Document;
    const revoked: string[] = [];
    const origRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (url: string) => {
      revoked.push(url);
      origRevoke(url);
    };
    let blobType = "";
    let blobText = "";
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = (blob: Blob) => {
      blobType = blob.type;
      void blob.text().then((t) => (blobText = t));
      return origCreate(blob);
    };
    try {
      downloadMarkdown("주간 회의.md", "# 본문", fakeDoc);
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
    expect(anchor.download).toBe("주간 회의.md");
    expect(anchor.href).toMatch(/^blob:/);
    expect(anchor.clicks).toBe(1);
    expect(blobType).toBe("text/markdown;charset=utf-8");
    expect(blobText).toBe("# 본문");
    expect(revoked).toEqual([anchor.href]);
  });
});
