import type { Ref } from "react";
import { strings } from "@/content/strings";
import { formatRoute } from "@/lib/route/route";
import { formatDateTime } from "@/lib/text/date";
import type { Doc, Folder } from "@/lib/workspace/repository";

// 모든 문서 — 최근 수정순 (specs/005-document-flow FR-007–FR-009, contracts/ui.md 대시보드).
// 행 제목은 네이티브 링크라 Enter·가운데 클릭(새 탭)이 브라우저 기본 동작으로 된다.
// ponytail: 가상 스크롤 없음 — 1,000행에서 1초(SC-003)를 넘으면 도입한다.
// headingRef: 앱 안 이동·건너뛰기 버튼이 포커스를 옮기는 시작점 (M7 FR-005, FR-007)
export function Dashboard({ docs, folders, headingRef }: { docs: Doc[]; folders: Folder[]; headingRef?: Ref<HTMLHeadingElement> }) {
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  const rows = [...docs].sort((a, b) => b.updatedAt - a.updatedAt);
  const linkClass =
    "text-[var(--fg)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
      {/* tabIndex=-1: 스크립트로만 포커스를 받는 비상호작용 제목이라 outline-none 허용 (M7 FR-008 예외) */}
      <h1 ref={headingRef} tabIndex={-1} className="m-0 mb-4 text-lg font-bold text-[var(--fg)] outline-none">{strings.allDocuments}</h1>
      {rows.length === 0 ? (
        <div className="flex items-center gap-3 text-sm text-[var(--fg-muted)]">
          <span>{strings.noDocuments}</span>
          <a
            href={formatRoute({ view: "new" })}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--fg)] hover:bg-[#f1f3f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {strings.newDocument}
          </a>
        </div>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[12px] text-[var(--fg-muted)]">
              <th className="py-2 pr-4 font-semibold">{strings.colTitle}</th>
              <th className="py-2 pr-4 font-semibold">{strings.colFolder}</th>
              <th className="py-2 font-semibold">{strings.colUpdated}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="h-9 border-b border-[var(--border-soft)]">
                <td className="py-1.5 pr-4">
                  <a href={formatRoute({ view: "doc", id: d.id })} className={linkClass}>
                    {d.title}
                  </a>
                </td>
                <td className="py-1.5 pr-4 text-[var(--fg-muted)]">{folderName.get(d.folderId) ?? ""}</td>
                <td className="py-1.5 tabular-nums text-[var(--fg-muted)]">{formatDateTime(d.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
