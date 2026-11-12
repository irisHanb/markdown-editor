import type { Ref } from "react";
import { strings } from "@/content/strings";

// M2-a: 자리만 둔다. 폴더 트리·[+] 버튼은 M3.
// 실제 너비는 저장값(--sidebar-w)을 쓰되, 좁은 창에서는 편집 영역 최소 480px을 먼저 보장한다.
export function Sidebar({ ref }: { ref?: Ref<HTMLElement> }) {
  return (
    <aside
      ref={ref}
      aria-label={strings.sidebarLabel}
      className="flex-none overflow-y-auto bg-[var(--editor-bg)]"
      style={{ width: "max(180px, min(var(--sidebar-w), calc(100vw - 480px)))" }}
    >
      <p className="m-0 px-4 pt-4 text-[12.5px] text-[var(--fg-muted)]">{strings.sidebarEmpty}</p>
    </aside>
  );
}
