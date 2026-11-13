# Implementation Plan: 마감 — 이탈 경고·접근성 (M7)

**Branch**: `006-polish-a11y` (git 작업 브랜치: `feature/init`) | **Date**: 2026-11-13 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-polish-a11y/spec.md`

## Summary

저장하지 않은 변경 판단을 순수 함수 `hasUnsavedChanges`(본문·폴더·제목) 1곳으로 모으고, M6 앱 안 저장 확인과
새 `beforeunload` 이탈 경고가 같은 함수를 씁니다. 접근성은 빠진 항목만 채웁니다. 앱 안 화면 전환 후 포커스 이동,
건너뛰기 버튼, 편집기 포커스 테두리, `<main>`·이름 있는 영역, 입력 칸 테두리 대비 3:1이 대상입니다.
자동 검사는 서버 렌더 마크업의 접근 가능한 이름 검사와 색 대비 계산입니다. 런타임 의존성 추가 없음.
근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3

**Primary Dependencies**: 런타임 추가 없음. `devDependencies`에 `parse5` 8.1.1 명시(이미 `rehype-raw`를 거쳐 설치됨,
research R9)

**Storage**: 변경 없음 (IndexedDB `mdeditor` v1)

**Testing**: Vitest `node`. `hasUnsavedChanges` 단위 테스트, 컴포넌트 서버 렌더 이름 검사(`*.test.tsx`), 색 대비
계산 테스트. 이탈 확인·포커스 이동·낭독기는 quickstart 수동 검증

**Target Platform / Project Type**: M1–M6과 동일. 데스크톱 브라우저 전용(spec FR-014)

**Performance Goals**: 해당 없음 (`beforeunload` 처리는 문자열 비교 1회)

**Constraints**: 해시 라우터와 충돌하지 않도록 건너뛰기는 링크가 아닌 버튼(research R6). anti-ai-slop — 포커스
테두리는 액센트 단색 outline, 그림자 없음

**Scale/Scope**: 순수 모듈 1개 새로(`dirty.ts`), 컴포넌트 수정 7개(`EditorScreen`, `MarkdownEditor`, `DocumentBar`,
`InsertDialog`, `Sidebar`, `Dashboard`, `StatusBar`), 테스트 3개 새로, `vitest.config.mts` include 1줄

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|------|------|------|
| I. 플러그인 격리 | 플러그인·툴바 동작 변경 없음. `Toolbar`는 이름 검사 대상일 뿐 | 통과 |
| II. 안전한 렌더링 | 렌더 파이프라인 변경 없음 | 통과 |
| III. 명세 정확성 | 해당 없음 | 통과 |
| IV. 테스트 우선 | `hasUnsavedChanges`·이름 검사·대비 검사 테스트 먼저(RED → GREEN). 이름 검사 RED는 영역 이름·건너뛰기 버튼·입력 테두리 등 빠진 항목에서 실패 | 통과 |
| V. 로컬 우선·서버리스 | 서버 없음. 데이터 구조 변경 없음 | 통과 |
| VI. 디자인·접근성 | 본 마일스톤의 목적. 포커스 테두리는 액센트 단색, 대비 4.5:1·3:1, 장식 없음 | 통과 |

Phase 1 설계 후 재점검: 판정 변경 없음. 위반 0건.

## Project Structure

### Documentation (this feature)

```text
specs/006-polish-a11y/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/modules.md · contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/lib/workspace/dirty.ts              hasUnsavedChanges (새로)
src/components/editor/EditorScreen.tsx  isDirty → hasUnsavedChanges, [취소] 폼 되돌림, beforeunload,
                                        화면 전환 포커스, 건너뛰기 버튼, <main>, 편집기 칸 영역 이름
src/components/editor/MarkdownEditor.tsx  .cm-focused outline
src/components/editor/DocumentBar.tsx   <section aria-label>, 입력 테두리 #8a94a6
src/components/editor/InsertDialog.tsx  입력 테두리 #8a94a6
src/components/editor/StatusBar.tsx     <footer> → <section aria-label>
src/components/dashboard/Dashboard.tsx  <h1 tabIndex=-1 ref>
src/components/layout/Sidebar.tsx       이름 바꾸기 칸 outline-none 제거
src/content/strings.ts                  문구 (contracts/ui.md)
src/app/globals.css                     --input-border: #8a94a6, .md-preview li::marker → var(--fg-muted)
tests/lib/workspace/dirty.test.ts       새로
tests/a11y/names.test.tsx               새로 (parse5)
tests/a11y/contrast.test.ts             새로
tests/a11y/accessible-name.ts · contrast.ts  테스트 유틸 (새로)
vitest.config.mts                       include에 tests/**/*.test.tsx
package.json                            devDependencies parse5 8.1.1
```

**Structure Decision**: 판단 로직은 `src/lib/workspace/`의 순수 함수, 화면 동작은 `EditorScreen` 한 곳에서 처리합니다.
접근성 검사 유틸(이름 판정·휘도 계산)은 테스트에서만 쓰므로 `tests/a11y/` 안에 둡니다.

### 주요 흐름

| 흐름 | 경로 |
|------|------|
| 탭 닫기·새로고침 | `beforeunload` → `editorGuard.isDirty()` → `hasUnsavedChanges(...)` → 참이면 `preventDefault()` |
| 앱 안 이동 | M6 그대로 `hashchange` → `openRoute(route, editorGuard)` — 같은 `isDirty` 사용 |
| [취소] | `revert(baseline)` 본문 + `setForm(저장 시점 폴더·제목)` |
| 화면 전환 포커스 | `openRoute` 완료 → 화면 상태 변경 → 효과에서 대상 요소 `focus()` (시작 시 1회 제외) |
| 건너뛰기 | 버튼 → 같은 포커스 함수 |

## Complexity Tracking

위반 0건입니다.
