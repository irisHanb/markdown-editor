---

description: "M1 단일 화면 마크다운 에디터 구현 작업 목록"
---

# Tasks: 단일 화면 마크다운 에디터 (M1)

**Input**: Design documents from `/specs/001-single-screen-editor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함합니다. 헌장 원칙 IV(테스트 우선, NON-NEGOTIABLE)가 플러그인·파이프라인 테스트를 요구합니다.
각 스토리의 테스트 작업은 `/tdd-red`로 작성해 실패를 확인한 뒤 구현 작업(`/tdd-green`)으로 넘어갑니다.

**Organization**: 사용자 스토리별로 묶었습니다. US1(프리뷰) → US2(저장) → US3(툴바) 순서입니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 미완료 작업 의존 없음)
- **[Story]**: US1, US2, US3 = spec.md 사용자 스토리
- 경로는 저장소 루트 기준입니다(plan.md Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Next 앱 골격, 의존성 고정, 테스트 실행 환경

- [X] T001 스캐폴딩: 스크래치 임시 디렉터리에서 `npx -y create-next-app@16.4.6 app --ts --tailwind --app --src-dir --empty --use-npm --import-alias "@/*" --yes --disable-git --skip-install` 실행(대화형 질문 없음). 생성물 중 `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `src/`, `public/`을 저장소 루트로 옮깁니다. `AGENTS.md`는 옮기지 않습니다. `eslint.config.mjs`가 생겼으면 옮기지 않고, `package.json`에서 `eslint*` devDependencies와 `lint` script를 삭제합니다. 기존 `README.md`, `LICENSE`, `CLAUDE.md`, `docs/`, `.claude/`, `.specify/`, `specs/`는 덮어쓰지 않습니다. 생성된 `.gitignore`의 항목 중 루트 `.gitignore`에 없는 줄(`/.next/`, `/out/`, `next-env.d.ts` 등)만 추가합니다 (research R1)
- [X] T002 `jsconfig.json` 삭제 (TRD §1: Next 확정 이전 바닐라 설정 잔재, `tsconfig.json`이 대체)
- [X] T003 `package.json` 의존성을 research R3 버전표대로 정확 버전 고정: `npm i -E next@16.4.6 react@19.3.1 react-dom@19.3.1 @codemirror/state@6.7.6 @codemirror/view@6.43.15 @codemirror/commands@6.11.1 @codemirror/lang-markdown@6.5.2 unified@11.0.5 remark-parse@11.0.0 remark-gfm@4.0.1 remark-rehype@11.1.2 rehype-raw@7.0.0 rehype-sanitize@6.0.0 rehype-stringify@10.0.1 lucide-react@1.72.0 pretendard@1.3.9` 그리고 `npm i -D -E typescript@5.9.3 tailwindcss@4.3.5 vitest@5.1.0`. `idb`, `zustand`, `react-resizable-panels`는 설치하지 않습니다
- [X] T004 `next.config.ts`에 `output: "export"` 설정 (research R2, FR-016)
- [X] T005 [P] `vitest.config.ts` 작성: `environment: "node"`, `include: ["tests/**/*.test.ts"]`, `resolve.alias`로 `@` → `src`. `package.json` scripts에 `"test": "vitest run"`, `"typecheck": "tsc --noEmit"` 추가. `tsconfig.json` `include`에 `tests/**/*.ts` 추가
- [X] T006 [P] 루트에 `TDD-IMPLEMENTS.md` 생성: 마일스톤 표(ID·범위·테스트 파일·상태) — `US1-count`, `US1-pipeline`, `US2-storage`, `US2-session`, `US3-helpers`, `US3-plugins` 6행, 상태는 모두 `TODO` (TRD §7, `.claude/commands/tdd-red.md` 형식)

**Checkpoint**: `npm run build`가 기본 페이지로 `out/index.html`을 만들고, `npm test`가 "No test files found"로 끝납니다

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 세 스토리가 공유하는 화면 골격, CM6 편집기, 문구·샘플·폰트·색 토큰

**⚠️ CRITICAL**: 이 단계가 끝나야 스토리 작업을 시작합니다

- [X] T007 [P] `src/content/strings.ts`에 `export const strings = { … } as const` 정의. 키 12개 — contracts/ui.md "문구" 표 6개(`editorPlaceholder`, `toastSaved`, `toastSaveFailed`, `toastReverted`, `cancel`, `save`) + `appName: "Markdown Editor"`, `editorHeader: "MARKDOWN"`, `previewHeader: "미리보기"`, `editorLabel: "마크다운 입력"`, `previewLabel: "미리보기"`, `toolbarLabel: "서식"`. 다른 작업은 이 키 이름만 참조합니다 (NFR-5)
- [X] T008 [P] `src/content/sample.ts`에 `SAMPLE` 상수 작성: `docs/design/project/Markdown Editor.dc.html` 301–392행 `SAMPLE_MD` 배열을 그대로 옮기고 `"\n"`으로 join (FR-012)
- [X] T009 [P] `src/app/layout.tsx`: `<html lang="ko">`, `next/font/google`의 `JetBrains_Mono`(CSS 변수 `--font-mono`), `next/font/local`로 `node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`(CSS 변수 `--font-sans`; 실제 경로는 설치 후 확인), metadata title `"Markdown Editor"` (research R9)
- [X] T010 [P] `src/app/globals.css`: Tailwind import, `:root` 색 토큰 — 액센트 `#3b5bdb`, 본문 `#1c2434`, 보조 글자 `#6b7385`, 경계 `#eaedf3`·`#eef1f6`, 편집 영역 배경 `#fbfcfe`, 알림 배경 `#1c2434`. 시안 원래 보조색 `#98a1b2`·`#99a2b3`·`#94a3b8`·`#b3bccb`는 쓰지 않습니다 (research R10). `body` 폰트 `var(--font-sans)`
- [X] T011 `src/components/editor/MarkdownEditor.tsx`(`"use client"`): `useEffect`에서 `EditorView` 생성·파괴. 확장은 `history()`, `keymap.of([...defaultKeymap, ...historyKeymap])`, `markdown()`, `EditorView.lineWrapping`, `placeholder(strings.editorPlaceholder)`, `EditorView.contentAttributes.of({ "aria-label": strings.editorLabel })`, `updateListener`(docChanged 시 `onChange(doc: string)` 호출). props `initialDoc`, `onChange`, `viewRef: RefObject<EditorView | null>`. `basicSetup`은 쓰지 않습니다. 글꼴 `var(--font-mono)`, 배경 `#fbfcfe` (research R4)
- [X] T012 `src/components/editor/EditorScreen.tsx`(`"use client"`) 골격: 시안 구조대로 상단 바(26×26 로고 "M" 단색 `#3b5bdb`, radius 7px + 앱 이름) / 본문 좌우 50:50(좌: "MARKDOWN" 헤더 + `MarkdownEditor`, 우: "미리보기" 헤더 + 빈 영역) / 하단 상태바 자리. 높이 `100vh`, 영역 구분은 `1px solid` 경계만. 초기 문서는 `SAMPLE` (depends on T007, T008, T011)
- [X] T013 `src/app/page.tsx`를 `<EditorScreen />`만 렌더하도록 교체하고 create-next-app 기본 마크업·`public/` 기본 SVG 삭제 (depends on T012)

**Checkpoint**: `npm run dev`에서 샘플 문서가 든 편집기와 빈 프리뷰 칸이 시안 배치로 보이고, 한글 입력이 됩니다

---

## Phase 3: User Story 1 - 입력하면서 프리뷰 확인 (Priority: P1) 🎯 MVP

**Goal**: 입력 → 100ms 디바운스 → 정제된 프리뷰 + 상태바 문자 수·줄 수

**Independent Test**: 빈 편집 영역에 제목·목록·표·코드 블록·XSS 견본을 입력해 프리뷰 렌더와 정제, 상태바 숫자를 확인 (quickstart 2절 1–3, 10번)

### Tests for User Story 1 ⚠️ (`/tdd-red US1-count`, `/tdd-red US1-pipeline`)

> 먼저 작성하고 실패를 확인한 뒤 구현합니다

- [X] T014 [P] [US1] `tests/lib/count.test.ts`: `countChars("")`=0, `countChars("한글👍é")`=4(é는 `"e\u0301"`(e + U+0301 결합 부호) 이스케이프로 작성), `countChars("a\nb")`=3(줄바꿈 포함), `countLines("")`=1, `countLines("a\nb\n")`=3, `formatCount(999)`=`"999"`, `formatCount(12345)`=`"12,345"` (FR-008)
- [X] T015 [P] [US1] `tests/fixtures/conformance.ts`: `docs/markdown-editor-spec.md` §3.1–§3.9, §4.1–§4.9, §5.1–§5.3, §7.1–§7.4에서 contracts/render-pipeline.md "fixture 범위"의 두 형식(① **문법**/**HTML 결과물** 코드 블록 쌍, ② 표 안 `` `입력` → `출력` `` 예시)만 `{ section: "3.1", markdown, html, wrapped?: true }[]`로 옮김. 마크다운은 원문 그대로, 문법 코드 블록 안의 `→`는 탭 문자로 바꿉니다. §7.3처럼 조각 HTML은 `<ul>…</ul>`로 감싸고 `wrapped: true` 표시
- [X] T016 [US1] `tests/markdown/conformance.test.ts`: T015 배열을 `it.each`로 `renderMarkdown` 출력과 비교. 비교 전 정규화는 contracts/render-pipeline.md "알려진 차이" 4가지(`user-content-` 접두사 제거, 공백 연속 1칸·태그 앞뒤 공백 제거, `contains-task-list`·`task-list-item` class 제거, void 태그 ` /` 제거)만 적용 (SC-002, depends on T015)
- [X] T017 [P] [US1] `tests/markdown/sanitize.test.ts`: XSS 견본 10종 — `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `<a href="javascript:alert(1)">x</a>`, `[x](javascript:alert(1))`, `<svg onload=alert(1)>`, `<iframe src="https://example.com">`, `<style>body{display:none}</style>`, `<object data="x">`, `<div onclick="alert(1)">x</div>`, `<a href="JaVaScRiPt:alert(1)">x</a>`. 각 출력에 `/<script/i`, `/\son[a-z]+=/i`, `/javascript:/i`, `/<iframe|<style|<object/i` 미포함 단언. 추가로 `<kbd>Ctrl</kbd>` → `<kbd>Ctrl</kbd>` 유지, `<details><summary>a</summary>b</details>` 태그 유지, `""` → `""` (SC-004, FR-007, Clarification Q2)
- [X] T018 [P] [US1] `tests/markdown/perf.test.ts`: `SAMPLE`(src/content/sample.ts)을 반복해 1만 자 이상 문자열을 만들고 `renderMarkdown`을 1회 예열 후 5회 실행, `performance.now()` 측정 중앙값이 50ms 이하임을 단언 (SC-001 렌더 예산, contracts/render-pipeline.md 테스트 구성)
- [X] T019 [US1] `npm test`로 T014·T016·T017·T018이 "모듈 없음"으로 실패하는지 확인하고 `TDD-IMPLEMENTS.md`의 `US1-count`·`US1-pipeline`을 `RED`로 갱신

### Implementation for User Story 1

- [X] T020 [P] [US1] `src/lib/text/count.ts`: `countChars`는 모듈 수준 `new Intl.Segmenter("ko", { granularity: "grapheme" })` 1개로 segment 수 계산, `countLines` = `split("\n").length`, `formatCount` = `toLocaleString("ko-KR")` (research R7, T014 통과)
- [X] T021 [P] [US1] `src/lib/markdown/pipeline.ts`: `renderMarkdown(markdown: string): string`. 모듈 로드 시 프로세서 1회 생성 — `unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSanitize, defaultSchema).use(rehypeStringify)`. `processSync` 결과를 `String()`으로 반환, 예외 시 `""`. 순서 변경 금지 — `rehypeRaw`는 반드시 `rehypeSanitize` 앞 (contracts/render-pipeline.md, T016·T017·T018 통과)
- [X] T022 [P] [US1] `src/components/editor/Preview.tsx`: props `html: string`, `<div className="md-preview" aria-label={strings.previewLabel} dangerouslySetInnerHTML={{ __html: html }} />`. `aria-live` 넣지 않음 (contracts/ui.md). `html`은 `renderMarkdown` 출력만 받습니다(원칙 II)
- [X] T023 [P] [US1] `src/app/globals.css`에 `.md-preview` 타이포 추가: 시안 20–43행 값을 옮기되 research R10 변경 적용 — `pre`·표 radius 8px, 인용 radius 0, 표 링 그림자 → `border: 1px solid #e6eaf2`, `del` 색 `#6b7385`, 링크 `transition`은 `color, border-color` 150ms 이하. `code`·`pre` 글꼴 `var(--font-mono)`
- [X] T024 [P] [US1] `src/components/editor/StatusBar.tsx` 왼쪽 영역: props `charCount: number`, `lineCount: number` → `{formatCount(n)}자 | {formatCount(n)}줄`, 글자색 `#6b7385`, 12.5px. 오른쪽 버튼 자리는 `children`으로 받음
- [X] T025 [US1] `src/components/editor/EditorScreen.tsx` 연결: `MarkdownEditor.onChange` → 100ms `setTimeout` 디바운스(재입력 시 `clearTimeout`) → `renderMarkdown`·`countChars`·`countLines` 결과를 state에 저장 → `Preview`·`StatusBar`에 전달. 첫 렌더는 초기 문서로 즉시 계산. 언마운트 시 타이머 정리 (research R6, FR-004, depends on T020–T024)
- [X] T026 [US1] `npm test` 전부 통과 확인 후 `TDD-IMPLEMENTS.md`의 `US1-count`·`US1-pipeline`을 `GREEN`으로 갱신

**Checkpoint**: 입력하면 150ms 안에 프리뷰가 바뀌고, XSS 견본이 실행되지 않으며, 상태바 숫자가 맞습니다. 저장·툴바 없이도 MVP로 쓸 수 있습니다

---

## Phase 4: User Story 2 - 저장하고 다시 열기 (Priority: P2)

**Goal**: [저장]·[취소]·재방문 복원과 성공·실패·되돌림 알림

**Independent Test**: 수정 → 저장 → 새로고침 → 수정본 유지, 재수정 → 취소 → 저장본 복원, 저장 차단 시 실패 알림 (quickstart 2절 4–6번)

### Tests for User Story 2 ⚠️ (`/tdd-red US2-storage`, `/tdd-red US2-session`)

- [X] T027 [P] [US2] `tests/lib/local-document.test.ts`: `Map` 기반 가짜 `Storage`로 contracts/storage.md 규칙 표 5행 검증 — 키 없음 → `{ ok: true, content: null }`, 값 `""` → `{ ok: true, content: "" }`, `getItem`이 throw → `{ ok: false }`, `setItem` 성공 → `{ ok: true }` + 키 `"mdeditor:v1"`에 본문 저장, `setItem`이 `DOMException("x", "QuotaExceededError")` throw → `{ ok: false }` + 기존 값 유지. 두 함수가 예외를 던지지 않음도 단언
- [X] T028 [P] [US2] `tests/lib/session.test.ts`: data-model.md "상태 전이 모듈" 표 7행을 그대로 단언 — `resolveInitial` 4케이스(저장본, `""`, `null`, `{ ok: false }` → 각각 `"저장본"`, `""`, sample, sample을 `doc`·`baseline` 모두에), `applySave` 2케이스(`{ ok: true }` → `baseline = doc`·`toastSaved`·success, `{ ok: false }` → `baseline` 유지·`toastSaveFailed`·error), `revert` 1케이스. 입력 문자열 불변 단언
- [X] T029 [US2] `npm test`로 T027·T028 실패 확인 후 `TDD-IMPLEMENTS.md` `US2-storage`·`US2-session` → `RED`

### Implementation for User Story 2

- [X] T030 [P] [US2] `src/lib/storage/local-document.ts`: `STORAGE_KEY = "mdeditor:v1"`, `loadDocument(storage)`, `saveDocument(storage, content)` — contracts/storage.md 시그니처 그대로, 내부 `try/catch`로 예외를 결과 객체로 변환. 값은 "본문 문자열 그대로(JSON 아님)" (data-model.md, T027 통과)
- [X] T031 [P] [US2] `src/lib/document/session.ts`: `ToastKey`, `resolveInitial(load, sample)`, `applySave(result, doc, baseline)`, `revert(baseline)` — data-model.md 시그니처 그대로, React·`localStorage` import 금지. `LoadResult`·`SaveResult` 타입은 `src/lib/storage/local-document.ts`에서 import (T028 통과)
- [X] T032 [P] [US2] `src/components/editor/Toast.tsx`: props `message: string | null`, `kind: "success" | "error"`. `role="status"`, `aria-live="polite"` 컨테이너는 항상 렌더하고 내용만 바꿉니다. 하단 중앙 고정 — `position: fixed; bottom: 30px; left: 0; right: 0; margin-inline: auto; width: fit-content`(`transform` 사용 금지), 배경 `#1c2434`, radius 8px, 그림자·애니메이션 없음. 아이콘은 `lucide-react` `Check`(success) / `AlertTriangle`(error), 색은 아이콘에만 (contracts/ui.md, research R10)
- [X] T033 [US2] `src/components/editor/StatusBar.tsx` 오른쪽 버튼: [취소](흰 배경, `1px solid #dfe4ec`, 글자 `#5a6577`), [저장](배경 `#3b5bdb`, 흰 글자). 둘 다 `type="button"`, 높이 38px, radius 8px, 문구는 `strings.cancel`·`strings.save`. props `onCancel`, `onSave`
- [X] T034 [US2] `src/components/editor/EditorScreen.tsx` 저장 흐름 연결 (data-model.md 상태 전이): 마운트 시 `loadDocument(window.localStorage)`(`window.localStorage` 참조 예외는 `{ ok: false }`로 취급) → `resolveInitial(load, SAMPLE)` 결과를 초기 문서와 `baseline`(ref)으로 설정. `MarkdownEditor`는 로드 완료 후 마운트. [저장] → `viewRef.current.state.doc.toString()`을 `saveDocument`에 전달(디바운스 값 사용 금지, research R8) → `applySave` 결과의 `baseline`·`toast`·`kind`를 그대로 반영. [취소] → `revert(baseline)` 결과 `doc`으로 문서 전체 교체 트랜잭션 dispatch + 알림. 컴포넌트 안에 저장 결과 분기(`if ok`)를 두지 않습니다(분기는 `session.ts`). 알림은 1,900ms 후 사라지고 새 알림이 오면 타이머 재시작 (depends on T030, T031, T032, T033)
- [X] T035 [US2] `npm test` 통과 확인 후 `TDD-IMPLEMENTS.md` `US2-storage`·`US2-session` → `GREEN`

**Checkpoint**: quickstart 2절 4–6번이 통과합니다. US1 동작은 그대로입니다

---

## Phase 5: User Story 3 - 툴바로 서식 적용 (Priority: P3)

**Goal**: 툴바 12버튼 = 플러그인 12개, 키보드 조작·한글 접근 이름

**Independent Test**: 12버튼을 선택 있음/없음에서 각각 눌러 contracts/plugin.md 표와 비교, Tab 이동·VoiceOver 낭독 확인 (quickstart 2절 7–8번)

### Tests for User Story 3 ⚠️ (`/tdd-red US3-helpers`, `/tdd-red US3-plugins`)

- [X] T036 [P] [US3] `tests/plugins/helpers.test.ts`: `wrapSelection` — 선택 있음(`a[강조]b` → `a**[강조]**b`), 선택 없음(placeholder 삽입 후 선택); `prefixLines` — 단일 줄 커서(`ab|c` + `"## "` → `[## abc]`), 여러 줄 선택(`[x\ny]` + `"- "` → `[- x\n- y]`), 선택이 줄 중간에서 시작해도 줄 전체 처리; `insertBlock` — 선택 교체 후 커서가 삽입 끝. 모든 출력이 `0 ≤ start ≤ end ≤ doc.length`이고 입력 객체 불변임을 단언 (contracts/plugin.md 헬퍼 표·규칙)
- [X] T037 [P] [US3] `tests/plugins/plugins.test.ts`: `pluginGroups`가 길이 4인 묶음 3개, `plugins`(= `pluginGroups.flat()`) 길이 12, `id` 순서가 contracts/plugin.md 표 순서와 일치, 모든 `label`이 한글 비어있지 않음. 플러그인별 `it.each`로 선택 있음/없음 2케이스씩 24케이스 — 기대값은 contracts/plugin.md "M1 플러그인 12개" 표(placeholder 문구 포함)와 "테스트 기대 예시" 표. `link`는 `[문서]` → 결과 선택이 `https://` 8글자 범위
- [X] T038 [US3] `npm test`로 T036·T037 실패 확인 후 `TDD-IMPLEMENTS.md` `US3-helpers`·`US3-plugins` → `RED`

### Implementation for User Story 3

- [X] T039 [US3] `src/plugins/types.ts`: contracts/plugin.md 인터페이스 그대로(`EditorState`, `EditorChange`, `PluginGroup`, `MarkdownPlugin`)
- [X] T040 [US3] `src/plugins/helpers.ts`: `wrapSelection(state, before, after, placeholder)`, `prefixLines(state, prefix)`, `insertBlock(state, text)` — 순수 함수, React·CM6 import 금지 (T036 통과, depends on T039)
- [X] T041 [P] [US3] `src/plugins/heading.ts`(`prefixLines("## ")`, 아이콘 `Heading`), `src/plugins/blockquote.ts`(`"> "`, `Quote`), `src/plugins/bullet-list.ts`(`"- "`, `List`), `src/plugins/ordered-list.ts`(`"1. "`, `ListOrdered`) — 각 파일 1개 = 플러그인 1개, `id`·`label`·`group`은 contracts/plugin.md 표 그대로 (depends on T040)
- [X] T042 [P] [US3] `src/plugins/bold.ts`(`"**"`, "굵은 텍스트", `Bold`), `src/plugins/italic.ts`(`"*"`, "기울임 텍스트", `Italic`), `src/plugins/strikethrough.ts`(`"~~"`, "취소선 텍스트", `Strikethrough`), `src/plugins/inline-code.ts`(`` "`" ``, "코드", `Code`), `src/plugins/code-block.ts`(``"\n```\n"`` 양쪽, "코드", `SquareCode`) (depends on T040)
- [X] T043 [P] [US3] `src/plugins/link.ts`(`[선택 또는 "링크 텍스트"](https://)` 삽입, 결과 선택 = `https://` 범위, `Link`), `src/plugins/table.ts`(`insertBlock("\n| 제목 | 설명 |\n|---|---|\n| 내용1 | 내용2 |\n")`, `Table`), `src/plugins/horizontal-rule.ts`(`insertBlock("\n\n---\n\n")`, `Minus`) (depends on T040)
- [X] T044 [US3] `src/plugins/index.ts`: `export const pluginGroups: MarkdownPlugin[][]` — 묶음 3개를 contracts/plugin.md 순서로 등록([heading, bold, italic, strikethrough], [blockquote, inlineCode, codeBlock, link], [bulletList, orderedList, table, horizontalRule]), `export const plugins = pluginGroups.flat()`. 인덱스 상수 없음 (T037 통과, depends on T041–T043)
- [X] T045 [US3] `src/components/editor/Toolbar.tsx`: `role="toolbar"`, `aria-label={strings.toolbarLabel}`. `pluginGroups`를 순회해 묶음마다 34×34px `type="button"` 버튼 렌더 — `aria-label`·`title` = `label`, 아이콘 크기 18px, hover는 배경색만 변경(transform 금지). 묶음 경계마다 1×20px `#e7ebf2` 구분선(`aria-hidden`). 클릭 시 `viewRef.current.state`에서 `{ doc, selectionStart: main.from, selectionEnd: main.to }` 생성 → `apply` → `view.dispatch({ changes: { from: 0, to: doc.length, insert: next.doc }, selection: { anchor: next.selectionStart, head: next.selectionEnd } })` → `view.focus()` (contracts/ui.md 툴바 동작, plan 주요 흐름)
- [X] T046 [US3] `src/components/editor/EditorScreen.tsx` 상단 바 앱 이름 오른쪽에 `<Toolbar viewRef={viewRef} />` 배치 (depends on T045)
- [X] T047 [US3] `npm test` 통과 확인 후 `TDD-IMPLEMENTS.md` `US3-helpers`·`US3-plugins` → `GREEN`

**Checkpoint**: 세 스토리가 모두 동작합니다. 툴바 실행 1회는 `Mod-z` 1회로 되돌아갑니다

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T048 `/tdd-refactor`로 `src/plugins/`·`src/lib/`의 중복과 하드코딩 정리(행위 불변, `npm test` 유지)
- [X] T049 품질 게이트 실행: `npm test`(실패 0건), `npx tsc --noEmit`(오류 0건), `npm run build`(`out/index.html` 생성) — 결과를 `TDD-IMPLEMENTS.md` 하단에 기록
- [X] T050 `.claude/rules/anti-ai-slop.md` 자가 점검: `grep -rnE "gradient|backdrop-filter|@keyframes|translate|scale\(|animate-" src/` 결과 0건(위치 지정에도 transform을 쓰지 않으므로 예외 없음), `box-shadow`는 `0 1px 2px rgba(0,0,0,.06)` 외 0건, `border-radius` 8px 초과 0건(로고 7px 허용)
- [ ] T051 quickstart.md 2절 수동 검증 11항목을 `python3 -m http.server 3000 -d out`에서 실행하고 결과(통과/실패, 10번은 측정값)를 `specs/001-single-screen-editor/quickstart.md` 하단 "검증 기록"에 추가
- [ ] T052 Vercel 연결·배포 후 배포 URL에서 quickstart 2절 1·4번 재확인 (quickstart 3절) — 외부 배포이므로 실행 전 사용자 확인 필요
- [X] T053 `CLAUDE.md` "프로젝트 상태" 절과 마일스톤 표를 실제 상태로 수정: 존재하지 않는 `specs/002`–`007`·"Vitest 88/88" 문구 삭제, M1 상태와 테스트 수를 T049 결과로 기입

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음. T001 → T002·T003 → T004, T005·T006은 T001 이후 병렬
- **Foundational (Phase 2)**: Setup 완료 후. T007–T010 병렬 → T011 → T012 → T013
- **US1 (Phase 3)**: Foundational 완료 후
- **US2 (Phase 4)**: Foundational 완료 후. `StatusBar.tsx`(T024)와 `EditorScreen.tsx`(T025)를 수정하므로 US1 뒤에 진행
- **US3 (Phase 5)**: Foundational 완료 후. 순수 모듈(T036–T044)은 US1·US2와 병렬 가능, `EditorScreen.tsx` 수정(T046)은 US2 뒤
- **Polish (Phase 6)**: 세 스토리 완료 후

### User Story Dependencies

| 스토리 | 다른 스토리 의존 | 공유 파일 |
|--------|-----------------|----------|
| US1 | 없음 | `EditorScreen.tsx`, `StatusBar.tsx`, `globals.css` |
| US2 | 없음(기능), 파일 충돌 회피로 US1 뒤 | `EditorScreen.tsx`, `StatusBar.tsx` |
| US3 | 없음(기능) | `EditorScreen.tsx` |

### Within Each User Story

- 테스트 작성 → `npm test` 실패 확인(RED) → 구현(GREEN) → `TDD-IMPLEMENTS.md` 갱신
- 순수 모듈 → 컴포넌트 → `EditorScreen` 연결

---

## Parallel Example: User Story 1

```bash
# 테스트 3개 동시 작성 (서로 다른 파일)
Task: "T014 tests/lib/count.test.ts"
Task: "T015 tests/fixtures/conformance.ts"
Task: "T017 tests/markdown/sanitize.test.ts"
Task: "T018 tests/markdown/perf.test.ts"

# RED 확인 후 구현 4개 동시 진행
Task: "T020 src/lib/text/count.ts"
Task: "T021 src/lib/markdown/pipeline.ts"
Task: "T022 src/components/editor/Preview.tsx"
Task: "T023 src/app/globals.css .md-preview"
```

## Parallel Example: User Story 3

```bash
# 헬퍼 완료(T040) 후 플러그인 파일 12개를 3묶음으로 동시 작성
Task: "T041 heading·blockquote·bullet-list·ordered-list"
Task: "T042 bold·italic·strikethrough·inline-code·code-block"
Task: "T043 link·table·horizontal-rule"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → quickstart 2절 1–3, 10번 확인
3. 여기서 멈추면 "입력 + 정확한 프리뷰" 도구로 배포 가능

### Incremental Delivery

1. Setup + Foundational → 편집기만 있는 화면
2. + US1 → 실시간 프리뷰 (MVP)
3. + US2 → 저장·재방문
4. + US3 → 툴바, 디자인 시안과 같은 단일 화면 완성
5. Polish → 품질 게이트·수동 검증·배포

---

## Notes

- [P] = 다른 파일, 미완료 작업 의존 없음
- 커밋은 작업 1개 또는 논리 묶음 단위, 메시지는 한국어 합쇼체
- 각 Checkpoint에서 해당 스토리를 단독으로 검증합니다
- 플러그인 추가·수정 시 에디터 코어(`MarkdownEditor.tsx`)와 `Toolbar.tsx`는 수정하지 않습니다(원칙 I)
