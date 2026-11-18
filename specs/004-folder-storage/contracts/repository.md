# Contract: 저장소 계층

`src/lib/workspace/repository.ts`(타입), `idb-repository.ts`, `memory-repository.ts`. 규칙은 data-model.md.

```typescript
export type Folder = { id: string; name: string; parentId: null; collapsed: boolean; createdAt: number };
export type Doc = { id: string; folderId: string; title: string; content: string; createdAt: number; updatedAt: number };

export interface Repository {
  listFolders(): Promise<Folder[]>;
  listDocuments(): Promise<Doc[]>;
  getDocument(id: string): Promise<Doc | undefined>;

  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<void>;
  setCollapsed(id: string, collapsed: boolean): Promise<void>;
  /** 폴더와 소속 문서를 트랜잭션 1개로 삭제. 삭제한 문서 수 반환 */
  deleteFolder(id: string): Promise<number>;

  createDocument(folderId: string, title: string, content?: string): Promise<Doc>;
  renameDocument(id: string, title: string): Promise<void>;
  saveContent(id: string, content: string): Promise<void>; // updatedAt 갱신
  deleteDocument(id: string): Promise<void>;

  getMeta<K extends keyof Meta>(key: K): Promise<Meta[K] | undefined>;
  setMeta<K extends keyof Meta>(key: K, value: Meta[K]): Promise<void>;

  /** 폴더(이름 기준 재사용) + 문서 + legacyImported 플래그를 트랜잭션 1개로 생성 */
  seed(folderName: string, title: string, content: string): Promise<Doc>;
}
export type Meta = { lastDocId: string | null; legacyImported: true };

export function createIdbRepository(): Promise<Repository>;   // 열기 실패 시 reject
export function createMemoryRepository(): Repository;
```

- 이름 검증은 저장소가 하지 않습니다(호출부가 `validateName`으로 먼저 검사). 저장소는 데이터 무결성
  (존재하지 않는 폴더에 문서 생성 시 reject)만 지킵니다.
- 모든 메서드는 실패 시 reject합니다. 화면은 실패를 알림으로 보여 줍니다.

## bootstrap — `src/lib/workspace/bootstrap.ts`

```typescript
export const LEGACY_KEY = "mdeditor:v1";
export const DEFAULT_FOLDER = "내 문서";
export const LEGACY_TITLE = "제목 없는 문서";
export const SAMPLE_TITLE = "시작하기";

/**
 * research R3. 반환: 열 문서 id (lastDocId → 없으면 트리 첫 문서 → 없으면 null).
 * removeLegacy=false(메모리 저장소 모드)면 저장본을 읽어 보여 주기만 하고 지우지 않는다 — 새로고침하면
 * 메모리가 비므로 지우면 기존 문서가 영구 손실된다 (analyze U1).
 */
export function bootstrap(
  repo: Repository,
  legacy: Storage | null,
  sample: string,
  opts: { removeLegacy: boolean },
): Promise<string | null>;
```

## 문서 전환 계획 — `src/lib/workspace/switch.ts` (analyze C1)

```typescript
export type SwitchChoice = "save" | "discard" | "cancel";
export type SwitchStep = "save" | "open";

/** dirty가 아니면 ["open"], dirty면 선택에 따라 ["save","open"] / ["open"] / [] */
export function planSwitch(dirty: boolean, choice: SwitchChoice | null): SwitchStep[];

/** 단계를 순서대로 실행. save가 { ok: false }면 멈추고 false 반환(열지 않음 — 변경 보존) */
export function runSwitch(
  steps: SwitchStep[],
  actions: { save: () => Promise<{ ok: boolean }>; open: () => Promise<void> },
): Promise<boolean>;
```

## 이름·선택 순수 함수 — `src/lib/workspace/names.ts`

```typescript
export type NameCheck = { ok: true; name: string } | { ok: false; reason: "empty" | "tooLong" | "slash" | "duplicate" };
/** 길이는 M1 countChars(눈에 보이는 글자)로 센다 */
export function validateName(input: string, siblings: string[], self?: string): NameCheck;
export function nextUntitled(siblings: string[]): string;
export function byName<T>(get: (x: T) => string): (a: T, b: T) => number; // localeCompare ko
export function pickNextDocument(docs: Doc[], folders: Folder[], removedId: string): string | null;
```

## 테스트

| 파일 | 대상 |
|------|------|
| `tests/lib/workspace/names.test.ts` | 검증 4종 사유, 공백 제거, 대소문자 무시 중복, 이름 바꾸기 시 자기 자신 제외, `nextUntitled`(빈 목록·" 2" 비어 있음 채우기), 정렬, `pickNextDocument` 3분기 |
| `tests/lib/workspace/repository.test.ts` | `createIdbRepository`(fake-indexeddb)·`createMemoryRepository`에 같은 계약 테스트: CRUD, `deleteFolder` 문서 함께 삭제·개수, `saveContent` updatedAt 증가, 없는 폴더에 문서 생성 reject |
| `tests/lib/workspace/bootstrap.test.ts` | 저장본 있음 → 옮기고 removeItem, 두 번 실행해도 문서 1개, `seed` 실패 시 저장본 유지, `removeLegacy:false`면 옮겨 보여 주되 저장본 유지, 첫 방문 → 샘플, `lastDocId` 우선·없으면 첫 문서 |
| `tests/lib/workspace/switch.test.ts` | `planSwitch` 4경우(깨끗함·저장·버림·취소), `runSwitch` 저장 실패 시 열지 않음·false, 정상 시 save→open 순서 |
