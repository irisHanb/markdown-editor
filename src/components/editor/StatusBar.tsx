import { Save } from "lucide-react";
import { strings } from "@/content/strings";
import { formatCount } from "@/lib/text/count";

type Props = {
  /** "폴더 / 문서" (specs/004-folder-storage FR-012). 열린 문서가 없으면 null */
  path?: string | null;
  disabled?: boolean;
  charCount: number;
  lineCount: number;
  onCancel: () => void;
  onSave: () => void;
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function StatusBar({ path, disabled = false, charCount, lineCount, onCancel, onSave }: Props) {
  return (
    <footer className="flex flex-none items-center justify-between border-t border-[var(--border)] bg-white px-5 py-[13px]">
      <div className="flex min-w-0 items-center gap-4 text-[12.5px] text-[var(--fg-muted)]">
        {path && (
          <>
            <span className="max-w-[260px] truncate" title={path}>
              {path}
            </span>
            <span className="h-[13px] w-px flex-none bg-[#e3e8f0]" aria-hidden="true" />
          </>
        )}
        <span>{formatCount(charCount)}자</span>
        <span className="h-[13px] w-px bg-[#e3e8f0]" aria-hidden="true" />
        <span>{formatCount(lineCount)}줄</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className={`h-[38px] cursor-pointer rounded-lg border border-[#dfe4ec] bg-white px-5 text-sm font-semibold text-[#5a6577] hover:border-[#cdd5e0] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          {strings.cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={`inline-flex h-[38px] cursor-pointer items-center gap-[7px] rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <Save size={16} strokeWidth={2.1} aria-hidden="true" />
          {strings.save}
        </button>
      </div>
    </footer>
  );
}
