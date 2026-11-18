# Implementation Plan: 문서 흐름 — 폴더 선택 저장·대시보드·문서 주소 (M6)

**Branch**: `005-document-flow` (git 작업 브랜치: `feature/init`) | **Date**: 2026-11-12 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-document-flow/spec.md`

## Summary

같은 페이지 안에서 URL 해시(`#/doc/<id>`·`#/new`·`#/dashboard`)로 화면을 바꿉니다. 상단 [새 문서]로 저장
전 초안을 만들고, 문서 바(폴더 선택·제목)에서 폴더를 골라 저장합니다(겹치면 "-1"). 저장된 문서는 폴더를
바꿔 옮길 수 있습니다. 대시보드는 모든 문서를 최근 수정순 표로 보여 줍니다. 모든 이동은 `hashchange` 1곳에서
M3 저장 확인을 거칩니다. 의존성 추가 없음. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3

**Primary Dependencies**: 추가 없음. 아이콘 `LayoutList`, `FilePlus`(lucide-react 1.72.0)

**Storage**: IndexedDB `mdeditor` v1 그대로. `Repository.updateDocument` 추가, `saveContent` 대체

**Testing**: Vitest `node` — 주소 해석, 저장 결정(`planSave`·`uniqueTitle`), 시각 표기, 저장소 `updateDocument`.
화면 이동·뒤로 가기·대시보드 조작은 quickstart 수동 검증

**Target Platform / Project Type**: M1–M3과 동일

**Performance Goals**: 문서 1,000개 대시보드 1초 이하(SC-003)

**Constraints**: 정적 export에서 동적 경로 불가 → 해시 주소(FR-017). 앱 안 이동 전부 저장 확인(SC-005)

**Scale/Scope**: 순수 모듈 3개(`route`, `save-plan`, `date`), 훅 1개(`useHashRoute`) 새로, `useWorkspace` 확장, 컴포넌트
새로 2개(`DocumentBar`, `Dashboard`), 수정 2개(`EditorScreen`, `Sidebar`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|------|------|------|
| I. 플러그인 격리 | 툴바·플러그인 변경 없음 | 통과 |
| II. 안전한 렌더링 | 렌더 파이프라인 변경 없음. 제목·폴더 이름은 React 텍스트·`<option>` 텍스트로만 출력 | 통과 |
| III. 명세 정확성 | 해당 없음 | 통과 |
| IV. 테스트 우선 | 주소 해석·저장 결정·시각 표기·`updateDocument` 테스트 먼저(RED → GREEN). 화면 이동 분기는 M3 `switch.ts` 재사용, 저장 분기는 `planSave` — 훅에 분기 로직을 두지 않음 | 통과 |
| V. 로컬 우선·서버리스 | 해시 주소로 서버·동적 경로 없이 동작. 문서 데이터는 IndexedDB 그대로 | 통과 |
| VI. 디자인·접근성 | 버튼·표는 1px border·색 상태만, 대시보드 `<table>`+네이티브 링크, `aria-current`, 폼 `<label>`·`aria-invalid` | 통과 |

Phase 1 설계 후 재점검: 판정 변경 없음. 위반 0건.

## Project Structure

### Documentation (this feature)

```text
specs/005-document-flow/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/modules.md · contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/lib/route/route.ts                 parseRoute·formatRoute·sameRoute
src/lib/workspace/save-plan.ts         uniqueTitle·planSave
src/lib/text/date.ts                   formatDateTime
src/lib/workspace/repository.ts        + updateDocument, − saveContent
src/lib/workspace/idb-repository.ts    updateDocument
src/lib/workspace/memory-repository.ts updateDocument
src/components/workspace/useHashRoute.ts  hashchange 구독, navigate(route, { replace })
src/components/workspace/useWorkspace.ts  Draft, openRoute(route, editor) 가드, saveForm(form, content)
src/components/editor/DocumentBar.tsx  새로
src/components/dashboard/Dashboard.tsx 새로
src/components/editor/EditorScreen.tsx 상단 바 버튼, 화면 분기(doc·new·dashboard·notFound)
src/components/layout/Sidebar.tsx      문서 열기를 #/doc/<id> 이동으로
src/content/strings.ts                 문구 (contracts/ui.md)
tests/lib/route.test.ts · tests/lib/date.test.ts · tests/lib/workspace/save-plan.test.ts
```

**Structure Decision**: 주소·저장 결정은 React 밖 순수 모듈, 화면 이동은 `useHashRoute` + `useWorkspace.openRoute`
1곳. 대시보드는 편집 영역 자리에 렌더해 사이드바·레이아웃을 유지합니다.

### 주요 흐름

| 흐름 | 경로 |
|------|------|
| 이동 | 링크/버튼/뒤로 → 해시 변경 → `hashchange` → `openRoute(route, editorGuard)` → `planSwitch`·`runSwitch` → 열기 또는 `replaceState(이전)` |
| 첫 화면 | 해시 없음 → `bootstrap` 결과 id → `replace #/doc/<id>` (없으면 `#/dashboard`) |
| 초안 저장 | [저장] → `planSave(draft, form, 본문, docs)` → create → `createDocument` → `replace #/doc/<id>` → 알림(접미사면 renamedOnSave) |
| 문서 저장 | [저장] → `planSave(doc, …)` → update → `updateDocument` / error → 문서 바 오류·포커스 |

## Complexity Tracking

위반 0건입니다.
