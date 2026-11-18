---

description: "M2-b 툴바 완성 작업 목록"
---

# Tasks: 툴바 완성 — 18버튼·토글·입력 대화상자·단축키 (M2-b)

**Input**: Design documents from `/specs/003-full-toolbar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함합니다(헌장 원칙 IV). 헬퍼·플러그인·표기는 순수 함수 테스트를 먼저 씁니다.

**Organization**: US1(18버튼) → US2(토글·활성) → US3(대화상자) → US4(단축키). 모두 `src/plugins/`와
`EditorScreen.tsx`를 건드리므로 순차 진행합니다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] `TDD-IMPLEMENTS.md` 표에 4행 추가(상태 TODO): `M2b-buttons`(18버튼 동작, `tests/plugins/plugins.test.ts`), `M2b-toggle`(토글·활성, `tests/plugins/helpers.test.ts`·`plugins.test.ts`), `M2b-dialog`(대화상자 open·submit, `plugins.test.ts`), `M2b-shortcut`(단축키 표기·배정, `tests/plugins/format-shortcut.test.ts`)
- [X] T002 [P] `src/content/strings.ts`에 contracts/ui.md 문구 7개 추가(`dialogLinkInsert` … `dialogUpdate`)
- [X] T003 [P] `src/plugins/types.ts`에 `DialogInit`, `DialogValues`, `PluginDialog`, `MarkdownPlugin.dialog?` 추가 (contracts/plugin-api.md 타입)

---

## Phase 2: User Story 1 - 모든 문법을 버튼으로 넣기 (Priority: P1) 🎯 MVP

**Goal**: 18버튼·5묶음, 새 문법 4종 + H1–H3 + 번호 증가

**Independent Test**: quickstart 2절 1·2번

### Tests (RED)

- [X] T004 [US1] `tests/plugins/plugins.test.ts` 교체: `pluginGroups` 길이 `[3,4,3,5,3]`, `plugins` 18개, id 순서 = contracts/plugin-api.md 표, label 한글. 선택 있음/없음 기대값 — `heading-1/2/3`(`ab|c` → `[# abc]` 등), `image`·`link`는 이 단계에서 제외(US3), `autolink`(`|` → `<[https://]>`, `[a.com]` → `<[a.com]>`), `task-list`(`[x\ny]` → `[- [ ] x\n- [ ] y]`), `ordered-list`(`[x\ny]` → `[1. x\n2. y]`), `hard-break` 2행, 나머지 M1 기대값 유지. 접두 토글 관련 행(`##` 교체 등)은 US2에서 추가
- [X] T005 [US1] `tests/plugins/helpers.test.ts`에 `insertAtSelectionEnd`(`foo|` → `foo\\\n|`, `[foo]bar` → `foo\\\n|bar`)와 `toggleLinePrefix` 기본 추가 동작(접두 없음 → 추가, 빈 줄 건너뜀 `[a\n\nb]` → `[- a\n\n- b]`, 번호 증가) 추가
- [X] T006 [US1] `npm test` 실패 확인 → `TDD-IMPLEMENTS.md` `M2b-buttons` RED 기록

### Implementation

- [X] T007 [US1] `src/plugins/helpers.ts`: `insertAtSelectionEnd`, `toggleLinePrefix(state, family, kind)`와 family 정의(contracts/plugin-api.md family 표, research R3) 구현. 기존 `prefixLines`는 삭제하고 사용처를 `toggleLinePrefix`로 교체
- [X] T008 [P] [US1] `src/plugins/heading-factory.ts`(`createHeadingPlugin(level: 1|2|3)`, 아이콘 `Heading1–3`, id `heading-${level}`, label `제목 ${level}`) + `heading-1.ts`·`heading-2.ts`·`heading-3.ts`(각 1줄 export). `src/plugins/heading.ts` 삭제
- [X] T009 [P] [US1] 새 플러그인 `src/plugins/image.ts`(이 단계는 `dialog` 없이 `apply` = 빈 변경 자리, US3에서 완성), `autolink.ts`(`Link2`, `wrapSelection("<", ">", "https://")`), `task-list.ts`(`ListChecks`, `toggleLinePrefix(list, task)`), `hard-break.ts`(`WrapText`, `insertAtSelectionEnd("\\\n")`)
- [X] T010 [US1] `blockquote.ts`·`bullet-list.ts`·`ordered-list.ts`를 `toggleLinePrefix`로 교체
- [X] T011 [US1] `src/plugins/index.ts`: `pluginGroups` 5묶음 18개(contracts/plugin-api.md 순서)
- [X] T012 [US1] `npm test` GREEN 확인 → `M2b-buttons` GREEN

**Checkpoint**: 툴바 18버튼 표시·동작(이미지·링크 대화상자 제외)

---

## Phase 3: User Story 2 - 다시 누르면 해제, 적용 상태 표시 (Priority: P2)

**Goal**: 토글 11버튼, 커서 위치 기준 눌림 표시

**Independent Test**: quickstart 2절 3·10·11번

### Tests (RED)

- [X] T013 [US2] `tests/plugins/helpers.test.ts`에 `toggleInline`·`isInlineActive` 테스트: contracts/plugin-api.md 기대 예시 인라인 7행(선택 안쪽·바깥 구분자, 커서만, `***` 양방향, 백틱 포함 내용), 줄 넘어 범위 탐색 안 함
- [X] T014 [US2] `tests/plugins/plugins.test.ts`에 토글 행 추가: 접두 교체·해제(`## 제목|` + H1/H2, `#### 제목|` + H1, `[- a\n- b]` + ordered/bullet, `[- [x] a]` + task), 11개 토글 플러그인 각각 "적용 → 다시 적용 = 원문"(SC-002), 같은 버튼 2–10회 연속 후 `****`·`## ## `·`- - ` 미포함(SC-003), `isActive` true/false 각 1케이스
- [X] T015 [US2] `npm test` 실패 확인 → `M2b-toggle` RED

### Implementation

- [X] T016 [US2] `src/plugins/helpers.ts`: `toggleInline`, `isInlineActive`, `isLinePrefixActive` (research R2·R3, 한계는 `ponytail:` 주석)
- [X] T017 [US2] `bold.ts`·`italic.ts`·`strikethrough.ts`·`inline-code.ts`를 `toggleInline`으로 교체하고 `isActive` 추가. 접두 플러그인 7개(H1–H3, 인용, 목록 3종)에 `isActive` 추가
- [X] T018 [US2] `src/components/editor/MarkdownEditor.tsx`: props `onSelection?(state: EditorState)` 추가 — `updateListener`에서 `selectionSet || docChanged`일 때 `{doc, selectionStart: main.from, selectionEnd: main.to}` 전달 (`ponytail:` 문서 전체 문자열 생성 한계 주석)
- [X] T019 [US2] `src/components/editor/Toolbar.tsx`: props를 `{ onRun, activeIds, isMac }`로 변경. `isActive`가 있는 버튼에 `aria-pressed`, 눌림 시 배경 `#e8edfb`·아이콘 `var(--accent)`. `onMouseDown` `preventDefault`. 실행 로직(`run`)은 `EditorScreen`으로 이동
- [X] T020 [US2] `src/components/editor/EditorScreen.tsx`: `runPlugin(plugin)`(M1 `run` 로직 이동: `apply` → 전체 교체 트랜잭션 1개 + 선택 + `view.focus()`), `activeIds` state(`onSelection`에서 `plugins.filter(p => p.isActive?.(s))`), `<Toolbar onRun={runPlugin} activeIds={…} isMac={…} />`
- [X] T021 [US2] `npm test` GREEN → `M2b-toggle` GREEN, `npx tsc --noEmit` 통과

**Checkpoint**: 토글·눌림 표시 동작

---

## Phase 4: User Story 3 - 링크·이미지 입력 대화상자 (Priority: P3)

**Goal**: 삽입·수정 모드 대화상자

**Independent Test**: quickstart 2절 4–7번

### Tests (RED)

- [X] T022 [US3] `tests/plugins/helpers.test.ts`에 `findBracketSyntax`(링크·이미지·title 유무·커서가 밖이면 null·링크 안에서 image 탐색 시 null)와 `normalizeUrl`(` https://a.com ` → `https://a.com`, `/my logo.png` → `/my%20logo.png`) 추가
- [X] T023 [US3] `tests/plugins/plugins.test.ts`에 contracts/plugin-api.md `link.open`·`link.submit`·`image.submit` 행 + 선택 없음 기본값("링크 텍스트"/"이미지") + 수정 모드 title 유지 추가
- [X] T024 [US3] `npm test` 실패 확인 → `M2b-dialog` RED

### Implementation

- [X] T025 [US3] `src/plugins/helpers.ts`: `findBracketSyntax`, `normalizeUrl`
- [X] T026 [US3] `src/plugins/link.ts`·`image.ts`: `dialog { firstLabel, open, submit }` 구현, `apply`는 입력 그대로 반환(사용 안 함). link `shortcut: "Mod-k"`
- [X] T027 [P] [US3] `src/components/editor/InsertDialog.tsx`(contracts/ui.md): `<dialog>` + `showModal()`, 칸 2개, 주소 공백뿐이면 [삽입]/[수정] `disabled`, 제출은 `onSubmit({first, url})`, `cancel` 이벤트·[취소]·배경 클릭은 `onClose()`, 열린 직후 주소 칸 포커스. 그림자·blur·애니메이션 없음, `::backdrop` 색은 `globals.css`
- [X] T028 [US3] `EditorScreen.tsx`: `runPlugin`이 `plugin.dialog`면 `open(state)` 결과로 대화상자 상태 설정, 제출 시 `submit` → 트랜잭션 → 닫기 → `view.focus()`, 닫기만 하면 `view.focus()`(선택 유지)
- [X] T029 [US3] `npm test` GREEN → `M2b-dialog` GREEN, `tsc` 통과

**Checkpoint**: 링크·이미지 삽입·수정

---

## Phase 5: User Story 4 - 단축키 (Priority: P4)

**Goal**: 단축키 11개, IME 조합 중 무동작, 툴팁 표기

**Independent Test**: quickstart 2절 8·9번

### Tests (RED)

- [X] T030 [US4] `tests/plugins/format-shortcut.test.ts`: `formatShortcut("Mod-b", true)` → `⌘B`, `(…, false)` → `Ctrl+B`, `Mod-Shift-x` → `⌘⇧X` / `Ctrl+Shift+X`, `Mod-Alt-1` → `⌘⌥1` / `Ctrl+Alt+1`. 레지스트리 단축키 집합이 FR-020 11개와 일치하고 중복 없음
- [X] T031 [US4] `npm test` 실패 확인 → `M2b-shortcut` RED

### Implementation

- [X] T032 [US4] `src/plugins/shortcut.ts`: `formatShortcut`. 플러그인 shortcut 필드 채우기(FR-020 표: heading-1–3, bold, italic, strikethrough, inline-code, link, bullet·ordered·task-list)
- [X] T033 [US4] `MarkdownEditor.tsx`: props `bindings?: { key: string; run: () => boolean }[]` → `Prec.high(keymap.of(bindings.map(b => ({ key: b.key, run: (view) => !view.composing && b.run() }))))` (FR-017, FR-018). 플러그인 import 없음(코어 비종속)
- [X] T034 [US4] `EditorScreen.tsx`: `bindings = plugins.filter(p => p.shortcut).map(p => ({ key: p.shortcut, run: () => { runPlugin(p); return true; } }))`, `isMac` state(마운트 후 `navigator.platform`/`userAgent`로 판정)
- [X] T035 [US4] `Toolbar.tsx`: `title = label + (shortcut && isMac 판정 후 ? \` (${formatShortcut(...)})\` : "")` (FR-019)
- [X] T036 [US4] `npm test` GREEN → `M2b-shortcut` GREEN

---

## Phase 6: Polish

- [X] T037 품질 게이트(`npm test`·`npx tsc --noEmit`·`npm run build`) 결과를 `TDD-IMPLEMENTS.md`에 기록
- [X] T038 `.claude/rules/anti-ai-slop.md` 점검(gradient·transform·animate·shadow·blur 0건, radius ≤ 8px)
- [ ] T039 quickstart 2절 수동 검증 11항목 — 브라우저 자동화가 없으면 미실행으로 `quickstart.md` "검증 기록"에 기록
- [X] T040 `CLAUDE.md` 마일스톤 표 M2 상태를 "M2-a·M2-b 구현 완료(수동 검증 잔여)"로 갱신

## Dependencies & Execution Order

Setup → US1 → US2 → US3 → US4 → Polish. 각 스토리 안에서는 테스트(RED) → 구현(GREEN). T008·T009, T027은
새 파일이라 같은 단계 안에서 병렬 가능합니다.

## Notes

- 헌장 원칙 I: 플러그인을 추가해도 `Toolbar.tsx`·`MarkdownEditor.tsx`는 바뀌지 않는 구조로 만듭니다(이번
  변경은 구조 확장 1회).
- 커밋 메시지는 한국어 합쇼체.
