import { describe, expect, it } from "vitest";
import { planSwitch, runSwitch } from "@/lib/workspace/switch";

describe("planSwitch (FR-010)", () => {
  it.each([
    [false, null, ["open"]],
    [true, "save", ["save", "open"]],
    [true, "discard", ["open"]],
    [true, "cancel", []],
    [true, null, []],
  ] as const)("dirty=%s choice=%s → %j", (dirty, choice, expected) => {
    expect(planSwitch(dirty, choice)).toEqual(expected);
  });
});

describe("runSwitch (SC-005)", () => {
  const actions = (saveOk: boolean) => {
    const calls: string[] = [];
    return {
      calls,
      save: async () => {
        calls.push("save");
        return { ok: saveOk };
      },
      open: async () => {
        calls.push("open");
      },
    };
  };

  it("save → open 순서로 실행하고 true", async () => {
    const a = actions(true);
    expect(await runSwitch(["save", "open"], a)).toBe(true);
    expect(a.calls).toEqual(["save", "open"]);
  });

  it("저장 실패면 열지 않고 false — 변경 보존", async () => {
    const a = actions(false);
    expect(await runSwitch(["save", "open"], a)).toBe(false);
    expect(a.calls).toEqual(["save"]);
  });

  it("빈 계획이면 아무것도 하지 않고 false", async () => {
    const a = actions(true);
    expect(await runSwitch([], a)).toBe(false);
    expect(a.calls).toEqual([]);
  });
});
