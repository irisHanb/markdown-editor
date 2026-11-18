# Research: 폴더·문서 저장소와 사이드바 트리 (M3)

조사일 2026-11-12. 버전은 같은 날 `npm show <pkg> version` 결과입니다.

## R1. 저장소 — IndexedDB + `idb` 8.0.4

- **Decision**: DB 이름 `mdeditor`, 버전 1. 스토어 3개.
  - `folders` (keyPath `id`)
  - `documents` (keyPath `id`, 인덱스 `byFolder` = `folderId`)
  - `meta` (키-값: `lastDocId`, `legacyImported`)
  - 접근은 `idb` 8.0.4의 Promise 래퍼로 합니다.
- **Rationale**: 헌장 원칙 V("폴더 도입 시 IndexedDB로 옮기기")와 requirement.md §6·§10 결정입니다. `idb`는
  헌장 스택에 있습니다. 폴더 삭제 시 문서 함께 삭제(FR-015)·옮기기(FR-002)를 트랜잭션 1개로 묶어
  중간 실패 시 일부만 지워지는 상태를 막습니다.
- **Alternatives considered**: `localStorage`에 JSON 트리 — 용량 약 5MB 한계, 트랜잭션 없음(requirement.md
  §10에서 기각). IndexedDB 원시 API — 콜백 기반이라 코드가 늘어납니다.
- **Ceiling**: 목록 표시를 위해 문서 전체(본문 포함)를 읽습니다. 문서 1,000개 × 평균 10KB면 약 10MB를
  읽습니다. SC-003(1초)을 넘으면 본문을 별도 스토어로 분리합니다(`ponytail:` 주석).

## R2. 저장소 계층 — 인터페이스 1개, 구현 2개

- **Decision**: `Repository` 인터페이스 1개와 구현 2개를 둡니다.
  - `createIdbRepository()`: 실제 저장
  - `createMemoryRepository()`: 저장소를 열 수 없을 때 쓰는 대체 구현. spec Edge Case "메모리에서만
    동작"입니다.
- **Rationale**: 저장소 열기 실패(비공개 모드 제한 등) 때 화면이 같은 인터페이스로 동작해야 합니다.
  구현이 실제로 2개 필요하므로 인터페이스를 둡니다(구현 1개짜리 추상화가 아님).
- **테스트**: 두 구현에 같은 계약 테스트를 돌립니다. IndexedDB는 테스트 환경(`node`)에 없으므로
  `fake-indexeddb` 6.2.8을 **개발 의존성**으로만 추가합니다(R6).

## R3. 기존 문서 옮기기 (FR-002, FR-003)

- **Decision**: 시작 시 `bootstrap(repo, legacyStorage, sample)` 1회 실행합니다.
  1. `meta.legacyImported`가 있으면 아무 것도 하지 않습니다.
  2. 없고 `localStorage["mdeditor:v1"]`가 있으면, 트랜잭션 1개로 다음 3가지를 처리합니다.
     - "내 문서" 폴더를 만듭니다(같은 이름이 있으면 그 폴더 사용).
     - "제목 없는 문서"에 저장본 본문을 넣습니다.
     - `legacyImported = true`로 표시합니다.
     - 커밋에 성공한 뒤에만 `localStorage.removeItem`을 실행합니다.
  3. 둘 다 없고 폴더가 0개면 "내 문서" + "시작하기"(M1 `SAMPLE`)를 만들고 `legacyImported = true`로
     표시합니다.
- **메모리 저장소 모드**(IndexedDB 열기 실패): `removeLegacy: false`로 실행해 저장본을 메모리에 옮겨
  보여 주기만 하고 `localStorage`에서 지우지 않습니다. 새로고침하면 메모리가 비므로 지우면 기존 문서가
  영구 손실됩니다(analyze U1).
- **Rationale**: 플래그는 IndexedDB 안에 둡니다. 그래서 옮기기 성공 직후 `removeItem`이 실패해도
  다음 열기에서 다시 옮기지 않습니다(SC-001 "문서 수가 늘지 않음"). 트랜잭션이 실패하면 저장본을
  지우지 않습니다(FR-002).

## R4. 문서 전환과 편집기

- **Decision**: `MarkdownEditor`에 `key={docId}`를 줘서 문서마다 편집기를 다시 만듭니다.
- **Rationale**: 실행 취소 기록이 문서 사이에 섞이지 않습니다(다른 문서에서 Mod-z로 이전 문서 내용이
  돌아오는 문제 방지). 1만 자 문서의 편집기 생성은 수십 ms 수준이라 SC-004(200ms)를 넘지 않습니다.
- **저장하지 않은 변경 판정**: 편집기 현재 본문과 baseline(마지막 저장본)을 전환 시점에만 비교합니다.
  키 입력마다 계산하지 않습니다.

## R4a. 문서 전환 결정 — 순수 함수 (analyze C1)

- **Decision**: "저장하지 않은 변경" 처리 순서를 `planSwitch(dirty, choice)`(단계 목록)와
  `runSwitch(steps, actions)`(순서 실행, 저장 실패 시 중단)로 React 밖에 둡니다. `useWorkspace`는 확인 창
  표시와 결과 전달만 합니다.
- **Rationale**: SC-005(변경 손실 경로 0개)는 데이터 손실과 직결됩니다. 헌장 원칙 IV에 따라 이 결정
  로직을 자동 테스트로 고정합니다. 특히 "저장 실패 시 다른 문서를 열지 않음"이 핵심입니다.

## R5. 상태 관리

- **Decision**: 상태 관리 라이브러리를 추가하지 않습니다. `useWorkspace` 훅 1개가 폴더·문서 목록,
  열린 문서, 확인 창 상태를 갖고, `EditorScreen` → `Sidebar`로 props 1단계 전달합니다.
- **Rationale**: 상태를 공유하는 컴포넌트가 2개(사이드바, 편집 영역)이고 전달 깊이가 1단계입니다.
  Zustand(헌장 스택)는 대시보드(M6) 등 공유 지점이 늘 때 도입합니다.

## R6. 개발 의존성 `fake-indexeddb` 6.2.8

- **Decision**: `devDependencies`에만 추가합니다. 테스트 파일에서 `import "fake-indexeddb/auto"`로 전역
  `indexedDB`를 채웁니다.
- **Rationale**: 헌장 원칙 IV(테스트 우선)는 저장 계약을 테스트로 고정하라고 요구합니다. 대상은 옮기기
  원자성과 폴더 삭제 시 문서 함께 삭제입니다. 실제 IndexedDB 동작을 쓰는 테스트는 이 패키지 없이
  `node` 환경에서 돌릴 수 없습니다. 배포 번들에는 들어가지 않습니다.
- **Alternatives considered**: jsdom 환경 — jsdom에도 IndexedDB가 없습니다. 브라우저 E2E — 미설치이며
  사용자 결정 대기 중입니다.

## R7. 트리 접근성

- **Decision**: WAI-ARIA Tree View 패턴을 따릅니다.
  - 요소: `role="tree"` 아래 폴더 `treeitem`(`aria-expanded`, `aria-level=1`)과 문서 `treeitem`(`aria-level=2`).
    열린 문서는 `aria-selected="true"`입니다.
  - 포커스: roving tabindex로 트리 안에서 탭 정지는 1곳만 둡니다.
  - 키(FR-011): ↑↓, →←, Enter, F2, Delete. Home·End는 첫·끝 항목으로 이동합니다.
  - [⋯] 메뉴: `aria-haspopup="menu"` 버튼과 `role="menu"` 목록입니다. ↑↓로 이동하고 Esc로 닫습니다.
- **Rationale**: SC-006(키보드만으로 모든 조작).

## R8. 확인 창

- **Decision**: M2-b `InsertDialog`와 같은 네이티브 `<dialog>` 방식의 `ConfirmDialog` 1개를 둡니다. 버튼
  배열을 props로 받아 "저장하지 않은 변경"(3개)과 "삭제"(2개) 확인에 함께 씁니다. 삭제 버튼은 확인
  창을 열 때 기본 포커스를 받지 않습니다(실수로 Enter 삭제 방지).

## R9. 이름 규칙 — 순수 함수

- **Decision**: `src/lib/workspace/names.ts`에 순수 함수 3개를 둡니다.
  - `validateName(name, siblings)`: 공백 제거, 1–50자, `/`·`\` 금지, 대소문자 무시 중복 금지(Edge Cases)
  - `nextUntitled(siblings)`: "제목 없는 문서" → " 2" → " 3"…(FR-016)
  - `sortByName`: `localeCompare(…, "ko")`
- **열린 문서 삭제 후 다음 문서 선택**(US3 시나리오 2): 같은 폴더의 다른 문서 → 다른 폴더의 첫 문서 →
  없음. 이 규칙은 `pickNextDocument`로 둡니다.
