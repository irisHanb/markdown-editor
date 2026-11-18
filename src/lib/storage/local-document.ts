// 문서 1개 로컬 저장 (헌장 원칙 V의 M1 예외, contracts/storage.md).
// 값은 본문 문자열 그대로(JSON 아님) — 디자인 시안과 같은 키·형식.
export const STORAGE_KEY = "mdeditor:v1";

export type LoadResult = { ok: true; content: string | null } | { ok: false };
export type SaveResult = { ok: true } | { ok: false };

/** 예외를 던지지 않는다. 키가 없으면 content null, 읽기 실패면 ok false. */
export function loadDocument(storage: Storage): LoadResult {
  try {
    return { ok: true, content: storage.getItem(STORAGE_KEY) };
  } catch {
    return { ok: false };
  }
}

/** 예외를 던지지 않는다. QuotaExceededError·SecurityError 등은 ok false. */
export function saveDocument(storage: Storage, content: string): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, content);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
