# Implementation Plan: 사이드바 2분할 레이아웃·리사이즈 (M2-a)

**Branch**: `002-sidebar-layout` (git 작업 브랜치: `feature/init`) | **Date**: 2026-11-12 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-sidebar-layout/spec.md`

## Summary

M1 단일 화면을 "상단 바 / 사이드바 + 편집 영역" 구조로 바꾸고, 경계 2개(사이드바, 에디터·프리뷰)를
포인터·키보드로 조절합니다. 너비는 `<html>` CSS 변수로 적용하고 `localStorage`에 저장합니다. 의존성은
추가하지 않습니다. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3 (M1과 동일)

**Primary Dependencies**: 추가 없음. Next.js 16.4.6, React 19.3.1, Tailwind CSS 4.3.5 (M1 고정 버전)

**Storage**: `localStorage["mdeditor:layout:v1"]` JSON `{sidebar, editor}` (문서 저장본과 별도 키)

**Testing**: Vitest 5.1.0 `node` 환경 — `tests/lib/layout.test.ts`(범위 제한·키 처리·저장값 해석).
끌기·포커스·보조기술은 quickstart 수동 검증.

**Target Platform**: 데스크톱 브라우저, 정적 export (M1과 동일)

**Project Type**: 단일 클라이언트 웹 앱

**Performance Goals**: 끌기 중 100ms 초과 프레임 0건(SC-001) — 끌기 중 갱신 대상은 CSS 변수와 핸들
`aria-valuenow`뿐

**Constraints**: 사이드바 180–480px, 에디터 30–70%, 에디터·프리뷰 각 최소 240px, M1 동작 불변

**Scale/Scope**: 경계 2개, 새 컴포넌트 2개(`ResizeHandle`, `Sidebar`), 순수 모듈 1개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|------|------|------|
| I. 플러그인 격리 | 툴바 위치만 이동, `Toolbar.tsx`·`src/plugins/` 변경 없음 | 통과 |
| II. 안전한 렌더링 | 렌더 파이프라인 변경 없음 | 통과 |
| III. 명세 정확성 | 해당 없음(렌더 변경 없음) | 통과 |
| IV. 테스트 우선 | `layout.ts` 테스트 먼저(RED → GREEN), M1 테스트 110개 유지 | 통과 |
| V. 로컬 우선·서버리스 | 레이아웃 설정을 브라우저에만 저장, 서버 코드 없음 | 통과 |
| VI. 디자인·접근성 | 경계는 1px 선 + 색 변화만(그라데이션·그림자·모션 없음), `role="separator"` + 값 속성 + 키보드 | 통과 |
| 기술 제약 — 스택 | 스택의 `react-resizable-panels`를 쓰지 않음(추가가 아니라 미사용). 근거 research R1 | 통과 |

Phase 1 설계 후 재점검: 판정 변경 없음. 위반 0건.

## Project Structure

### Documentation (this feature)

```text
specs/002-sidebar-layout/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── layout.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                 + 첫 화면 전 레이아웃 복원 인라인 스크립트, suppressHydrationWarning
│   └── globals.css                + --sidebar-w, --editor-ratio 기본값
├── lib/layout/layout.ts           새로 — clamp, stepByKey, loadLayout, saveLayout, 상수
├── components/
│   ├── layout/
│   │   ├── ResizeHandle.tsx       새로 — separator, 포인터 끌기, 키보드
│   │   └── Sidebar.tsx            새로 — aside + 빈 영역 안내
│   └── editor/EditorScreen.tsx    구조 변경: 상단 바 / 사이드바 + 핸들 + 편집 영역(툴바 행 이동, 에디터 핸들)
└── content/strings.ts             + 문구 5개 (contracts/ui.md)

tests/lib/layout.test.ts           새로
```

**Structure Decision**: 레이아웃 전용 컴포넌트는 `src/components/layout/`에 둡니다. 레이아웃 상태
(`sidebar`, `editor`)는 `EditorScreen`이 소유합니다. M3에서 사이드바 내용이 생기면 `Sidebar.tsx`만
확장합니다.

### 주요 흐름

| 흐름 | 경로 |
|------|------|
| 첫 화면 | 인라인 스크립트가 저장값 → clamp → `<html>` CSS 변수 설정 → React 마운트 후 `loadLayout`으로 state 동기화 |
| 끌기 | `ResizeHandle` pointerdown(capture) → pointermove: `fromPointer` → `clamp` → `onChange`(state + CSS 변수) → pointerup: `onCommit`(`saveLayout`) |
| 키보드 | `ResizeHandle` keydown → `stepByKey` → `onChange` + `onCommit` |

## Complexity Tracking

위반 0건입니다.
