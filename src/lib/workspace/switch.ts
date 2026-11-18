// "저장하지 않은 변경" 처리 순서 (specs/004-folder-storage research R4a, FR-010, SC-005).
// 화면 훅은 확인 창 선택값만 넘기고 분기는 여기서 한다.
export type SwitchChoice = "save" | "discard" | "cancel";
export type SwitchStep = "save" | "open";

/** dirty가 아니면 ["open"], dirty면 선택에 따라 ["save","open"] / ["open"] / [] */
export function planSwitch(dirty: boolean, choice: SwitchChoice | null): SwitchStep[] {
  if (!dirty) return ["open"];
  if (choice === "save") return ["save", "open"];
  if (choice === "discard") return ["open"];
  return [];
}

/** 순서대로 실행. 저장이 실패하면 멈추고 false — 다른 문서를 열지 않아 변경이 남는다. */
export async function runSwitch(
  steps: SwitchStep[],
  actions: { save: () => Promise<{ ok: boolean }>; open: () => Promise<void> },
): Promise<boolean> {
  if (steps.length === 0) return false;
  for (const step of steps) {
    if (step === "save") {
      if (!(await actions.save()).ok) return false;
    } else {
      await actions.open();
    }
  }
  return true;
}
