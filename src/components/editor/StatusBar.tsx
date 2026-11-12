import { Save } from "lucide-react";
import { strings } from "@/content/strings";
import { formatCount } from "@/lib/text/count";

type Props = {
  charCount: number;
  lineCount: number;
  onCancel: () => void;
  onSave: () => void;
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function StatusBar({ charCount, lineCount, onCancel, onSave }: Props) {
  return (
    <footer className="flex flex-none items-center justify-between border-t border-[var(--border)] bg-white px-5 py-[13px]">
      <div className="flex items-center gap-4 text-[12.5px] text-[var(--fg-muted)]">
        <span>{formatCount(charCount)}자</span>
        <span className="h-[13px] w-px bg-[#e3e8f0]" aria-hidden="true" />
        <span>{formatCount(lineCount)}줄</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className={`h-[38px] cursor-pointer rounded-lg border border-[#dfe4ec] bg-white px-5 text-sm font-semibold text-[#5a6577] hover:border-[#cdd5e0] hover:bg-[#f6f8fb] ${focusRing}`}
        >
          {strings.cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`inline-flex h-[38px] cursor-pointer items-center gap-[7px] rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-white hover:bg-[var(--accent-hover)] ${focusRing}`}
        >
          <Save size={16} strokeWidth={2.1} aria-hidden="true" />
          {strings.save}
        </button>
      </div>
    </footer>
  );
}
