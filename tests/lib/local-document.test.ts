import { describe, expect, it } from "vitest";
import { loadDocument, saveDocument, STORAGE_KEY } from "@/lib/storage/local-document";

// Map 기반 가짜 Storage. throwOn으로 getItem/setItem 예외를 흉내 낸다.
function fakeStorage(init: Record<string, string> = {}, throwOn?: "get" | "set"): Storage {
  const map = new Map(Object.entries(init));
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

describe("loadDocument (contracts/storage.md)", () => {
  it("키가 없으면 content null", () => {
    expect(loadDocument(fakeStorage())).toEqual({ ok: true, content: null });
  });

  it("빈 문자열도 유효한 저장본", () => {
    expect(loadDocument(fakeStorage({ [STORAGE_KEY]: "" }))).toEqual({ ok: true, content: "" });
  });

  it("getItem 예외는 { ok: false }로 바꾸고 던지지 않는다", () => {
    expect(() => loadDocument(fakeStorage({}, "get"))).not.toThrow();
    expect(loadDocument(fakeStorage({}, "get"))).toEqual({ ok: false });
  });
});

describe("saveDocument (contracts/storage.md)", () => {
  it("성공하면 mdeditor:v1 키에 본문 문자열을 그대로 저장", () => {
    const storage = fakeStorage();
    expect(STORAGE_KEY).toBe("mdeditor:v1");
    expect(saveDocument(storage, "# 본문")).toEqual({ ok: true });
    expect(storage.getItem("mdeditor:v1")).toBe("# 본문");
  });

  it("setItem 예외는 { ok: false }, 기존 값 유지, 던지지 않음", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: "이전" }, "set");
    expect(() => saveDocument(storage, "새 값")).not.toThrow();
    expect(saveDocument(storage, "새 값")).toEqual({ ok: false });
    expect(storage.getItem(STORAGE_KEY)).toBe("이전");
  });
});
