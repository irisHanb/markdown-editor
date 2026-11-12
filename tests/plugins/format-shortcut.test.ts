import { describe, expect, it } from "vitest";
import { plugins } from "@/plugins";
import { formatShortcut } from "@/plugins/shortcut";

describe("formatShortcut (FR-019)", () => {
  it.each([
    ["Mod-b", true, "⌘B"],
    ["Mod-b", false, "Ctrl+B"],
    ["Mod-Shift-x", true, "⌘⇧X"],
    ["Mod-Shift-x", false, "Ctrl+Shift+X"],
    ["Mod-Alt-1", true, "⌘⌥1"],
    ["Mod-Alt-1", false, "Ctrl+Alt+1"],
  ] as const)("%s (mac=%s) → %s", (key, mac, expected) => {
    expect(formatShortcut(key, mac)).toBe(expected);
  });
});

describe("단축키 배정 (FR-020)", () => {
  it("11개, 표와 일치, 중복 없음", () => {
    const map = Object.fromEntries(plugins.filter((p) => p.shortcut).map((p) => [p.id, p.shortcut]));
    expect(map).toEqual({
      "heading-1": "Mod-Alt-1",
      "heading-2": "Mod-Alt-2",
      "heading-3": "Mod-Alt-3",
      bold: "Mod-b",
      italic: "Mod-i",
      strikethrough: "Mod-Shift-x",
      "inline-code": "Mod-e",
      link: "Mod-k",
      "bullet-list": "Mod-Shift-8",
      "ordered-list": "Mod-Shift-7",
      "task-list": "Mod-Shift-9",
    });
    const keys = Object.values(map);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("브라우저 예약 키(Mod-1–9, Mod-t·w·n)를 쓰지 않는다", () => {
    for (const p of plugins) expect(p.shortcut ?? "").not.toMatch(/^Mod-([1-9]|t|w|n)$/);
  });
});
