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

## Phase 2b: 코드 블록 아이콘 (FR-008)

- [X] T016 `tests/plugins/plugins.test.ts` — `code-block` 아이콘이 `SquareTerminal`이고 `inline-code` 아이콘과 다름. 실패 확인 → RED 기록
- [X] T017 `src/plugins/code-block.ts` 아이콘을 `SquareTerminal`로, `docs/requirement.md` FR-5 표 아이콘 이름 갱신 → GREEN 기록

## Phase 2c: 코드 블록 아이콘·위치 재수정 (FR-008·FR-009)

- [X] T018 `tests/plugins/plugins.test.ts` — 아이콘 기대값 `Braces`, `ORDER`에서 `code-block`을 `inline-code` 뒤로, 묶음 길이 `[3, 5, 3, 4, 3]`. 실패 확인 → RED 기록
- [X] T019 `src/plugins/code-block.ts` 아이콘 `Braces`, `src/plugins/index.ts` 묶음 배치 변경, `docs/requirement.md`·`docs/markdown-editor-spec.md` 아이콘 이름 갱신 → GREEN 기록

## Phase 2d: 코드 블록 하이라이트 (FR-010, 헌장 1.1.0)

- [X] T020 `tests/markdown/highlight.test.ts` — ```` ```js ```` → `<code class="hljs language-js">`와 `<span class="hljs-keyword">const</span>`; 언어 없는 JS 블록 자동 강조; 인라인 코드 강조 없음; XSS — `<span class="hljs-x" onclick="alert(1)">`의 `onclick` 제거·클래스 유지, `<span class="evil">` 클래스 제거, `<code class="hljs language-js" style="…">`의 `style` 제거, `<pre><code class="language-js"><img src=x onerror=alert(1)></code></pre>`에 `onerror` 없음; 코드 블록 위주 1만 자 렌더 중앙값 ≤ 50ms
- [X] T021 `tests/markdown/conformance.test.ts` 정규화 5번 — 하이라이트 `span` 태그·`hljs` 클래스 제거, 기대값에 클래스 없는 `<code>`면 자동 판별 `language-*`도 제거 (헌장 III)
- [X] T022 `tests/a11y/contrast.test.ts` — `globals.css`의 `.md-preview .hljs-*` 색이 `#1a2030` 대비 ≥ 4.5
- [X] T023 실패 확인 → `U1-highlight` RED 기록
- [X] T024 `npm install -E rehype-highlight@7.0.2`, `src/lib/markdown/pipeline.ts` — `rehypeRaw` 뒤·`rehypeSanitize` 앞에 `rehypeHighlight({ detect: true, subset: [...9개, css 제외] })`, 스키마 `code`·`span` 클래스 확장
- [X] T025 `src/app/globals.css` — `.md-preview .hljs-*` 색(대비 4.5:1 이상), `.claude/rules/anti-ai-slop.md`에 헌장 VI 예외 1줄 → GREEN 기록, 게이트

## Phase 2e: 새 문서 샘플 본문 (FR-011)

- [X] T026 `tests/lib/workspace/draft.test.ts` — `createDraft(1, SAMPLE)`가 `{ kind: "draft", key: 1, title: UNTITLED, folderId: null, content: SAMPLE }`; 샘플 그대로면 `hasUnsavedChanges({ content: SAMPLE, baseline: draft.content, … isDraft: true })` false, 1글자 고치면 true. 실패 확인 → `U1-new-sample` RED
- [X] T027 `src/lib/workspace/draft.ts` — `Draft` 타입(`content` 추가)·`createDraft`. `useWorkspace.ts`의 `Draft` 정의를 이 모듈로 옮기고 `openDraft`가 `createDraft(key, SAMPLE)` 사용, `createDocument`가 `repo.createDocument(folderId, title, SAMPLE)`
- [X] T028 `src/components/editor/EditorScreen.tsx` — 편집기 초기값·baseline·프리뷰를 `current?.content ?? draft?.content ?? ""`로
- [X] T029 게이트 → GREEN 기록

## Phase 2f: 사이드바 줄 버튼 (FR-012, [⋯] 메뉴 제거)

- [X] T030 (1차 — 메뉴 항목 아이콘) 7차 피드백으로 T032·T033이 대체
- [X] T031 (1차 구현) 7차 피드백으로 T033이 대체
- [X] T032 `tests/a11y/names.test.tsx` — `Sidebar` 서버 렌더에 `role="menu"`·`aria-haspopup` 없음; 폴더 줄마다 `aria-label="‘회의’ 새 문서"`·`‘회의’ 이름 바꾸기`·`‘회의’ 삭제` 버튼, 문서 줄마다 이름 바꾸기·삭제 버튼, 각 버튼에 `aria-hidden` svg 1개; 현재 줄(`currentId` 문서) 버튼만 `tabIndex` 0. 실패 확인 → `U1-menu-icons` RED
- [X] T033 `src/components/layout/Sidebar.tsx` — `RowMenu`·`menuFor` 상태·ContextMenu/F10 키 처리 삭제, 줄 버튼 렌더(가시성 = 기존 [⋯] 규칙 + `group-focus-within`), treeitem 오른쪽 여백을 버튼 수에 맞춤 → GREEN 기록

## Phase 3: Polish

- [X] T013 `specs/003-full-toolbar/spec.md` US1-4, `specs/001-single-screen-editor/spec.md` FR-014에 "007로 대체" 한 줄 주석
- [X] T014 anti-ai-slop 점검, `CLAUDE.md` SDD 매핑에 007 추가
- [ ] T015 수동 검증(편집 위치 6버튼, 강제 줄바꿈 미리보기, 알림 4종 모달, 로고 이동·저장 확인) — 사용자 확인 필요
