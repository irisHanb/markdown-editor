# Implementation Plan: 폴더·문서 저장소와 사이드바 트리 (M3)

**Branch**: `004-folder-storage` (git 작업 브랜치: `feature/init`) | **Date**: 2026-11-12 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-folder-storage/spec.md`

## Summary

문서 저장을 `localStorage` 1칸에서 IndexedDB(`idb`) 폴더·문서 저장소로 옮기고(기존 문서 1회 옮기기),
사이드바에 폴더 > 문서 트리(만들기·접기·열기·이름 바꾸기·삭제·새 문서)를 만듭니다. 저장소 열기
실패 시 메모리 저장소로 대체합니다. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3

**Primary Dependencies**: 추가 `idb` 8.0.4(헌장 스택). 개발 의존성 추가 `fake-indexeddb` 6.2.8(테스트 전용,
research R6). 아이콘은 기존 lucide-react(`FolderPlus`, `ChevronRight`, `ChevronDown`, `FileText`,
`MoreHorizontal`)

**Storage**: IndexedDB `mdeditor` v1 — `folders`·`documents`(`byFolder` 인덱스)·`meta`. 레이아웃 설정은
기존 `localStorage["mdeditor:layout:v1"]` 유지. 기존 `localStorage["mdeditor:v1"]`은 옮기기 후 삭제

**Testing**: Vitest `node` + `fake-indexeddb/auto` — 저장소 계약(두 구현)·bootstrap·이름 규칙. 트리 조작·
확인 창·키보드는 quickstart 수동 검증

**Target Platform / Project Type**: M1·M2와 동일(정적 export 클라이언트 앱)

**Performance Goals**: 폴더 100·문서 1,000개 트리 표시 1초 이하(SC-003), 문서 열기 200ms 이하(SC-004)

**Constraints**: 옮기기 1회·원자성, 폴더 삭제 트랜잭션 1개, 저장하지 않은 변경 손실 경로 0개, 키보드 전부 조작

**Scale/Scope**: 새 모듈 6개(`repository`·`idb-repository`·`memory-repository`·`bootstrap`·`names`·`switch`), 훅 1개
(`useWorkspace`), 컴포넌트 새로 1개(`ConfirmDialog`)·확장 3개(`Sidebar`·`EditorScreen`·`StatusBar`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|------|------|------|
| I. 플러그인 격리 | 툴바·플러그인 변경 없음(열린 문서가 없을 때 `disabled`만 전달) | 통과 |
| II. 안전한 렌더링 | 파이프라인 변경 없음. 폴더·문서 이름은 React 텍스트로만 출력(HTML 삽입 없음) | 통과 |
| III. 명세 정확성 | 해당 없음 | 통과 |
| IV. 테스트 우선 | 이름 규칙·저장소 계약·bootstrap·문서 전환 계획(`switch.ts`) 테스트를 먼저 작성(RED → GREEN). 실제 IndexedDB 동작은 fake-indexeddb로 검증. 화면 훅은 순수 모듈 결과를 실행만 함 | 통과 |
| V. 로컬 우선·서버리스 | 헌장 1.0.2대로 문서 데이터는 폴더 도입 시점에 IndexedDB로 옮기고, 레이아웃 설정은 `localStorage` 유지(UI 설정 허용). 메모리 모드에서는 기존 저장본을 지우지 않음. 서버 없음 | 통과 |
| VI. 디자인·접근성 | 트리 ARIA 패턴·roving tabindex·키보드 전부, 확인 창 첫 포커스 [취소], 그림자·모션 없음, 새 색 대비: danger 6.57:1, 선택 행 4.84:1, 안내 배경 14.3:1 | 통과 |
| 기술 제약 — 의존성 | `idb`는 스택 안. `fake-indexeddb`는 스택 밖 개발 의존성 — 근거 Complexity Tracking | 근거 기록 |

Phase 1 설계 후 재점검: 판정 변경 없음.

## Project Structure

### Documentation (this feature)

```text
specs/004-folder-storage/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/repository.md · contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/lib/workspace/
├── repository.ts          Folder·Doc·Meta·Repository 타입
├── idb-repository.ts      createIdbRepository (idb)
├── memory-repository.ts   createMemoryRepository
├── bootstrap.ts           옮기기·첫 방문 샘플·열 문서 결정
├── names.ts               validateName·nextUntitled·byName·pickNextDocument
└── switch.ts              planSwitch·runSwitch (저장하지 않은 변경 처리 순서, analyze C1)
src/components/
├── workspace/useWorkspace.ts   저장소 상태·동작 훅 (목록, 열린 문서, 확인 창 요청)
├── layout/Sidebar.tsx          [+]·트리·[⋯] 메뉴·이름 입력·키보드
├── editor/ConfirmDialog.tsx    새로
├── editor/EditorScreen.tsx     useWorkspace 연결, key={docId}, 빈 화면, 저장소 사용 불가 안내
└── editor/StatusBar.tsx        경로 표시, disabled
src/content/strings.ts          문구 추가 (contracts/ui.md)
tests/lib/workspace/            names · repository · bootstrap · switch
```

`src/lib/document/session.ts`의 `applySave`·`revert`는 유지하고, `resolveInitial`과 그 테스트는
`bootstrap`이 대체하므로 삭제합니다. `src/lib/storage/local-document.ts`는 옮기기 시 저장본 읽기에만 씁니다.

**Structure Decision**: 저장소 로직은 React 밖 `src/lib/workspace/`에 두어 Vitest로 검증하고, 화면 상태는
`useWorkspace` 훅 1개에 모읍니다(research R5).

### 주요 흐름

| 흐름 | 경로 |
|------|------|
| 시작 | `createIdbRepository()`(실패 → 메모리 + 안내) → `bootstrap(…, { removeLegacy: IndexedDB 사용 시만 true })` → 목록 로드 → 열 문서 `getDocument` → `MarkdownEditor key={id}` |
| 저장 | [저장] → 편집기 본문 → `saveContent` → `applySave` → baseline·알림 |
| 문서 전환 | 트리 클릭 → dirty면 `ConfirmDialog` → `planSwitch(dirty, 선택)` → `runSwitch`(저장 실패 시 중단·알림) → `setMeta("lastDocId")` |
| 폴더 삭제 | Delete/[⋯] → 확인(문서 수) → `deleteFolder` → 열린 문서가 지워졌으면 `pickNextDocument` |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 스택 밖 개발 의존성 `fake-indexeddb` 6.2.8 | 옮기기 원자성·폴더 삭제 시 문서 함께 삭제를 실제 IndexedDB 의미로 테스트(헌장 원칙 IV). 배포 번들 미포함 | 메모리 구현만 테스트 — IndexedDB 트랜잭션·인덱스 동작을 검증하지 못함. 브라우저 E2E — 미설치(사용자 결정 대기) |
