"use client";

import { type Ref, useId } from "react";
import { strings } from "@/content/strings";
import type { Folder } from "@/lib/workspace/repository";
import type { DocumentForm } from "@/lib/workspace/save-plan";

export type BarError = { field: "folder" | "title"; message: string } | null;

type Props = {
  folders: Folder[];
  form: DocumentForm;
  onChange: (form: DocumentForm) => void;
  error: BarError;
  folderRef: Ref<HTMLSelectElement>;
  titleRef: Ref<HTMLInputElement>;
};

const fieldClass =
  "h-7 rounded-md border bg-white px-2 text-[13px] text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]";

// 편집 영역 맨 위(툴바 위) — 저장할 폴더·제목 (specs/005-document-flow FR-002, contracts/ui.md 문서 바)
export function DocumentBar({ folders, form, onChange, error, folderRef, titleRef }: Props) {
  const errorId = useId();
  const folderInvalid = error?.field === "folder";
  const titleInvalid = error?.field === "title";
  return (
    <section aria-label={strings.documentInfoLabel} className="flex-none border-b border-[var(--border)] px-3.5">
      <div className="flex h-10 items-center gap-4 text-[12.5px] text-[var(--fg-muted)]">
        <label className="flex items-center gap-2">
          {strings.folderLabel}
          <select
            ref={folderRef}
            value={form.folderId ?? ""}
            onChange={(e) => onChange({ ...form, folderId: e.target.value || null })}
            aria-invalid={folderInvalid}
            aria-describedby={folderInvalid ? errorId : undefined}
            className={`${fieldClass} ${folderInvalid ? "border-[#b42318]" : "border-[var(--input-border)]"}`}
          >
            <option value="">{strings.selectFolder}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        {folders.length === 0 && <span>{strings.noFolders}</span>}
        <label className="flex min-w-0 flex-1 items-center gap-2">
          {strings.titleLabel}
          <input
            ref={titleRef}
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            aria-invalid={titleInvalid}
            aria-describedby={titleInvalid ? errorId : undefined}
            className={`${fieldClass} min-w-0 flex-1 ${titleInvalid ? "border-[#b42318]" : "border-[var(--input-border)]"}`}
          />
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="m-0 pb-1.5 text-xs text-[#b42318]">
          {error.message}
        </p>
      )}
    </section>
  );
}
