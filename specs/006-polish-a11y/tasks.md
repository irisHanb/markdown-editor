---

description: "M7 마감 — 이탈 경고·접근성 작업 목록"
---

# Tasks: 마감 — 이탈 경고·접근성 (M7)

**Input**: Design documents from `/specs/006-polish-a11y/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함합니다(헌장 원칙 IV). 접근성 이름·영역·대비 테스트는 US2·US3 구현보다 먼저 Phase 2에서 쓰고 실패를
확인합니다. 저장하지 않은 변경 판단(`hasUnsavedChanges`)은 US1 안에서 테스트 먼저. 이탈 확인·포커스 이동·낭독기는
quickstart 2절 수동 검증입니다.

**Organization**: US1(P1 이탈 경고) → US2(P2 키보드) → US3(P3 낭독기·대비). 세 스토리 모두 `EditorScreen.tsx`를
고치므로 스토리 사이는 순차 진행합니다. 스토리 안에서 다른 파일 작업은 [P]로 병렬 가능합니다.

**RED 유지 구간**: Phase 2의 `tests/a11y/` 실패는 US3 완료(T030)까지 의도된 RED입니다. 그 사이 품질 게이트(T015·T023)는
`npx vitest run tests/lib`(기존·US1 테스트) 통과와 `tsc`·`build` 통과로 판정합니다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] `TDD-IMPLEMENTS.md` 표에 3행 추가(TODO): `M7-dirty`(`tests/lib/workspace/dirty.test.ts`), `M7-names`(`tests/a11y/names.test.tsx`), `M7-contrast`(`tests/a11y/contrast.test.ts`)
- [X] T002 [P] `package.json` `devDependencies`에 `"parse5": "8.1.1"` 추가 후 `npm install`(이미 `rehype-raw` 경유로 설치된 버전 — `package-lock.json`만 바뀌는지 확인). `vitest.config.mts` `include`를 `["tests/**/*.test.ts", "tests/**/*.test.tsx"]`로 (research R9)
- [X] T003 [P] `src/content/strings.ts`에 contracts/ui.md "문구" 4개 추가: `skipToContent: "본문으로 건너뛰기"`, `documentInfoLabel: "문서 정보"`, `editorPaneLabel: "에디터"`, `statusBarLabel: "상태 표시줄"`

---

## Phase 2: Foundational — 접근성 테스트 (RED)

**Purpose**: US2·US3가 만족해야 할 이름·영역·건너뛰기·대비 검사를 구현 전에 작성하고 실패를 확인합니다(헌장 원칙 IV).

- [X] T004 [P] 테스트 유틸 `tests/a11y/accessible-name.ts` — `unnamedElements(html: string): string[]` (contracts/modules.md: parse5 `parse`로 문서 파싱, 대상 `button`·`a[href]`·`input`(type≠hidden)·`select`·`textarea`·`[role=treeitem]`, 이름 출처 `aria-label` → `aria-labelledby` → 조상 `<label>` 텍스트 → `aria-hidden="true"` 하위 제외 텍스트, 반환은 `"태그.class앞20자"` 요약). 같은 파일에 `regions(html): string[]` — `main`·`nav`·`aside`·`header`·이름 있는 `section`의 `"태그:이름"` 목록, `firstInteractiveText(html): string` — 문서 순서 첫 상호작용 요소의 이름
- [X] T005 [P] 테스트 유틸 `tests/a11y/contrast.ts` — `contrastRatio(fg: string, bg: string): number` (WCAG 2.x 상대 휘도, `#rrggbb`)
- [X] T006 `tests/a11y/names.test.tsx` — (1) 유틸 자체 확인: `<button><svg aria-hidden="true"></svg></button>`는 검출, `<button aria-label="굵게">`·`<label>폴더<select></select></label>`은 미검출. (2) `renderToStaticMarkup`으로 `Toolbar`(`onRun` 빈 함수, `activeIds: new Set(["bold"])`, `titleOf: p => p.label`)·`StatusBar`·`DocumentBar`(폴더 2개, `error` 있음/없음)·`Dashboard`(문서 2개·0개)·`Sidebar`(폴더 2개·문서 3개·`currentId` 지정)·`InsertDialog`(링크 플러그인 `request`)·`ConfirmDialog`(3버튼 `request`)를 렌더해 `unnamedElements` 결과가 `[]`. (3) `regions`: `StatusBar`에 `"section:상태 표시줄"`, `DocumentBar`에 `"section:문서 정보"`, `EditorScreen`에 `"main:편집 영역"`·`"nav:Markdown Editor"`·`"aside:사이드바"`. (4) `firstInteractiveText(EditorScreen 마크업) === strings.skipToContent`. (5) 편집기 칸은 서버 렌더 첫 화면(`loading`)에 없으므로 `src/components/editor/EditorScreen.tsx` 소스에 `aria-label={strings.editorPaneLabel}`가 있는지 문자열로 확인 (FR-007·FR-009·FR-010, SC-003). `ref` prop은 `createRef()`
- [X] T007 `tests/a11y/contrast.test.ts` — research R8 표의 통과 행을 `contrastRatio`로 검사(글자 ≥ 4.5, 테두리 ≥ 3.0). `src/app/globals.css`를 읽어 (a) `--input-border` 값이 흰색 대비 ≥ 3.0, (b) `.md-preview li::marker` 규칙의 `color`가 `var(--fg-muted)`(→ `--fg-muted` 값으로 해석)이고 흰색 대비 ≥ 4.5, (c) `src/components/editor/DocumentBar.tsx`·`src/components/editor/InsertDialog.tsx` 소스에 `border-[var(--input-border)]`가 각각 2회 이상 (FR-013, SC-005, 헌장 VI)
- [X] T008 `npm test` 실패 확인 — 예상 실패: 영역 이름(`section:상태 표시줄`·`section:문서 정보`·`main:편집 영역`), 첫 상호작용 요소(건너뛰기 버튼 없음), `editorPaneLabel`, `--input-border` 없음, 목록 번호 대비 3.09. 실패 목록을 `TDD-IMPLEMENTS.md`에 `M7-names`·`M7-contrast` RED로 기록

**Checkpoint**: 접근성 RED 확보. 이후 구현이 이 테스트를 하나씩 통과시킵니다

---

## Phase 3: User Story 1 — 저장하지 않고 탭을 닫으면 경고 (Priority: P1) 🎯 MVP

**Goal**: 본문·폴더·제목 중 하나라도 저장하지 않은 변경이 있으면 탭 닫기·새로고침·외부 이동 때 브라우저 이탈 확인을
띄웁니다. M6 앱 안 저장 확인과 [취소]도 같은 기준을 씁니다.

**Independent Test**: 문서 본문(또는 제목)을 고치고 새로고침하면 확인이 뜨고, [저장]·[취소] 직후에는 뜨지 않습니다
(quickstart 2절 1–7).

### Tests (RED)

- [X] T009 [US1] `tests/lib/workspace/dirty.test.ts` — contracts/modules.md 표 9경우. 기준 입력: 문서 `{ content: "a", baseline: "a", form: { folderId: "f1", title: "t" }, saved: { folderId: "f1", title: "t" }, isDraft: false }`, 초안 `{ content: "", baseline: "", form: { folderId: null, title: UNTITLED }, saved: { folderId: null, title: UNTITLED }, isDraft: true }`(`UNTITLED`는 `@/lib/workspace/save-plan`에서 import). 초안 폴더만 고름 = `form.folderId: "f1"` → `false`
- [X] T010 [US1] `npx vitest run tests/lib/workspace/dirty.test.ts` 실패 확인(`Cannot find package '@/lib/workspace/dirty'`) → `M7-dirty` RED 기록

### Implementation

- [X] T011 [US1] `src/lib/workspace/dirty.ts` — `UnsavedInput` 타입·`hasUnsavedChanges` (contracts/modules.md). 규칙: `content !== baseline || form.title !== saved.title || (!isDraft && form.folderId !== saved.folderId)`. 테스트 통과 → `M7-dirty` GREEN 기록
- [X] T012 [US1] `src/components/editor/EditorScreen.tsx` — 기준값 `saved`를 계산: `current`가 있으면 `{ folderId: current.folderId, title: current.title }`, 없고 `draft`가 있으면 `{ folderId: draft.folderId, title: draft.title }`(M6 `Draft`는 생성 시 값만 가짐 — `useWorkspace.ts:82`). `form`·`saved`를 ref(`formRef`·`savedRef`)에 매 렌더 대입하고, `editorGuard.isDirty`(현재 `EditorScreen.tsx:184`)를 `viewRef.current ? hasUnsavedChanges({ content: view 본문, baseline: baselineRef.current, form: formRef.current, saved: savedRef.current, isDraft: screen === "new" }) : false`로 교체
- [X] T013 [US1] `src/components/editor/EditorScreen.tsx` `handleCancel`(현재 230행) — 본문 되돌림에 더해 `setForm({ folderId: saved.folderId, title: saved.title })`와 `setBarError(null)`. 알림 문구는 M1 그대로
- [X] T014 [US1] `src/components/editor/EditorScreen.tsx` — `guardRef.current = editorGuard`를 매 렌더 대입하고, 마운트 시 1회 `useEffect`로 `window.addEventListener("beforeunload", h)` 등록·정리. `h(e)`: `if (guardRef.current.isDirty()) { e.preventDefault(); e.returnValue = ""; }` (research R1). 해시 변경은 `beforeunload`를 일으키지 않으므로 앱 안 이동용 코드는 추가하지 않음(FR-003)
- [X] T015 [US1] `npx vitest run tests/lib` 통과, `npx tsc --noEmit`·`npm run build` 통과 확인 (`tests/a11y/`는 RED 유지 구간)

**Checkpoint**: 이탈 경고 동작. 앱 안 저장 확인이 제목·폴더 변경에도 뜸(M6 결함 수정)

---

## Phase 4: User Story 2 — 키보드만으로 모든 작업 (Priority: P2)

**Goal**: 포커스가 항상 보이고, 앱 안 화면 전환 후 정해진 위치로 옮겨지며, 첫 Tab에서 건너뛰기 버튼을 쓸 수 있습니다.

**Independent Test**: quickstart 2절 8–13 (마우스 없이 SC-002 작업 7개), `names.test.tsx`의 첫 상호작용 요소 단언 통과

### Implementation

- [X] T016 [P] [US2] `src/components/editor/MarkdownEditor.tsx` 테마 — `"&.cm-focused": { outline: "none" }`를 `{ outline: "2px solid var(--accent)", outlineOffset: "-2px" }`로 (research R4)
- [X] T017 [P] [US2] `src/components/layout/Sidebar.tsx:83` 이름 바꾸기 칸 — `outline-none`을 `focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]`로
- [X] T018 [P] [US2] `src/components/dashboard/Dashboard.tsx` — `headingRef?: Ref<HTMLHeadingElement>` prop 추가, `<h1 ref={headingRef} tabIndex={-1} className="… outline-none">` (FR-008 예외: 스크립트로만 포커스를 받는 비상호작용 요소)
- [X] T019 [US2] `src/components/editor/EditorScreen.tsx` — 포커스 함수 `focusMain()`: `hasEditor`면 `viewRef.current?.focus()`, `dashboard`면 `dashboardHeadingRef.current?.focus()`, `notFound`면 `notFoundRef.current?.focus()`. 없는 문서 안내 `<span>`을 `<p ref={notFoundRef} tabIndex={-1} className="m-0 outline-none">`로. `Dashboard`에 `headingRef` 전달
- [X] T020 [US2] `src/components/editor/EditorScreen.tsx` — 앱 안 이동 후 포커스(research R5): `navigatedRef`를 `onHashChange`에서 `result.ok`일 때 `true`로(`createFromSidebar`도 `navigate` → `hashchange` 경로라 추가 코드 없음). `useEffect(..., [screen, editorKey])`에서 `navigatedRef.current`면 `requestAnimationFrame(focusMain)` 후 `false`로. 기존 `editorKey` 효과의 `if (screen === "new") requestAnimationFrame(...)`(현재 127행)는 삭제(이 규칙이 대신함). 앱 시작 시 첫 `openRoute`(현재 255행)는 `navigatedRef`를 건드리지 않음
- [X] T021 [US2] `src/components/editor/EditorScreen.tsx` — 최상위 `<div>`의 첫 자식으로 `<button type="button" onClick={focusMain} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">{strings.skipToContent}</button>` (FR-007, research R6 — 해시를 바꾸는 `<a href="#…">`는 쓰지 않음). T006 (4) 단언 통과 확인
- [X] T022 [US2] 포커스 테두리 누락 점검: `grep -rnE "<(button|a|input|select|textarea)\b" src/components` 결과의 각 요소 `className`에 `focus-visible:outline`이 있는지 확인하고, 없으면 `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]` 추가. `grep -rn "outline-none" src`가 T018·T019 두 곳(`tabIndex={-1}` 비상호작용 요소)만 남는지 확인. 결과를 `specs/006-polish-a11y/quickstart.md` "검증 기록"에 적음
- [X] T023 [US2] `npx vitest run tests/lib` 통과, `npx tsc --noEmit`·`npm run build` 통과 확인

**Checkpoint**: 키보드 흐름 완성. 이름·영역·대비는 US3

---

## Phase 5: User Story 3 — 화면 낭독기로 상태 파악 (Priority: P3)

**Goal**: 모든 상호작용 요소에 한글 이름, 화면 영역에 이름 있는 랜드마크, 입력 칸 테두리 대비 3:1, 목록 번호 대비 4.5:1.

**Independent Test**: `npm test`의 `M7-names`·`M7-contrast` 통과 + quickstart 2절 14–16(VoiceOver)

### Implementation

- [X] T024 [P] [US3] `src/components/editor/StatusBar.tsx` — `<footer>`를 `<section aria-label={strings.statusBarLabel}>`로(클래스 그대로, research R7)
- [X] T025 [P] [US3] `src/components/editor/DocumentBar.tsx` — 바깥 `<div>`를 `<section aria-label={strings.documentInfoLabel}>`로. select·input 테두리 `border-[#dfe4ec]`를 `border-[var(--input-border)]`로(오류 시 `#b42318` 그대로)
- [X] T026 [P] [US3] `src/components/editor/InsertDialog.tsx` — 입력 칸 2개(72·82행)의 `border-[#dfe4ec]`를 `border-[var(--input-border)]`로. 버튼 테두리(89행)는 그대로
- [X] T027 [P] [US3] `src/app/globals.css` — `:root`에 `--input-border: #8a94a6;` 추가(주석: 입력 칸 경계 3:1, research R8). `.md-preview li::marker { color: #8a93a6; }`를 `color: var(--fg-muted);`로(3.09 → 4.76:1, 헌장 VI)
- [X] T028 [US3] `src/components/editor/EditorScreen.tsx` — 편집 영역 `<section aria-label={strings.contentLabel}>`를 `<main aria-label={strings.contentLabel}>`으로, 편집기 칸 `<div className="flex min-w-[240px] flex-col bg-[var(--editor-bg)]">`를 `<section aria-label={strings.editorPaneLabel} …>`로 (contracts/ui.md 화면 구조)
- [X] T029 [US3] hover 대비 점검: `grep -rn "fg-muted" src/components`에서 `hover:bg-[#f1f3f9]`(대비 4.29)와 같은 요소에 쓰인 곳을 찾아 글자색을 `#5a6577`로. 없으면 "해당 없음"으로 quickstart 검증 기록에 적음
- [X] T030 [US3] `npm test` 전체 통과 → `M7-names`·`M7-contrast` GREEN 기록. `npx tsc --noEmit`·`npm run build` 통과

**Checkpoint**: 세 스토리 완료, RED 유지 구간 종료

---

## Phase 6: Polish

- [X] T031 품질 게이트 결과(`npm test`·`tsc`·`build`)를 `TDD-IMPLEMENTS.md` "품질 게이트 — M7"에 기록
- [X] T032 `.claude/rules/anti-ai-slop.md` 점검 — `grep -rnE "gradient|transform|animate-|shadow|blur" src` 결과가 주석뿐인지, 새 클래스에 radius > 8px 없는지(건너뛰기 버튼 `rounded-md` 6px)
- [ ] T033 quickstart 2절 수동 검증 16항목 — 브라우저 자동화를 쓸 수 없으면 미실행으로 `specs/006-polish-a11y/quickstart.md` "검증 기록"에 기록
- [X] T034 `CLAUDE.md` 마일스톤 표 M7 상태 갱신

---

## Dependencies & Execution Order

- Setup(T001–T003 병렬) → Foundational(T004·T005 병렬 → T006·T007 → T008) → US1(T009 → T010 → T011 → T012 → T013 → T014 → T015) → US2(T016·T017·T018 병렬 → T019 → T020 → T021 → T022 → T023) → US3(T024–T027 병렬 → T028 → T029 → T030) → Polish
- T002(parse5·vitest include)·T003(문구)은 T006보다 먼저
- T018(Dashboard `headingRef`)은 T019보다 먼저

## Parallel Example

```bash
# Setup
Task: "T001 TDD-IMPLEMENTS.md 3행"
Task: "T002 parse5·vitest include"
Task: "T003 strings.ts 문구 4개"
# Foundational
Task: "T004 tests/a11y/accessible-name.ts"
Task: "T005 tests/a11y/contrast.ts"
# US2
Task: "T016 MarkdownEditor .cm-focused outline"
Task: "T017 Sidebar 이름 바꾸기 칸 포커스"
Task: "T018 Dashboard headingRef"
# US3
Task: "T024 StatusBar section"
Task: "T025 DocumentBar section·테두리"
Task: "T026 InsertDialog 테두리"
Task: "T027 globals.css --input-border·목록 번호 색"
```

## Implementation Strategy

1. Setup + Foundational → 접근성 RED 확보
2. US1 → MVP: 탭을 닫아도 저장하지 않은 내용을 잃지 않음, M6 저장 확인 결함 수정
3. US2 → 키보드 흐름 (건너뛰기 단언 GREEN)
4. US3 → 이름·영역·대비 (`tests/a11y/` 전체 GREEN)
5. Polish

## Notes

- 헌장 원칙 I: 플러그인·툴바 동작 변경 없음(`Toolbar`는 이름 검사 대상일 뿐).
- 접근성 검사 유틸(`tests/a11y/*.ts`)은 앱 코드가 쓰지 않으므로 `src`에 두지 않습니다.
- 커밋 메시지는 한국어 합쇼체.
