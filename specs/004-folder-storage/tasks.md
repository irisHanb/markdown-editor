---

description: "M3 폴더·문서 저장소와 사이드바 트리 작업 목록"
---

# Tasks: 폴더·문서 저장소와 사이드바 트리 (M3)

**Input**: Design documents from `/specs/004-folder-storage/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함합니다(헌장 원칙 IV). 이름 규칙·저장소 계약·bootstrap은 테스트 먼저. 트리·확인 창·키보드는
quickstart 수동 검증입니다.

**Organization**: US1(P1 옮기기) → US2(P2 트리) → US4(P2 새 문서) → US3(P3 이름·삭제). US4는 US2의 [⋯]
메뉴 위에 올라가므로 US2 뒤입니다. 모든 스토리가 `useWorkspace.ts`·`Sidebar.tsx`·`EditorScreen.tsx`를
수정하므로 순차 진행합니다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 의존성 설치: `npm i -E idb@8.0.4`, `npm i -D -E fake-indexeddb@6.2.8` (`package.json`, research R1·R6)
- [X] T002 [P] `TDD-IMPLEMENTS.md` 표에 4행 추가(TODO): `M3-names`(`tests/lib/workspace/names.test.ts`), `M3-repo`(`tests/lib/workspace/repository.test.ts`), `M3-bootstrap`(`tests/lib/workspace/bootstrap.test.ts`), `M3-switch`(`tests/lib/workspace/switch.test.ts`)
- [X] T003 [P] `src/content/strings.ts`에 contracts/ui.md "문구" 목록의 키 전부 추가(`foldersHeader` … `nameDuplicate`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 저장소 계층과 이름 규칙 — 모든 스토리가 사용

### Tests (RED)

- [X] T004 [P] `tests/lib/workspace/names.test.ts` (contracts/repository.md 테스트 표 1행): `validateName` — `"  회의 "` → `{ok, name:"회의"}`, `""`·`"   "` → `empty`, 51자 → `tooLong`, `"a/b"`·`"a\\b"` → `slash`, `"회의"` vs siblings `["회의"]` → `duplicate`, `" 회의 "` vs `["회의"]` → `duplicate`(공백 제거 후 비교), `"Notes"` vs `["notes"]` → `duplicate`(대소문자 무시), 이름 바꾸기 시 `self`와 같으면 통과. `nextUntitled` — `[]` → `"제목 없는 문서"`, `["제목 없는 문서"]` → `"제목 없는 문서 2"`, `["제목 없는 문서","제목 없는 문서 3"]` → `"제목 없는 문서 2"`. `byName` — `["하","가","나"]` → `["가","나","하"]`. `pickNextDocument` 3분기: 같은 폴더 다른 문서(이름순 첫째) → 다른 폴더(폴더 이름순) 첫 문서 → `null`
- [X] T005 [P] `tests/lib/workspace/repository.test.ts`: `import "fake-indexeddb/auto"`. 같은 계약 테스트를 `describe.each([["idb", () => createIdbRepository()], ["memory", async () => createMemoryRepository()]])`로 두 구현에 실행 — `createFolder` 후 `listFolders`에 `{name, parentId:null, collapsed:false}`; `createDocument(folderId, title)` 빈 본문; 없는 폴더 id에 `createDocument` reject; `renameFolder`·`renameDocument`·`setCollapsed` 반영; `saveContent` 후 `updatedAt` 증가·본문 반영; `deleteDocument`; `deleteFolder`가 문서 2개 든 폴더에서 `2` 반환하고 그 문서들도 사라짐, 다른 폴더 문서는 유지; `getMeta`/`setMeta` 왕복; `seed("내 문서", t, c)`가 같은 이름 폴더가 있으면 재사용하고 `legacyImported` true 설정. idb 테스트는 `beforeEach`에서 `indexedDB.deleteDatabase("mdeditor")`
- [X] T006 `npm test` 실패 확인 → `M3-names`·`M3-repo` RED 기록

### Implementation

- [X] T007 `src/lib/workspace/repository.ts`: `Folder`, `Doc`, `Meta`, `Repository` 타입 (contracts/repository.md 그대로). 필드 규칙 주석: 이름 "1–50자, `/`·`\` 금지", `parentId` "이번 단계는 항상 null"
- [X] T008 [P] `src/lib/workspace/names.ts`: `validateName`(trim → 빈 문자열 `empty` → `countChars`(`src/lib/text/count.ts`, 눈에 보이는 글자) 50 초과 `tooLong` → `/[\\/]/` `slash` → `siblings`에서 `self` 제외 후 `toLocaleLowerCase("ko")` 비교 `duplicate`), `nextUntitled`, `byName`(`localeCompare(b, "ko")`), `pickNextDocument` (T004 통과)
- [X] T009 [P] `src/lib/workspace/memory-repository.ts`: `Map` 2개 + meta 객체, id는 `crypto.randomUUID()`, 시각은 `Date.now()`
- [X] T010 `src/lib/workspace/idb-repository.ts`: `openDB("mdeditor", 1, { upgrade })`로 `folders`(keyPath `id`), `documents`(keyPath `id`, 인덱스 `byFolder` on `folderId`), `meta`(out-of-line key) 생성. `deleteFolder`·`seed`는 `db.transaction(["folders","documents","meta"], "readwrite")` 1개로 처리. `createDocument`는 같은 트랜잭션 안에서 폴더 존재 확인 후 없으면 throw. `listDocuments` 위에 `ponytail:` 주석(본문까지 읽음, 1,000개에서 1초 넘으면 본문 스토어 분리) (T005 통과)
- [X] T011 `npm test` GREEN 확인 → `M3-names`·`M3-repo` GREEN

**Checkpoint**: 저장소 두 구현이 같은 계약 테스트 통과

---

## Phase 3: User Story 1 - 기존 문서가 폴더 안으로 옮겨져 계속 열림 (Priority: P1) 🎯 MVP

**Goal**: localStorage 문서 1회 옮기기, 첫 방문 샘플, 열린 문서 저장·복원

**Independent Test**: quickstart 2절 1·2번

### Tests (RED)

- [X] T012 [US1] `tests/lib/workspace/bootstrap.test.ts` (메모리 저장소 + `Map` 기반 가짜 `Storage`): 저장본 `"# 이전"` 있음 → 폴더 "내 문서"·문서 "제목 없는 문서" 본문 `"# 이전"`, `legacy.getItem("mdeditor:v1")` null, 반환값 = 그 문서 id; `bootstrap` 2회 실행해도 문서 1개; `repo.seed`를 reject하도록 바꾼 저장소 → `bootstrap` reject, 저장본 그대로 남음; 저장본 없음·폴더 0개 → "내 문서"/"시작하기"(본문 = sample); 이미 폴더가 있고 플래그만 없음 → 샘플 만들지 않음; `lastDocId`가 존재하는 문서면 그 id, 지워진 id면 이름순 첫 폴더의 이름순 첫 문서, 문서 0개면 null; `legacy`가 null(저장소 접근 불가)이어도 동작; `{ removeLegacy: false }`(메모리 모드)면 문서는 옮겨 보이되 `legacy.getItem("mdeditor:v1")`이 그대로 남음(analyze U1). 다른 경우는 모두 `{ removeLegacy: true }`로 호출
- [X] T013 [US1] `npm test` 실패 확인 → `M3-bootstrap` RED

### Implementation

- [X] T014 [US1] `src/lib/workspace/bootstrap.ts`: contracts/repository.md 상수·시그니처, research R3 순서. `removeItem`은 `opts.removeLegacy`가 true이고 `seed` 성공 후에만, 예외는 무시
- [X] T015 [US1] `src/lib/document/session.ts`에서 `resolveInitial` 삭제, `tests/lib/session.test.ts`의 `resolveInitial` describe 삭제(`applySave`·`revert` 테스트 유지). `npm test` GREEN → `M3-bootstrap` GREEN
- [X] T016 [US1] `src/components/workspace/useWorkspace.ts`(`"use client"`): 마운트 시 `createIdbRepository()` 실패하면 `createMemoryRepository()` + `storageUnavailable=true`; `bootstrap(repo, getStorage(), SAMPLE, { removeLegacy: !storageUnavailable })`(메모리 모드에서 저장본 삭제 금지, analyze U1); `folders`·`docs` state(`byName` 정렬); `current: Doc | null`(열린 문서, `getDocument`); `openDocument(id)`(로드 + `setMeta("lastDocId", id)`); `save(content)` → `saveContent` → 성공/실패 결과 반환하고 `current`·`docs` 갱신. 저장 실패는 `{ ok: false }`로 돌려 기존 `applySave` 흐름 재사용
- [X] T017 [US1] `src/components/editor/EditorScreen.tsx`: `loadDocument`·`resolveInitial`·`saveDocument` 사용 제거 → `useWorkspace` 연결. `MarkdownEditor key={current.id} initialDoc={current.content}`, baseline = `current.content`, [저장]은 `workspace.save(view 본문)` 결과로 `applySave`, [취소]는 기존 `revert(baseline)`. `current`가 null이면 에디터·프리뷰 자리에 `strings.emptyEditor` 1줄, 툴바·[저장]·[취소] `disabled`(Toolbar·StatusBar에 `disabled` prop 추가). `storageUnavailable`이면 상단 바 아래 안내 1줄(contracts/ui.md). StatusBar 왼쪽 맨 앞에 `폴더 / 문서` 경로(FR-012)
- [X] T018 [US1] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

**Checkpoint**: 기존 문서가 "내 문서"로 옮겨져 열리고 저장·새로고침 유지 (사이드바는 아직 안내 문구)

---

## Phase 4: User Story 2 - 폴더 만들기와 트리 탐색 (Priority: P2)

**Goal**: [+] 폴더, 트리 표시·접기·열기, 저장하지 않은 변경 확인, 키보드

**Independent Test**: quickstart 2절 3·5·6·9번

### Tests (RED) — 문서 전환 결정 (analyze C1)

- [X] T019 [US2] `tests/lib/workspace/switch.test.ts`: `planSwitch(false, null)` → `["open"]`, `planSwitch(true, "save")` → `["save","open"]`, `planSwitch(true, "discard")` → `["open"]`, `planSwitch(true, "cancel")`·`planSwitch(true, null)` → `[]`. `runSwitch` — 호출 순서를 배열에 기록하는 가짜 actions로 `["save","open"]` 순서 확인·true 반환, `save`가 `{ ok: false }`면 `open` 미호출·false 반환, `[]`면 아무것도 호출 안 함·false (SC-005)
- [X] T020 [US2] `npm test` 실패 확인 → `M3-switch` RED
- [X] T021 [US2] `src/lib/workspace/switch.ts`: contracts/repository.md "문서 전환 계획" 시그니처 그대로, React import 금지 (T019 통과) → `M3-switch` GREEN

### Implementation

- [X] T022 [P] [US2] `src/components/editor/ConfirmDialog.tsx`: contracts/ui.md ConfirmDialog — `<dialog>` + `showModal()`, `request.actions` 버튼 렌더(`primary` = accent, `danger` = `#b42318`, `default` = 테두리 버튼), 열릴 때 [취소](value `"cancel"`) 포커스, Esc·배경 클릭 = `onClose`. 그림자·애니메이션 없음
- [X] T023 [US2] `useWorkspace.ts` 확장: `createFolder(name)`(호출부 `validateName` 통과 후), `toggleFolder(id)`(`setCollapsed`), `requestOpen(id, isDirty: () => boolean, saveCurrent: () => Promise<{ ok: boolean }>)` — dirty면 `confirm` state에 "저장하지 않은 변경" 요청(contracts/ui.md 표 1행)을 넣고, 선택값으로 `runSwitch(planSwitch(dirty, 선택), { save: saveCurrent, open })` 실행. 저장 실패(false)면 전환하지 않고 저장 실패 알림. 훅 안에 분기 로직(`if dirty && choice === …`)을 두지 않습니다. `confirm` state와 `resolveConfirm(value)` 노출
- [X] T024 [US2] `src/components/layout/Sidebar.tsx` 확장: 헤더 행("폴더" + [+] `FolderPlus` `aria-label="새 폴더"`), `role="tree"` 트리(폴더 `treeitem` `aria-level=1` `aria-expanded`, 문서 `aria-level=2` `aria-selected`), 접기 아이콘 `ChevronRight`/`ChevronDown` 14px, 문서 `FileText` 14px, 열린 문서 배경 `#e8edfb`·글자 accent, hover 배경 `#f1f3f9`. [+]를 누르면 목록 끝에 이름 입력 행(기본 `strings.defaultFolderName` 전체 선택) — Enter: `validateName(값, 폴더 이름들)` 통과 시 `onCreateFolder`, 실패 시 입력 아래 오류 문구(`#b42318`, `aria-invalid`, `aria-describedby`); Esc·빈 이름 Enter: 취소. 폴더가 0개면 M2 안내 문구 유지
- [X] T025 [US2] `Sidebar.tsx` 키보드(contracts/ui.md 키 표): 보이는 항목 평탄 목록 + roving `tabIndex`(포커스 항목만 0), ↑↓·Home·End 이동, → 펼치기/첫 문서, ← 접기/소속 폴더, Enter 접기·열기. F2·Delete는 US3에서 연결
- [X] T026 [US2] `EditorScreen.tsx`: `Sidebar`에 `folders`·`docs`·`currentId`·콜백 전달, 문서 클릭 → `requestOpen(id, () => view 본문 !== baseline, () => workspace.save(view 본문))`, `<ConfirmDialog request={workspace.confirm} …/>` 렌더
- [X] T027 [US2] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

**Checkpoint**: 폴더 만들기·접기·문서 전환·저장 확인 동작

---

## Phase 5: User Story 4 - 폴더 안에 새 문서 만들기 (Priority: P2)

**Goal**: 폴더 [⋯] → [새 문서]

**Independent Test**: quickstart 2절 4번

- [X] T028 [US4] `Sidebar.tsx` [⋯] 메뉴: 행 오른쪽 `MoreHorizontal` 버튼(`aria-haspopup="menu"`, `aria-label="‘{이름}’ 메뉴"`, hover·포커스 행에서 보임), `role="menu"` 목록(1px border, radius 6px, 그림자 없음), ↑↓ 이동·Enter 실행·Esc 닫고 버튼으로 포커스. 폴더 메뉴 항목: 새 문서·이름 바꾸기·삭제, 문서 메뉴: 이름 바꾸기·삭제 (이름 바꾸기·삭제 동작은 US3)
- [X] T029 [US4] [새 문서]: 폴더를 펼치고 그 폴더 끝에 이름 입력 행(기본값 `nextUntitled(그 폴더 문서 제목들)`, 전체 선택). Enter → `validateName` 통과 시 `useWorkspace.createDocument(folderId, title)`(dirty면 `requestOpen`과 같은 `planSwitch`/`runSwitch` 경로를 먼저 거침) → 새 문서 열기. Esc 취소 (FR-016)
- [X] T030 [US4] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

---

## Phase 6: User Story 3 - 이름 바꾸기·삭제 (Priority: P3)

**Goal**: 폴더·문서 이름 바꾸기, 삭제(폴더는 문서 함께)

**Independent Test**: quickstart 2절 7·8번

- [X] T031 [US3] 이름 바꾸기: [⋯] → [이름 바꾸기] 또는 F2 → 행 자리 입력(현재 이름 전체 선택). Enter → `validateName(값, 형제 이름들, 현재 이름)` 통과 시 `renameFolder`/`renameDocument`, 실패 시 오류 문구. Esc·포커스 이탈 = 취소 (FR-013). 열린 문서 이름이 바뀌면 경로 표시 갱신
- [X] T032 [US3] 삭제: [⋯] → [삭제] 또는 Delete → `ConfirmDialog`(contracts/ui.md 표 2·3행; 폴더는 그 폴더 문서 수 N 포함, N=0이면 "되돌릴 수 없습니다"만). [삭제] → `deleteDocument`/`deleteFolder`. 열린 문서가 지워졌으면 `pickNextDocument` 결과 열기(null이면 빈 화면), `lastDocId` 갱신. 트리 포커스는 삭제 항목의 다음(없으면 이전) 항목으로 (FR-014, FR-015)
- [X] T033 [US3] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

---

## Phase 7: Polish

- [X] T034 품질 게이트 결과를 `TDD-IMPLEMENTS.md`에 기록
- [X] T035 `.claude/rules/anti-ai-slop.md` 점검(gradient·transform·animate·shadow·blur 0건, radius ≤ 8px)
- [ ] T036 quickstart 2절 수동 검증 12항목 — 브라우저 자동화가 없으면 미실행으로 `specs/004-folder-storage/quickstart.md` "검증 기록"에 기록
- [X] T037 `CLAUDE.md` 마일스톤 표 M3 상태 갱신(헌장 원칙 V의 "M1 localStorage 예외" 종료 반영)

---

## Dependencies & Execution Order

- Setup → Foundational(T004·T005 병렬 → T006 → T007 → T008·T009 병렬 → T010 → T011) → US1 → US2(switch 테스트 → 구현 → 화면) → US4 → US3 → Polish
- US2·US4·US3는 같은 파일(`Sidebar.tsx`·`useWorkspace.ts`)을 고치므로 순차. T022(ConfirmDialog)는 새 파일이라 US1 진행 중 병렬 작성 가능

## Parallel Example

```bash
Task: "T004 tests/lib/workspace/names.test.ts"
Task: "T005 tests/lib/workspace/repository.test.ts"
# RED 후
Task: "T008 src/lib/workspace/names.ts"
Task: "T009 src/lib/workspace/memory-repository.ts"
```

## Implementation Strategy

1. Setup + Foundational → 저장소 계약 GREEN
2. US1 → 옮기기·저장 (MVP: 기존 사용자 데이터 보존)
3. US2 → 트리·전환 확인
4. US4 → 새 문서 (실사용 가능)
5. US3 → 정리 기능
6. Polish

## Notes

- 헌장 원칙 I: 툴바·플러그인은 `disabled` prop 외 변경 없음.
- 커밋 메시지는 한국어 합쇼체.
