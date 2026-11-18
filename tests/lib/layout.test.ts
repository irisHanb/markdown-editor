import { describe, expect, it } from "vitest";
import { clamp, EDITOR, LAYOUT_KEY, loadLayout, SIDEBAR, saveLayout, stepByKey } from "@/lib/layout/layout";

function storageWith(value: string | null, throwOn?: "get" | "set"): Storage {
  const map = new Map<string, string>(value === null ? [] : [[LAYOUT_KEY, value]]);
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    getItem: (k: string) => {
      if (throwOn === "get") throw new DOMException("blocked", "SecurityError");
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (throwOn === "set") throw new DOMException("x", "QuotaExceededError");
      map.set(k, v);
    },
  };
}

describe("clamp (data-model.md 범위)", () => {
  it("범위 안 값은 그대로", () => expect(clamp(300, SIDEBAR)).toBe(300));
  it("최소 미만은 최소", () => expect(clamp(179, SIDEBAR)).toBe(180));
  it("최대 초과는 최대", () => expect(clamp(481, SIDEBAR)).toBe(480));
  it("소수는 반올림", () => expect(clamp(255.7, SIDEBAR)).toBe(256));
  it.each(["260", null, Number.NaN, undefined])("숫자가 아니면 initial: %s", (v) => {
    expect(clamp(v, SIDEBAR)).toBe(260);
  });
});

describe("stepByKey (contracts/layout.md 표)", () => {
  it.each([
    [SIDEBAR, 260, "ArrowRight", 270],
    [SIDEBAR, 260, "ArrowLeft", 250],
    [SIDEBAR, 260, "Home", 180],
    [SIDEBAR, 260, "End", 480],
    [SIDEBAR, 480, "ArrowRight", 480],
    [EDITOR, 50, "ArrowRight", 55],
    [EDITOR, 50, "ArrowLeft", 45],
    [EDITOR, 50, "Home", 30],
    [EDITOR, 50, "End", 70],
    [EDITOR, 30, "ArrowLeft", 30],
  ])("%o %d + %s → %d", (bounds, value, key, expected) => {
    expect(stepByKey(value, key, bounds)).toBe(expected);
  });

  it("처리하지 않는 키는 null", () => {
    expect(stepByKey(260, "a", SIDEBAR)).toBeNull();
    expect(stepByKey(50, "ArrowUp", EDITOR)).toBeNull();
  });
});

describe("loadLayout (data-model.md 복원 규칙)", () => {
  it("키가 없으면 기본값", () => {
    expect(loadLayout(storageWith(null))).toEqual({ sidebar: 260, editor: 50 });
  });
  it("JSON 파싱 실패면 기본값", () => {
    expect(loadLayout(storageWith("{bad"))).toEqual({ sidebar: 260, editor: 50 });
  });
  it("숫자가 아닌 필드만 기본값", () => {
    expect(loadLayout(storageWith('{"sidebar":"x","editor":40}'))).toEqual({ sidebar: 260, editor: 40 });
  });
  it("범위 밖은 한계값", () => {
    expect(loadLayout(storageWith('{"sidebar":600,"editor":10}'))).toEqual({ sidebar: 480, editor: 30 });
  });
  it("소수는 반올림", () => {
    expect(loadLayout(storageWith('{"sidebar":255.7,"editor":50}'))).toEqual({ sidebar: 256, editor: 50 });
  });
  it("저장소 예외·null storage는 기본값", () => {
    expect(loadLayout(storageWith(null, "get"))).toEqual({ sidebar: 260, editor: 50 });
    expect(loadLayout(null)).toEqual({ sidebar: 260, editor: 50 });
  });
});

describe("saveLayout", () => {
  it("mdeditor:layout:v1 키에 JSON 저장", () => {
    const storage = storageWith(null);
    expect(LAYOUT_KEY).toBe("mdeditor:layout:v1");
    saveLayout(storage, { sidebar: 300, editor: 60 });
    expect(JSON.parse(storage.getItem(LAYOUT_KEY) ?? "")).toEqual({ sidebar: 300, editor: 60 });
  });
  it("setItem 예외·null storage에서 던지지 않음", () => {
    expect(() => saveLayout(storageWith(null, "set"), { sidebar: 300, editor: 60 })).not.toThrow();
    expect(() => saveLayout(null, { sidebar: 300, editor: 60 })).not.toThrow();
  });
});
