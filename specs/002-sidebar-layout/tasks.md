---

description: "M2-a 사이드바 2분할 레이아웃·리사이즈 작업 목록"
---

# Tasks: 사이드바 2분할 레이아웃·리사이즈 (M2-a)

**Input**: Design documents from `/specs/002-sidebar-layout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함합니다(헌장 원칙 IV). 범위 제한·키 처리·저장값 해석은 `layout.ts` 순수 함수로 두고 테스트를
먼저 씁니다. 끌기·포커스·낭독은 quickstart 수동 검증입니다.

**Organization**: US1(구조) → US2(끌기·저장) → US3(키보드) 순서입니다. 세 스토리 모두
`EditorScreen.tsx`를 수정하므로 순차 진행합니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 미완료 작업 의존 없음)
- **[Story]**: US1, US2, US3 = spec.md 사용자 스토리

---

## Phase 1: Setup

- [X] T001 [P] `TDD-IMPLEMENTS.md` 마일스톤 표에 `M2a-layout | 레이아웃 범위 제한·키 처리·저장값 해석 (FR-005–FR-015) | tests/lib/layout.test.ts | TODO` 행 추가
- [X] T002 [P] `src/content/strings.ts`에 키 5개 추가 — `sidebarLabel: "사이드바"`, `sidebarEmpty: "폴더 기능은 다음 단계에서 제공됩니다"`, `contentLabel: "편집 영역"`, `sidebarHandleLabel: "사이드바 너비 조절"`, `splitHandleLabel: "에디터·미리보기 비율 조절"` (contracts/ui.md 문구 표)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US2·US3가 쓰는 레이아웃 순수 모듈과 CSS 변수

- [X] T003 `tests/lib/layout.test.ts` 작성 (contracts/layout.md "테스트" 절): `clamp` — 범위 안 그대로, `179`→180, `481`→480, `255.7`→256, `"260"`·`null`·`NaN`→initial(260); `stepByKey` — SIDEBAR·EDITOR 각각 ArrowRight(+step)·ArrowLeft(−step)·Home(min)·End(max)·`"a"`(null), 최대값에서 ArrowRight는 최대 유지; `loadLayout` — data-model.md 복원 규칙 6행: 키 없음→`{260,50}`, `"{bad"`→기본값, `{"sidebar":"x","editor":40}`→`{260,40}`, `{"sidebar":600,"editor":10}`→`{480,30}`, `{"sidebar":255.7,"editor":50}`→`{256,50}`, `getItem` 예외·`null` storage→기본값; `saveLayout` — 키 `"mdeditor:layout:v1"`에 `{"sidebar":300,"editor":60}` JSON 저장, `setItem` 예외 시 던지지 않음
- [X] T004 `npm test`로 T003이 "모듈 없음"으로 실패하는지 확인하고 `TDD-IMPLEMENTS.md` `M2a-layout` → `RED`, 대표 실패 줄 기록
- [X] T005 `src/lib/layout/layout.ts` 구현 — contracts/layout.md 시그니처 그대로(`LAYOUT_KEY`, `Bounds`, `SIDEBAR {180,480,10,260}`, `EDITOR {30,70,5,50}`, `Layout`, `DEFAULT_LAYOUT`, `clamp`, `stepByKey`, `loadLayout`, `saveLayout`). React·DOM import 금지, 예외를 던지지 않음 (T003 통과)
- [X] T006 `npm test` 전부 통과 확인 후 `TDD-IMPLEMENTS.md` `M2a-layout` → `GREEN`
- [X] T007 [P] `src/app/globals.css` `:root`에 `--sidebar-w: 260px; --editor-ratio: 50%;` 추가

**Checkpoint**: 레이아웃 순수 모듈 GREEN, M1 테스트 110개 유지

---

## Phase 3: User Story 1 - 사이드바가 있는 2분할 화면 (Priority: P1) 🎯 MVP

**Goal**: 상단 바(앱 이름만) / 사이드바(260px, 빈 영역 안내) + 편집 영역(툴바 행·에디터·프리뷰·상태바)

**Independent Test**: quickstart 2절 1·2번 — 구조 확인, M1 기능 동작 불변

- [X] T008 [P] [US1] `src/components/layout/Sidebar.tsx`: `<aside aria-label={strings.sidebarLabel}>`, 너비 `width: max(180px, min(var(--sidebar-w), calc(100vw - 480px)))`, `flex: none`, 배경 `var(--editor-bg)`, 안내 문구 `strings.sidebarEmpty` 1줄(12.5px, `var(--fg-muted)`, 위·좌 여백 16px). 장식 아이콘·일러스트 없음
- [X] T009 [US1] `src/components/editor/EditorScreen.tsx` 구조 변경 (contracts/ui.md "구조"): 상단 바에서 `<Toolbar>` 제거(로고·앱 이름만), 그 아래 `div.flex.min-h-0.flex-1.overflow-x-auto` 행에 `<Sidebar />` + `<section aria-label={strings.contentLabel}>`(`flex-1 min-w-[480px] flex-col`). section 안 첫 행에 툴바 행(`border-b var(--border)`, 좌우 패딩 14px, 세로 6px)으로 `<Toolbar>` 이동, 이어서 에디터·프리뷰 행, `<StatusBar>`. 에디터 칸 `flex: 0 0 var(--editor-ratio); min-width: 240px`, 프리뷰 칸 `flex: 1; min-width: 240px`. `<Toast>`는 그대로 (Clarification Q1, FR-001–FR-004)
- [X] T010 [US1] `npm test`(110개 유지)·`npx tsc --noEmit`·`npm run build` 통과 확인

**Checkpoint**: 2분할 화면 표시, M1 기능 불변 (경계는 아직 고정)

---

## Phase 4: User Story 2 - 경계를 끌어 너비 조절 (Priority: P2)

**Goal**: 경계 2개를 포인터로 끌어 조절, 새로고침 후 복원(첫 화면에서 너비가 튀지 않음)

**Independent Test**: quickstart 2절 3·4·5·8·9·10번

- [X] T011 [P] [US2] `src/components/layout/ResizeHandle.tsx`(`"use client"`) 포인터 부분 — props는 contracts/ui.md `Props` 그대로. 렌더: `role="separator"`, `aria-orientation="vertical"`, `aria-label`, `aria-valuenow/min/max`, `aria-valuetext={valueText(value)}`, `tabIndex={0}`, 폭 8px 투명 히트 영역 + 가운데 1px 선(`var(--border)`, hover·끌기 중 `var(--accent)`, transition 없음), `cursor: col-resize`. `onPointerDown`: `preventDefault`, `setPointerCapture`, `document.body.style.cursor = "col-resize"`, `document.body.style.userSelect = "none"`. `onPointerMove`(끌기 중만): `onChange(clamp(fromPointer(e.clientX), bounds))`. `onPointerUp`·`onPointerCancel`·`onLostPointerCapture`: body 스타일 원복, 끌기 중이었으면 `onCommit(현재 값)` 1회 (research R4)
- [X] T012 [US2] `src/components/editor/EditorScreen.tsx` 레이아웃 상태 연결: `useState<Layout>(DEFAULT_LAYOUT)`, 마운트 시 `loadLayout(getStorage())`로 동기화. 값이 바뀔 때 `document.documentElement.style.setProperty("--sidebar-w", \`${sidebar}px\`)`·`("--editor-ratio", \`${editor}%\`)`. `onCommit`은 `saveLayout(getStorage(), layout)`. 사이드바와 section 사이에 사이드바 핸들(`bounds=SIDEBAR`, `fromPointer = x - sidebarRef.getBoundingClientRect().left`, `valueText = v => \`${v}픽셀\``), 에디터 칸과 프리뷰 칸 사이에 에디터 핸들(`bounds=EDITOR`, `fromPointer = (x - rowRect.left) / rowRect.width * 100`, `valueText = v => \`에디터 ${v}%\``) 배치. 사이드바 핸들의 값·aria는 저장값(`sidebar`)을 씁니다 (FR-005–FR-009, FR-012, FR-013)
- [X] T013 [US2] `src/app/layout.tsx`: `<html … suppressHydrationWarning>`, `<head>`에 인라인 `<script dangerouslySetInnerHTML>` — `try { const v = JSON.parse(localStorage.getItem(LAYOUT_KEY)); … }` 로 `sidebar`·`editor`를 숫자면 반올림 후 `SIDEBAR`·`EDITOR` 범위로 제한해 `document.documentElement.style.setProperty`로 CSS 변수 설정, 숫자가 아니면 설정하지 않음, 예외는 무시. 범위·키 값은 `src/lib/layout/layout.ts` 상수를 import해 문자열에 주입(두 곳 규칙 일치, research R3, FR-014)
- [X] T014 [US2] `npm test`·`npx tsc --noEmit`·`npm run build` 통과 확인, `out/index.html`에 레이아웃 복원 스크립트가 `<head>`에 포함됐는지 확인

**Checkpoint**: 끌기 조절·한계값·저장·복원 동작

---

## Phase 5: User Story 3 - 키보드로 너비 조절 (Priority: P3)

**Goal**: Tab으로 경계 포커스, ←·→·Home·End로 조절, 보조기술이 이름·값을 읽음

**Independent Test**: quickstart 2절 6·7번

- [X] T015 [US3] `src/components/layout/ResizeHandle.tsx`에 `onKeyDown` 추가: `const next = stepByKey(value, e.key, bounds)`; `next !== null`이면 `preventDefault`, `onChange(next)`, `onCommit(next)`. `focus-visible`에 `outline: 2px solid var(--accent)` (FR-007, FR-010, FR-011)
- [X] T016 [US3] `npm test`·`npx tsc --noEmit`·`npm run build` 통과 확인

**Checkpoint**: 세 스토리 모두 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 품질 게이트 결과(`npm test` 수, `tsc` 오류 수, 빌드 결과)를 `TDD-IMPLEMENTS.md` 하단에 기록
- [X] T018 `.claude/rules/anti-ai-slop.md` 점검: `grep -rnE "gradient|backdrop-filter|@keyframes|translate|scale\(|animate-|shadow" src/` 0건, 새 코드의 `border-radius` 8px 이하
- [ ] T019 quickstart.md 2절 수동 검증 10항목 실행 후 결과를 `specs/002-sidebar-layout/quickstart.md` 하단 "검증 기록"에 추가 — 브라우저 자동화가 없으면 미실행 항목으로 기록(사람이 실행)
- [X] T020 `CLAUDE.md` 마일스톤 표 M2 상태를 "M2-a 구현 완료"로 갱신

---

## Dependencies & Execution Order

- Setup(T001·T002 병렬) → Foundational(T003 → T004 → T005 → T006, T007은 병렬) → US1 → US2 → US3 → Polish
- US1·US2·US3는 모두 `EditorScreen.tsx`를 수정하므로 순차 진행합니다. T008(Sidebar)·T011(ResizeHandle)은 새 파일이라 앞 단계와 병렬로 작성할 수 있습니다.
- T013은 T005(상수)에 의존합니다.

## Parallel Example

```bash
# Setup + Foundational 일부 동시
Task: "T001 TDD-IMPLEMENTS.md 행 추가"
Task: "T002 strings.ts 문구 5개"
Task: "T007 globals.css CSS 변수"

# US1 진행 중 US2 새 파일 미리 작성
Task: "T008 Sidebar.tsx"
Task: "T011 ResizeHandle.tsx 포인터 부분"
```

## Implementation Strategy

1. Setup + Foundational → 레이아웃 순수 모듈 GREEN
2. US1 → 2분할 구조 (MVP: 경계 고정이어도 M3 사이드바 자리 확보)
3. US2 → 끌기·저장·깜빡임 없는 복원
4. US3 → 키보드·보조기술
5. Polish → 게이트·디자인 규칙·수동 검증 기록

## Notes

- 툴바 컴포넌트(`Toolbar.tsx`)와 `src/plugins/`는 수정하지 않습니다(위치만 이동, 헌장 원칙 I).
- 커밋 메시지는 한국어 합쇼체로 씁니다.
