# Implementation Plan: 단일 화면 마크다운 에디터 (M1)

**Branch**: `001-single-screen-editor` (git 작업 브랜치: `feature/init`) | **Date**: 2026-11-12 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-single-screen-editor/spec.md`

## Summary

Next.js 정적 export 앱 하나에 디자인 시안의 단일 화면을 구현합니다. 편집은 CodeMirror 6, 프리뷰는
unified 파이프라인(sanitize 포함)을 100ms 디바운스로 렌더하고, 문서 1개를 `localStorage`에
저장합니다. 툴바 12버튼은 태그별 순수 함수 플러그인 12개로 만듭니다. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node 24.20.0(빌드), 대상 런타임은 브라우저

**Primary Dependencies**: Next.js 16.4.6(App Router, `output: "export"`), React 19.3.1, Tailwind CSS
4.3.5, CodeMirror 6(`@codemirror/state`·`view`·`commands`·`lang-markdown`), unified 11 + remark/rehype
(`rehype-raw`, `rehype-sanitize` 포함), `lucide-react` 1.72.0, `pretendard` 1.3.9. 버전표는 research R3.

**Storage**: `localStorage["mdeditor:v1"]`, 본문 문자열 1개 (헌장 원칙 V의 M1 예외)

**Testing**: Vitest 5.1.0, `node` 환경. 플러그인·파이프라인·카운트·저장·상태 전이(`session.ts`) 모듈 단위 테스트,
렌더 50ms 예산 테스트. UI·IME·성능은
quickstart 수동 검증.

**Target Platform**: 데스크톱 Chrome·Safari·Firefox·Edge 최근 2개 버전, Vercel 정적 호스팅

**Project Type**: 단일 클라이언트 웹 앱(서버 없음)

**Performance Goals**: 입력 멈춤 → 프리뷰 갱신 ≤ 150ms(디바운스 100ms + 렌더 ≤ 50ms), 1만 자에서 키 입력
처리 ≤ 50ms

**Constraints**: 서버 코드 0줄, 외부 런타임 요청 0건(폰트 포함), sanitize 생략 불가, WCAG AA 대비

**Scale/Scope**: 화면 1개, 문서 1개, 플러그인 12개, 문서 길이 기준 1만 자

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|------|------|------|
| I. 플러그인 격리 | 툴바 12버튼 = `src/plugins/<tag>.ts` 12개, 공통 `MarkdownPlugin`, `apply` 순수 함수, 레지스트리 1줄 등록 (contracts/plugin.md) | 통과 |
| II. 안전한 렌더링 | 헌장 1.0.1 순서(`rehype-raw` → `rehype-sanitize`) 그대로, XSS 견본 10종 테스트 (contracts/render-pipeline.md) | 통과 |
| III. 명세 정확성 | `docs/markdown-editor-spec.md` 예제로 conformance 테스트, GFM 4종 별도 표기 | 통과 |
| IV. 테스트 우선 | 플러그인·파이프라인·카운트·저장·상태 전이(`session.ts`) 모듈을 테스트 먼저 작성, 렌더 50ms 예산 테스트, `TDD-IMPLEMENTS.md` 생성. React 컴포넌트는 순수 모듈을 호출만 하고 분기 로직을 갖지 않으며 quickstart로 수동 검증 | 통과 |
| V. 로컬 우선·서버리스 | `output: "export"`로 서버 코드 차단, `localStorage` 1칸(M1 예외) | 통과 |
| VI. 디자인·접근성 | 시안 위반 9건 교체(research R10), 한글 `aria-label`, 대비 4.5:1 이상 | 통과 |
| 기술 제약 — 스택 | `rehype-raw`, `pretendard`는 헌장 1.0.1 스택에 포함 | 통과 |
| 기술 제약 — TS 5 | 최신 7.0.2 대신 5.9.3 고정 | 통과 |

Phase 1 설계 후 재점검: data-model·contracts가 위 표의 판정을 바꾸지 않습니다. 정당화되지 않은 위반
0건입니다.

## Project Structure

### Documentation (this feature)

```text
specs/001-single-screen-editor/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── plugin.md
│   ├── render-pipeline.md
│   ├── storage.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
next.config.ts                 output: "export"
src/
├── app/
│   ├── layout.tsx             폰트(Pretendard·JetBrains Mono), lang="ko"
│   ├── page.tsx               <EditorScreen />
│   ├── globals.css            Tailwind + 프리뷰 타이포 + 색 토큰
│   └── fonts/                 (pretendard 가변 woff2 경로 참조)
├── components/editor/
│   ├── EditorScreen.tsx       상태 소유: baseline, 디바운스 값, 알림
│   ├── MarkdownEditor.tsx     CM6 생성·파괴, EditorView ref 노출
│   ├── Toolbar.tsx            레지스트리 → 버튼, apply 결과 dispatch
│   ├── Preview.tsx            renderMarkdown 결과 표시
│   ├── StatusBar.tsx          문자 수·줄 수, [취소]·[저장]
│   └── Toast.tsx              role="status" 알림
├── plugins/
│   ├── types.ts  helpers.ts  index.ts
│   └── heading.ts bold.ts italic.ts strikethrough.ts blockquote.ts inline-code.ts
│       code-block.ts link.ts bullet-list.ts ordered-list.ts table.ts horizontal-rule.ts
├── lib/
│   ├── markdown/pipeline.ts   renderMarkdown
│   ├── storage/local-document.ts
│   ├── document/session.ts    resolveInitial, applySave, revert (data-model.md)
│   └── text/count.ts          countChars, countLines, formatCount
└── content/
    ├── sample.ts              시안 SAMPLE_MD
    └── strings.ts             UI 문구 상수

tests/
├── plugins/                   helpers.test.ts + 플러그인 테스트
├── markdown/                  conformance.test.ts, sanitize.test.ts, perf.test.ts
├── lib/                       count.test.ts, local-document.test.ts, session.test.ts
└── fixtures/conformance.ts    명세 예제 (섹션 번호 포함)
```

**Structure Decision**: 단일 Next 앱, `src/` 아래 App Router. 플러그인·파이프라인·저장·카운트는 React
없는 순수 모듈로 `src/plugins`·`src/lib`에 두어 Vitest `node` 환경에서 테스트합니다. 컴포넌트는
`components/editor/` 6개로 한정합니다. 전역 상태 라이브러리는 쓰지 않고 `EditorScreen`이 상태를
소유합니다(화면 1개라 props 전달 깊이가 1단계).

### 주요 흐름

| 흐름 | 경로 |
|------|------|
| 입력 | CM6 `updateListener` → `EditorScreen` 100ms 디바운스 → `renderMarkdown`·`countChars` → `Preview`·`StatusBar` |
| 툴바 | 버튼 → `view.state`에서 `EditorState` 생성 → `plugin.apply` → 문서 전체 교체 트랜잭션 1개 + 선택 범위 → `view.focus()` |
| 저장 | [저장] → `view.state.doc.toString()` → `saveDocument` → `applySave` → baseline·알림 반영 |
| 취소 | [취소] → `revert(baseline)` → 문서 전체 교체 트랜잭션 → 알림 |
| 시작 | `loadDocument` → `resolveInitial(load, SAMPLE)` → CM6 초기 문서·baseline |

툴바 트랜잭션은 문서 전체를 교체합니다. 1만 자에서 한 번의 문자열 교체라 비용이 작습니다. 변경 범위
계산은 실행 취소 단위가 문제가 될 때 도입합니다.

## Complexity Tracking

위반 0건입니다. 최초 plan에서 기록한 `rehype-raw` 단계 추가와 `rehype-raw`·`pretendard` 의존성은
헌장 1.0.1(2026-11-12) 개정으로 원칙 II·기술 제약에 반영돼 해소됐습니다. 근거는 research R5·R9.
