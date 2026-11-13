# Tasks: 수동 검증 피드백 반영 (007)

**Tests**: 포함(헌장 원칙 IV). 플러그인 동작은 단위 테스트, 로고 링크는 서버 렌더 검사 먼저.

## Phase 1: Tests (RED)

- [X] T001 [P] `tests/plugins/helpers.test.ts` — `toggleLinePrefix` 커서만 있을 때: `"ab|c"` → h2 → `"## ab|c"`, `"|"` → task → `"- [ ] |"`, `"## ab|c"` → h2(해제) → `"ab|c"`, `"#|# abc"` → h2(해제) → `"|abc"`(접두 안 커서는 줄 맨 앞). 선택 있는 기존 케이스는 그대로 (FR-001)
- [X] T002 [P] `tests/plugins/plugins.test.ts` — table `"a|b"` → 표 삽입 후 "제목" 선택(FR-002), autolink `"|"` → `"<https://|>"`(FR-003), hard-break `"foo|"` → `"foo  \n|"`, `"[foo]bar"` → `"foo  \n|bar"`(FR-004). `tests/plugins/helpers.test.ts`의 `insertAtSelectionEnd` 예시 문자열도 `"  \n"`으로
- [X] T003 [P] `tests/markdown/` 또는 `tests/plugins/` — 렌더 확인: `renderMarkdown("hello  \n")` = `"<p>hello</p>"`, `renderMarkdown("hello  \nworld")`에 `<br>` 포함 (FR-004)
- [X] T004 [P] `tests/a11y/names.test.tsx` — `EditorScreen` 마크업에 `href="#/dashboard"`이고 이름이 `strings.appName`인 링크가 있음, 토스트 `role="status"` 컨테이너가 없음 (FR-006·FR-007)
- [X] T005 `npm test` 실패 확인 → `TDD-IMPLEMENTS.md`에 `U1-edit-spot`·`U1-hard-break`·`U1-shell` RED 기록

## Phase 2: Implementation

- [X] T006 `src/plugins/helpers.ts` `toggleLinePrefix` — 선택 없음이면 커서 = `max(start, min(start + block.length, s + (block.length − (end − start))))` (FR-001)
- [X] T007 [P] `src/plugins/table.ts` — `insertBlock` 결과의 선택을 `s + TABLE.indexOf("제목")`부터 2글자로 (FR-002)
- [X] T008 [P] `src/plugins/autolink.ts` — 선택 없음이면 `<https://>` 삽입, 커서 `s + "<https://".length` (FR-003)
- [X] T009 [P] `src/plugins/hard-break.ts` — `insertAtSelectionEnd(state, "  \n")`, 주석을 FR-004 근거로 (FR-004)
- [X] T010 `src/components/editor/EditorScreen.tsx` — 토스트 상태를 알림 요청(`ConfirmRequest`)으로 바꾸고 두 번째 `ConfirmDialog`로 렌더. 액션은 `{ label: "확인", kind: "primary", value: "cancel" }` 1개(열릴 때 포커스·Esc 처리 재사용). 제목은 성공 `strings.noticeDone`("완료")·오류 `strings.noticeError`("저장하지 못했습니다" 계열과 구분되는 "오류"). `src/components/editor/Toast.tsx` 삭제, `strings.ts`에 문구 추가 (FR-006)
- [X] T011 `src/components/editor/EditorScreen.tsx` 헤더 — 로고 묶음을 `<a href={formatRoute({ view: "dashboard" })}>`로, 포커스 테두리 클래스 포함 (FR-007)
- [X] T012 `npm test`·`npx tsc --noEmit`·`npm run build` 통과 → GREEN 기록

## Phase 3: Polish

- [X] T013 `specs/003-full-toolbar/spec.md` US1-4, `specs/001-single-screen-editor/spec.md` FR-014에 "007로 대체" 한 줄 주석
- [X] T014 anti-ai-slop 점검, `CLAUDE.md` SDD 매핑에 007 추가
- [ ] T015 수동 검증(편집 위치 6버튼, 강제 줄바꿈 미리보기, 알림 4종 모달, 로고 이동·저장 확인) — 사용자 확인 필요
