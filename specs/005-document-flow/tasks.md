---

description: "M6 문서 흐름 작업 목록"
---

# Tasks: 문서 흐름 — 폴더 선택 저장·대시보드·문서 주소 (M6)

**Input**: Design documents from `/specs/005-document-flow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함합니다(헌장 원칙 IV). 주소 해석·저장 결정·시각 표기·`updateDocument`는 테스트 먼저. 화면 이동·
대시보드 조작은 quickstart 수동 검증입니다.

**Organization**: 해시 주소와 이동 가드는 세 스토리가 모두 쓰므로 Foundational에 둡니다. 이후 US1(P1 초안
저장·옮기기) → US2(P2 대시보드) → US3(P3 주소 예외 처리). 모두 `useWorkspace.ts`·`EditorScreen.tsx`를
고치므로 순차 진행합니다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] `TDD-IMPLEMENTS.md` 표에 4행 추가(TODO): `M6-route`(`tests/lib/route.test.ts`), `M6-save`(`tests/lib/workspace/save-plan.test.ts`), `M6-date`(`tests/lib/date.test.ts`), `M6-repo`(`tests/lib/workspace/repository.test.ts` updateDocument)
- [X] T002 [P] `src/content/strings.ts`에 contracts/ui.md "문구" 15개 추가. `renamedOnSave`는 `(title: string) => \`같은 이름이 있어 '${title}'(으)로 저장했습니다\`` 함수로

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 해시 주소, 이동 가드, 저장소 `updateDocument` — 모든 스토리가 사용

### Tests (RED)

- [X] T003 [P] `tests/lib/route.test.ts` (contracts/modules.md): `parseRoute` — `"#/doc/abc"` → `{view:"doc",id:"abc"}`, `"#/doc/a%20b"` → id `"a b"`, `"#/new"`, `"#/dashboard"`, `""`·`"#"`·`"#/"`·`"#/xyz"`·`"#/doc/"` → `{view:"home"}`; `formatRoute`가 4종 각각 `"#/doc/a%20b"`·`"#/new"`·`"#/dashboard"`·`""`를 만들고 parse와 왕복; `sameRoute` 같은 id true·다른 id false·종류 다르면 false
- [X] T004 [P] `tests/lib/workspace/repository.test.ts`: `saveContent` 테스트를 `updateDocument(d.id, { content: "# 본문" })`로 교체하고 추가 — `updateDocument(id, { title: "b", folderId: g.id })` 후 `getDocument`에 반영·`updatedAt` 증가; 없는 폴더로 `updateDocument(id, { folderId: "nope" })` → reject, 문서는 그대로(제목·폴더·본문 불변); 없는 문서 id → reject. 두 구현 모두
- [X] T005 `npm test` 실패 확인 → `M6-route`·`M6-repo` RED 기록

### Implementation

- [X] T006 [P] `src/lib/route/route.ts`: `Route`, `parseRoute`, `formatRoute`, `sameRoute` (contracts/modules.md, `decodeURIComponent` 실패 시 home) (T003 통과)
- [X] T007 저장소: `src/lib/workspace/repository.ts`에서 `saveContent` 삭제·`updateDocument(id, patch: { content?: string; title?: string; folderId?: string })` 추가. `idb-repository.ts`는 `["folders","documents"]` readwrite 트랜잭션 1개에서 `folderId`가 있으면 폴더 존재 확인(없으면 `tx.done.catch(()=>{})`·`abort`·throw), 문서 없으면 throw, 필드 반영 후 `updatedAt = Date.now()`. `memory-repository.ts` 같은 규칙. `src/components/workspace/useWorkspace.ts`의 `saveContent` 호출을 `updateDocument(id, { content })`로 교체 (T004 통과)
- [X] T008 `npm test` GREEN → `M6-route`·`M6-repo` GREEN
- [X] T009 `src/components/workspace/useHashRoute.ts`(`"use client"`): `route` state(마운트 시 `parseRoute(location.hash)`), `hashchange` 구독, `navigate(route, { replace })` — push는 `location.hash = formatRoute(route)`, replace는 `history.replaceState(null, "", formatRoute(route) || location.pathname)` 후 state 직접 갱신(replaceState는 hashchange를 일으키지 않음)
- [X] T010 `useWorkspace.ts`: `view` 상태(`"loading" | "doc" | "new" | "dashboard" | "notFound"`)와 `openRoute(route, editor, previousRoute)` 추가 — 같은 대상이면 무시; 아니면 기존 `guard`(planSwitch·runSwitch)로 진행, 취소·저장 실패면 `false`를 돌려 호출부가 `history.replaceState`로 이전 해시 복원(research R2, `ponytail:` 기록 1개 증가 한계 주석). 대상별: `doc` → `getDocument`(없으면 `view="notFound"`), `dashboard` → `view="dashboard"`, `new` → US1에서 구현(지금은 dashboard로 처리), `home` → 시작 시 `bootstrap` 결과 id면 `#/doc/<id>`, null이면 `#/dashboard`로 replace (FR-012). 기존 `requestOpen`은 삭제
- [X] T011 `src/components/editor/EditorScreen.tsx`·`src/components/layout/Sidebar.tsx`: `useHashRoute` 연결 — 해시가 바뀌면 `openRoute` 호출, false면 이전 해시 복원. 사이드바 문서 행 클릭·Enter는 `navigate({view:"doc", id})`. M3 [새 문서](사이드바)로 만든 문서도 `navigate`로 이동. `view==="dashboard"`일 때는 이번 단계에서 편집 영역에 빈 자리 표시
- [X] T012 `npm test`·`npx tsc --noEmit`·`npm run build` 통과

**Checkpoint**: 문서마다 `#/doc/<id>` 주소, 새로고침·뒤로 가기가 문서 기준으로 동작, 이동 전 저장 확인 유지

---

## Phase 3: User Story 1 - 새 문서를 쓰고 폴더를 골라 저장 (Priority: P1) 🎯 MVP

**Goal**: 상단 [새 문서] → 초안 → 문서 바에서 폴더·제목 → [저장](미선택 차단·자동 접미사), 저장된 문서 폴더 바꾸기 = 옮기기

**Independent Test**: quickstart 2절 1–4번

### Tests (RED)

- [X] T013 [US1] `tests/lib/workspace/save-plan.test.ts` (data-model.md "저장 결정" 표): `uniqueTitle` — `("주간 회의", [])` → 그대로, `["주간 회의"]` → `"주간 회의-1"`, `["주간 회의","주간 회의-2"]` → `"주간 회의-1"`, `["주간 회의","주간 회의-1"]` → `"주간 회의-2"`, `["Notes"]`에 `"notes"` → `"notes-1"`; `planSave` — 초안 `folderId:null` → `{kind:"error",reason:"noFolder"}`, 초안 제목 `"a/b"` → `slash`, 초안 빈 제목 → title `"제목 없는 문서"`로 create, 초안 중복 → `renamed:true`+접미사, 초안 정상 → `renamed:false`, 문서 폴더 변경 시 대상 폴더에 같은 제목 → `duplicate`, 문서 정상 → `patch`에 바뀐 필드만(`content` 항상, 제목·폴더는 바뀐 경우만), 문서 자기 제목 그대로면 중복 아님
- [X] T014 [US1] `npm test` 실패 확인 → `M6-save` RED

### Implementation

- [X] T015 [US1] `src/lib/workspace/save-plan.ts`: `UNTITLED`, `uniqueTitle`, `planSave` (contracts/modules.md, 제목 검사는 M3 `validateName` 재사용 — 빈 제목은 `UNTITLED`로 바꾼 뒤 검사) (T013 통과) → `M6-save` GREEN
- [X] T016 [US1] `useWorkspace.ts`: 열린 대상을 `Doc | Draft | null`로 확장(`Draft = { kind:"draft", key, title:"제목 없는 문서", folderId:null }`, `key`는 초안마다 증가). `openRoute`의 `new` → 새 Draft, `view="new"`. `saveForm(form, content)` → `planSave` → `create`: `createDocument(folderId, title, content)` → 결과 문서 열기 → 호출부가 `navigate({view:"doc",id}, {replace:true})`(기록 늘리지 않음, FR-013); `update`: `updateDocument(id, patch)`, 폴더가 바뀌었고 대상 폴더가 접혀 있으면 펼침; `error`: 저장 없이 사유 반환. 반환형 `{ ok: true; createdId?: string; renamedTo?: string } | { ok: false; reason }`. 초안 dirty = 편집기 본문 ≠ `""`
- [X] T017 [P] [US1] `src/components/editor/DocumentBar.tsx` (contracts/ui.md 문서 바): props `folders`, `form: DocumentForm`, `onChange(form)`, `error: { field: "folder" | "title"; message } | null`, `folderRef`·`titleRef`. `<label>폴더 <select>`(첫 옵션 `""` "폴더 선택", 폴더 이름순), `<label>제목 <input>`, 폴더 0개면 `noFolders` 안내, 오류 시 해당 칸 `aria-invalid` + 아래 12px `#b42318` 문구. 높이 40px, 하단 1px border, 그림자 없음
- [X] T018 [US1] `EditorScreen.tsx`: 상단 바 오른쪽에 [새 문서] 버튼(`FilePlus`, `navigate({view:"new"})`), 편집 영역 맨 위(툴바 위)에 `DocumentBar`. 폼 상태는 열린 대상이 바뀔 때 `{ folderId: 대상.folderId, title: 대상.title }`로 초기화. [저장] → `saveForm` → 실패 사유별 오류·포커스(`noFolder` → 폴더 select·`needFolder`, 제목 오류 → 제목 input·M3 이름 오류 문구, `duplicate` → `moveDuplicate`), 성공 시 기존 저장 알림(접미사면 `renamedOnSave(제목)`), `createdId`면 replace 이동. 저장 확인 가드의 `saveCurrent`도 `saveForm` 경로를 써서 초안 미선택이면 이동 중단(spec Edge Case). Toast가 문자열 메시지를 받도록 toast state를 `{ message, kind }`로 바꿈
- [X] T019 [US1] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

**Checkpoint**: 초안 저장·자동 접미사·옮기기 동작

---

## Phase 4: User Story 2 - 대시보드에서 문서 목록 보고 열기 (Priority: P2)

**Goal**: 최근 수정순 표, 링크로 열기, 빈 상태

**Independent Test**: quickstart 2절 5·11·12번

- [X] T020 [P] [US2] `tests/lib/date.test.ts`: `formatDateTime(new Date(2026, 10, 2, 9, 5).getTime())` → `"2026-11-02 09:05"`(지역 시각으로 만든 값이라 시간대 무관), 두 자리 채우기 확인
- [X] T021 [US2] `npm test` 실패 확인 → `M6-date` RED, `src/lib/text/date.ts` 구현 → GREEN
- [X] T022 [P] [US2] `src/components/dashboard/Dashboard.tsx` (contracts/ui.md 대시보드): props `docs`, `folders`. `<h1>` "모든 문서", `<table>` 열 제목(`<a href={formatRoute({view:"doc",id})}>`)·폴더 이름·`formatDateTime(updatedAt)`, `updatedAt` 내림차순. 문서 0개면 `noDocuments` + [새 문서] 링크(`#/new`). `ponytail:` 가상 스크롤 없음(1,000행 1초 넘으면 도입) 주석
- [X] T023 [US2] `EditorScreen.tsx`: 상단 바에 [대시보드] 버튼(`LayoutList`, `navigate({view:"dashboard"})`, 대시보드에서 `aria-current="page"`·배경 `#e8edfb`·글자 accent). `view==="dashboard"`면 편집 영역(section)에 `Dashboard`만 렌더(문서 바·툴바·상태바 숨김). 문서 0개 시작 시 대시보드(FR-012)
- [X] T024 [US2] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

---

## Phase 5: User Story 3 - 문서마다 고유 주소 (Priority: P3)

**Goal**: 없는 문서 안내, 저장 시 기록 교체, 뒤로 가기 취소 복원 확인

**Independent Test**: quickstart 2절 6–10번

- [X] T025 [US3] `EditorScreen.tsx`: `view==="notFound"`면 편집 영역에 `notFound` 문구 + [대시보드로] 링크(`#/dashboard`). 문서를 지워서 열린 문서가 사라진 경우(M3 `remove`)도 다음 문서 id로 `navigate(..., {replace:true})`, 없으면 `#/dashboard`로 replace
- [X] T026 [US3] 이동 경로 점검: 사이드바·대시보드 링크·[대시보드]·[새 문서]·뒤로/앞으로가 모두 `hashchange` → `openRoute` 1곳을 지나는지 코드 검색으로 확인(`grep -n "open(" src/components` 등)하고, 다른 경로가 있으면 `navigate`로 교체. 결과를 `specs/005-document-flow/quickstart.md` 검증 기록에 적음 (SC-005)
- [X] T027 [US3] `npm test`·`npx tsc --noEmit`·`npm run build` 통과

---

## Phase 6: Polish

- [X] T028 품질 게이트 결과를 `TDD-IMPLEMENTS.md`에 기록
- [X] T029 `.claude/rules/anti-ai-slop.md` 점검(gradient·transform·animate·shadow·blur 0건, radius ≤ 8px)
- [ ] T030 quickstart 2절 수동 검증 12항목 — 브라우저 자동화가 없으면 미실행으로 `specs/005-document-flow/quickstart.md` "검증 기록"에 기록
- [X] T031 `CLAUDE.md` 마일스톤 표 M6 상태 갱신, `docs/requirement.md` §2·§11의 `/editor/[docId]`가 해시 주소로 바뀐 점을 `CLAUDE.md`에 1줄 기록

---

## Dependencies & Execution Order

- Setup → Foundational(T003·T004 병렬 → T005 → T006·T007 → T008 → T009 → T010 → T011 → T012) → US1 → US2 → US3 → Polish
- T017(DocumentBar)·T022(Dashboard)는 새 파일이라 같은 단계에서 병렬 작성 가능

## Parallel Example

```bash
Task: "T003 tests/lib/route.test.ts"
Task: "T004 tests/lib/workspace/repository.test.ts updateDocument"
# US1 중
Task: "T017 src/components/editor/DocumentBar.tsx"
Task: "T022 src/components/dashboard/Dashboard.tsx"
```

## Implementation Strategy

1. Setup + Foundational → 문서 주소·이동 가드 (기존 기능 유지)
2. US1 → 초안 저장·옮기기 (MVP)
3. US2 → 대시보드
4. US3 → 예외 주소 처리·이동 경로 점검
5. Polish

## Notes

- 헌장 원칙 I: 툴바·플러그인 변경 없음.
- 커밋 메시지는 한국어 합쇼체.
