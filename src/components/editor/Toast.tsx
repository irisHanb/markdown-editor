import { AlertTriangle, Check } from "lucide-react";
import type { ToastKind } from "@/lib/document/session";

type Props = { message: string | null; kind: ToastKind };

// role=status 컨테이너는 항상 렌더해 보조기술이 내용 변경을 읽게 한다 (contracts/ui.md).
// 가운데 정렬은 transform 없이 flex로 한다. 그림자·애니메이션 없음 (research R10).
export function Toast({ message, kind }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[30px] flex justify-center"
    >
      {message && (
        <div className="flex items-center gap-[9px] rounded-lg bg-[var(--toast-bg)] px-5 py-[11px] text-[13.5px] font-semibold text-white">
          {kind === "success" ? (
            <Check size={17} strokeWidth={2.4} color="#5be3a3" aria-hidden="true" />
          ) : (
            <AlertTriangle size={17} strokeWidth={2.4} color="#ffb84d" aria-hidden="true" />
          )}
          {message}
        </div>
      )}
    </div>
  );
}
