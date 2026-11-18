"use client";

import { useEffect, useId, useRef } from "react";
import type { ConfirmRequest } from "@/components/workspace/useWorkspace";

type Props = {
  request: ConfirmRequest | null;
  onChoose: (value: string) => void;
};

const kindClass = {
  primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
  danger: "bg-[#b42318] text-white hover:bg-[#912018]",
  default: "border border-[#dfe4ec] bg-white text-[#5a6577] hover:bg-[#f6f8fb]",
} as const;

// 네이티브 <dialog> + showModal(): 뒤 화면 비활성·포커스 가두기·Esc를 브라우저가 처리 (research R8).
// 첫 포커스는 [취소] — 실수로 Enter를 눌러 삭제하지 않게 한다.
export function ConfirmDialog({ request, onChoose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('button[data-value="cancel"]')?.focus();
    } else if (!request && dialog.open) {
      dialog.close();
    }
  }, [request]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(e) => {
        e.preventDefault();
        onChoose("cancel");
      }}
      onClick={(e) => e.target === e.currentTarget && onChoose("cancel")}
      className="m-auto w-[400px] rounded-lg border border-[var(--border)] bg-white p-0 text-[var(--fg)]"
    >
      {request && (
        <div className="flex flex-col gap-3 p-5">
          <h2 id={titleId} className="m-0 text-[15px] font-bold">
            {request.title}
          </h2>
          <p id={messageId} className="m-0 text-sm text-[var(--fg-muted)]">
            {request.message}
          </p>
          <div className="mt-1 flex justify-end gap-2">
            {request.actions.map((a) => (
              <button
                key={a.value}
                type="button"
                data-value={a.value}
                onClick={() => onChoose(a.value)}
                className={`h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${kindClass[a.kind]}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}
