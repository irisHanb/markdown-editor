/**
 * 문서 1개를 브라우저 다운로드로 내려받는다 (specs/008-md-file-export FR-008·FR-009).
 * 모든 브라우저에서 동작하며 폴더 연결·권한이 필요 없다. doc는 테스트에서 가짜를 넘긴다.
 */
export function downloadMarkdown(fileName: string, content: string, doc: Document = document): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const a = doc.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
