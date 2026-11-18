// CM6 키 표기(`Mod-Shift-x`) → 툴팁 표기 (specs/003-full-toolbar FR-019, research R7).
const MAC: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥" };
const OTHER: Record<string, string> = { Mod: "Ctrl", Shift: "Shift", Alt: "Alt" };

export function formatShortcut(shortcut: string, isMac: boolean): string {
  const parts = shortcut.split("-");
  const key = parts.pop()?.toUpperCase() ?? "";
  const names = isMac ? MAC : OTHER;
  const mods = parts.map((m) => names[m] ?? m);
  return isMac ? mods.join("") + key : [...mods, key].join("+");
}
