import { strings } from "@/content/strings";

// html은 renderMarkdown(정제 완료) 출력만 받는다 (헌장 원칙 II).
// aria-live는 넣지 않는다 — 입력마다 낭독되는 것을 막는다 (contracts/ui.md).
export function Preview({ html }: { html: string }) {
  return (
    <div
      className="md-preview min-h-0 flex-1 overflow-y-auto px-10 pt-[30px] pb-[60px]"
      role="region"
      aria-label={strings.previewLabel}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
