# Implementation Plan: 툴바 완성 — 18버튼·토글·입력 대화상자·단축키 (M2-b)

**Branch**: `003-full-toolbar` (git 작업 브랜치: `feature/init`) | **Date**: 2026-11-12 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-full-toolbar/spec.md`

## Summary

플러그인 12개를 18개로 늘리고(H1–H3, 이미지, 자동 링크, 작업 목록, 강제 줄바꿈), 토글·활성 판정을
순수 헬퍼로 추가합니다. 링크·이미지는 플러그인 `dialog` 필드 + 네이티브 `<dialog>` 공용 컴포넌트로
입력받습니다. 단축키는 레지스트리에서 CM6 keymap을 만듭니다. 의존성 추가 없음. 근거는
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3

**Primary Dependencies**: 추가 없음. CodeMirror 6(`@codemirror/state`의 `Prec`, `@codemirror/view`의
`keymap`), lucide-react 1.72.0 아이콘(`Heading1–3`, `Image`, `Link2`, `ListChecks`, `WrapText` 추가)

**Storage**: 없음

**Testing**: Vitest 5.1.0 `node` — 헬퍼·플러그인·단축키 표기 순수 함수. 대화상자·키 입력·IME·낭독은
quickstart 수동 검증

**Target Platform / Project Type**: M1과 동일

**Performance Goals**: 커서 이동마다 `isActive` 11개 판정 — 1만 자 문서에서 판정 1ms 미만(현재 줄만 검사)

**Constraints**: 헌장 원칙 I(툴바·편집기 코어는 플러그인 추가 때 불변), 토글 왕복 100%, IME 조합 중
단축키 무동작

**Scale/Scope**: 플러그인 18개(새 파일 8, 수정 4, 삭제 1), 컴포넌트 1개 추가(`InsertDialog`), 수정 3개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|------|------|------|
| I. 플러그인 격리 | 버튼 1개 = 파일 1개(헤딩 3개는 팩토리 + 파일 3개). `MarkdownPlugin`에 선택 필드 `dialog` 추가 — 툴바·실행부는 필드 유무로만 분기, 단축키는 레지스트리에서 생성. 새 플러그인 추가 시 `Toolbar.tsx`·`MarkdownEditor.tsx` 불변 | 통과 |
| II. 안전한 렌더링 | 파이프라인 변경 없음. 대화상자 주소 검사는 하지 않고 sanitize가 위험 주소 제거(spec Assumptions) | 통과 |
| III. 명세 정확성 | 버튼이 넣는 문법은 markdown-editor-spec.md §0 표 기준(번호 목록 증가 포함) | 통과 |
| IV. 테스트 우선 | 헬퍼·플러그인·표기 테스트 먼저(RED → GREEN), M1 테스트 기대값 변경 2종은 tasks에 명시 | 통과 |
| V. 로컬 우선 | 서버·저장 변경 없음 | 통과 |
| VI. 디자인·접근성 | 눌림은 배경·아이콘 색만, 대화상자 그림자·blur·애니메이션 없음, `aria-pressed`, 네이티브 모달 포커스 | 통과 |

Phase 1 설계 후 재점검: 판정 변경 없음. 위반 0건.

## Project Structure

### Documentation (this feature)

```text
specs/003-full-toolbar/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/plugin-api.md · contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/plugins/
├── types.ts               + DialogInit, DialogValues, PluginDialog, MarkdownPlugin.dialog
├── helpers.ts             + toggleInline, isInlineActive, toggleLinePrefix, isLinePrefixActive,
│                            insertAtSelectionEnd, findBracketSyntax, normalizeUrl
├── shortcut.ts            새로 — formatShortcut(shortcut, isMac)
├── heading-factory.ts     새로 — createHeadingPlugin(1|2|3)
├── heading-1.ts heading-2.ts heading-3.ts   새로
├── image.ts autolink.ts task-list.ts hard-break.ts   새로
├── bold.ts italic.ts strikethrough.ts inline-code.ts   수정 — 토글·isActive·shortcut
├── blockquote.ts bullet-list.ts ordered-list.ts        수정 — 토글·isActive·shortcut
├── link.ts                수정 — dialog
├── heading.ts             삭제
└── index.ts               묶음 5개·18개
src/components/editor/
├── Toolbar.tsx            수정 — onRun·activeIds·isMac props, aria-pressed, 툴팁
├── InsertDialog.tsx       새로
├── MarkdownEditor.tsx     수정 — bindings·onSelection props (플러그인 비종속)
└── EditorScreen.tsx       수정 — runPlugin, 대화상자 상태, activeIds, 단축키 바인딩
src/content/strings.ts     + 대화상자 문구 7개
tests/plugins/
├── helpers.test.ts        확장
├── plugins.test.ts        18개 기준으로 교체
└── format-shortcut.test.ts 새로
```

**Structure Decision**: 플러그인 실행(apply 또는 대화상자)은 `EditorScreen`의 `runPlugin` 1곳으로
모읍니다. 툴바 클릭과 단축키가 같은 경로를 씁니다.

### 주요 흐름

| 흐름 | 경로 |
|------|------|
| 버튼·단축키 | `runPlugin(p)` → `p.dialog` 없음: `apply` → 전체 교체 트랜잭션 1개 + 선택 → `view.focus()` |
| 대화상자 | `runPlugin(p)` → `p.dialog.open(state)` → `InsertDialog` 표시 → 제출: `p.dialog.submit` → 트랜잭션 → 닫기·포커스 |
| 활성 표시 | CM6 업데이트(선택·문서 변경) → `onSelection(state)` → `activeIds` → `Toolbar` `aria-pressed` |
| 단축키 | `plugins.filter(shortcut)` → `bindings` → `MarkdownEditor` `Prec.high(keymap.of(...))`, 실행 시 `view.composing`이면 무시 |

## Complexity Tracking

위반 0건입니다.
