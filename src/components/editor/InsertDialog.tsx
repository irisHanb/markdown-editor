"use client";

import { useEffect, useId, useRef, useState } from "react";
import { strings } from "@/content/strings";
import type { DialogInit, DialogValues, MarkdownPlugin } from "@/plugins/types";

export type DialogRequest = { plugin: MarkdownPlugin; init: DialogInit };

type Props = {
  request: DialogRequest | null;
  onSubmit: (values: DialogValues) => void;
  onClose: () => void;
};

// 네이티브 <dialog> + showModal(): 뒤 화면 비활성(inert)·포커스 가두기·Esc 닫기를 브라우저가 처리한다
// (specs/003-full-toolbar research R6, FR-011·FR-015·FR-016).
export function InsertDialog({ request, onSubmit, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [first, setFirst] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request) {
      setFirst(request.init.first);
      setUrl(request.init.url);
      if (!dialog.open) dialog.showModal();
      urlRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [request]);

  const isImage = request?.plugin.id === "image";
  const isEdit = request?.init.mode === "edit";
  const title = isImage
    ? isEdit ? strings.dialogImageEdit : strings.dialogImageInsert
    : isEdit ? strings.dialogLinkEdit : strings.dialogLinkInsert;
  const canSubmit = url.trim() !== ""; // FR-012

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault(); // 닫기는 상태로만 제어한다
        onClose();
      }}
      // 배경(::backdrop) 클릭 — 대상이 dialog 자신일 때만
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[360px] rounded-lg border border-[var(--border)] bg-white p-0 text-[var(--fg)]"
    >
      {request && (
        <form
          className="flex flex-col gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit({ first, url });
          }}
        >
          <h2 id={titleId} className="m-0 text-[15px] font-bold">
            {title}
          </h2>
          <label className="flex flex-col gap-1 text-[12.5px] text-[var(--fg-muted)]">
            {request.plugin.dialog?.firstLabel}
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="h-9 rounded-md border border-[var(--input-border)] px-2.5 text-sm text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] text-[var(--fg-muted)]">
            {strings.dialogUrl}
            <input
              ref={urlRef}
              value={url}
              inputMode="url"
              onChange={(e) => setUrl(e.target.value)}
              className="h-9 rounded-md border border-[var(--input-border)] px-2.5 font-[family-name:var(--font-mono)] text-[13px] text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 cursor-pointer rounded-lg border border-[#dfe4ec] bg-white px-4 text-sm font-semibold text-[#5a6577] hover:bg-[#f6f8fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {strings.cancel}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-9 cursor-pointer rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[#aab6e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {isEdit ? strings.dialogUpdate : strings.dialogInsert}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
