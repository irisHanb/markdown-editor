# Research: 마감 — 이탈 경고·접근성 (M7)

조사 기준일 2026-11-13. 현재 코드(`feature/init`, 커밋 `c7842f9`)를 직접 읽고 판단했습니다.

## 현재 상태 조사

| 항목 | 현재 코드 | 판정 |
|------|-----------|------|
| 툴바 버튼 이름·눌림 | `Toolbar.tsx:31` `aria-label`, `aria-pressed` | 충족 |
| 사이드바 트리 | `Sidebar.tsx:311` `role="treeitem"`·`aria-expanded`·`aria-selected`·로빙 `tabIndex` | 충족 |
| 알림 | `Toast.tsx:11` `role="status"`·`aria-live="polite"` 상시 렌더 | 충족 |
| 입력 오류 | `DocumentBar.tsx:62` `role="alert"`, `aria-invalid`·`aria-describedby` | 충족 |
| 대화상자 | 네이티브 `<dialog>` `showModal()` — 포커스 가두기·Esc 닫기는 브라우저 기본 | 충족. 닫은 뒤 포커스 복귀는 R5 |
| 이탈 경고 | `beforeunload` 처리 없음 | **없음** (US1) |
| 저장 확인 기준 | `EditorScreen.tsx:184` `isDirty`가 본문만 비교. 폴더·제목 변경은 무시 | **FR-002 미충족** |
| [취소] | `EditorScreen.tsx:230` 본문만 되돌림 | **FR-002 미충족** |
| 편집기 포커스 표시 | `MarkdownEditor.tsx:14` `"&.cm-focused": { outline: "none" }` | **FR-008 미충족** |
| 화면 전환 포커스 | 새 문서만 편집기로 이동(`EditorScreen.tsx:127`). 문서·대시보드·없는 문서는 없음 | **FR-005 미충족** |
| 건너뛰기 링크 | 없음 | **FR-007 미충족** |
| 영역 이름 | `header`·`nav`·`aside`·`section(contentLabel)`·`role="toolbar"`·프리뷰 `aria-label`. 편집 영역은 `<section>`, 문서 바·상태 표시줄은 이름 없음 | **FR-010 일부** |
| 입력 칸 테두리 대비 | `#dfe4ec`/흰색 = 1.28:1 (7곳) | **FR-013 미충족** (3:1 필요) |
| 사이드바 이름 바꾸기 칸 | `Sidebar.tsx:83` `outline-none` (테두리는 액센트 5.67:1) | FR-008 문구 위반 |

## R1. 이탈 경고 — `beforeunload`

- **Decision**: `EditorScreen`에 `beforeunload` 리스너 1개를 마운트 시 등록합니다. 이벤트 때 `editorGuard.isDirty()`가
  참이면 `event.preventDefault()`를 호출하고 `event.returnValue = ""`를 넣습니다.
- **Rationale**: 브라우저는 사용자 지정 문구를 보여 주지 않고 기본 확인만 띄웁니다. `preventDefault()`가 표준이고,
  `returnValue` 대입은 구형 Chrome·Safari 호환용입니다. 해시 변경(앱 안 이동)은 문서를 내리지 않으므로
  `beforeunload`가 발생하지 않습니다 — FR-003은 추가 코드 없이 충족합니다. 대시보드 링크 가운데 클릭(새 탭)도
  현재 탭을 내리지 않습니다.
- **Alternatives considered**: 변경이 있을 때만 등록·해제 — 리스너 수명 관리 코드가 늘고, 최신 Chrome은
  `beforeunload` 리스너가 있어도 bfcache를 막지 않아 이득이 없습니다(`unload`만 막음). 자동 저장 — 범위 밖(spec
  Assumptions).

## R2. "저장하지 않은 변경" 판단 — 순수 함수 1개

- **Decision**: `src/lib/workspace/dirty.ts`에 `hasUnsavedChanges(input)`를 둡니다.

  변경 있음 = `content !== baseline` ∨ `form.title !== saved.title` ∨ (저장된 문서 ∧ `form.folderId !== saved.folderId`).
  초안의 `saved`는 초안을 연 시점 값(`title: "제목 없는 문서"`, `folderId: null`)입니다. 세부는 [data-model.md](./data-model.md).

  `editorGuard.isDirty`가 이 함수를 쓰고, M6 저장 확인과 R1 이탈 경고가 같은 `editorGuard`를 씁니다.
  [취소]는 본문과 함께 `form`을 `saved`로 되돌립니다.
- **Rationale**: 헌장 원칙 IV — 분기 로직은 React 밖 순수 함수로 테스트합니다. 기준을 한 곳에 두면 앱 안
  확인과 탭 닫기 확인이 어긋나지 않습니다(FR-002).
- **Alternatives considered**: `isDirty`에 조건을 인라인으로 추가 — 테스트할 수 없어 원칙 IV 위반.
- **영향**: M6 앱 안 저장 확인이 제목·폴더만 바꾼 경우에도 뜨게 됩니다. M6 FR-015("저장하지 않은 변경")의
  본래 뜻에 맞는 수정입니다.

## R3. 편집기 Tab — 현재 동작 유지

- **Decision**: `indentWithTab`을 추가하지 않습니다. 지금처럼 Tab·Shift+Tab이 편집기 밖으로 포커스를 옮깁니다.
- **Rationale**: CodeMirror 6 `defaultKeymap`은 Tab을 바인딩하지 않습니다. `MarkdownEditor.tsx:58`도 Tab을 바인딩하지
  않으므로 브라우저 기본 포커스 이동이 동작합니다. 이것이 CodeMirror 문서가 권하는 접근성 기본값이고 WCAG 2.1.2
  (키보드 트랩 없음)를 추가 코드 없이 만족합니다. 그래서 spec FR-006을 "Esc 다음 Tab" 방식에서 이 동작으로 고쳤습니다.
- **Alternatives considered**: `indentWithTab` + Esc 탈출 — 키보드 사용자가 탈출 방법을 알아야 하고, 마크다운 들여쓰기는
  목록 버튼·공백으로 충분합니다.

## R4. 포커스 표시

- **Decision**:
  - 편집기: `"&.cm-focused": { outline: "2px solid var(--accent)", outlineOffset: "-2px" }`.
  - 사이드바 이름 바꾸기 칸: `outline-none`을 다른 칸과 같은 `focus-visible:outline-2 … outline-[var(--accent)]`로 바꿉니다.
  - 그 밖의 버튼·링크·입력 칸은 이미 `focus-visible:outline-[var(--accent)]`를 씁니다. 빠진 요소는 구현 중 grep으로 찾습니다.
- **Rationale**: 편집기는 `contenteditable`이라 포커스가 있을 때 테두리가 계속 보입니다. 안쪽 2px라 레이아웃이
  바뀌지 않습니다. 액센트/편집기 배경 대비 5.5:1로 비텍스트 3:1을 넘습니다.
- **Alternatives considered**: 커서(caret)만으로 포커스 표시 — 커서가 깜빡이는 동안 위치를 놓치기 쉽고 FR-008 문구와 다릅니다.

## R5. 포커스 이동 (화면 전환·대화상자)

- **Decision**:

  | 계기 | 포커스 대상 | 방법 |
  |------|-------------|------|
  | 앱 안 이동으로 문서·새 문서 열림 | 편집기 | `editorKey` 효과에서 `viewRef.current.focus()` (지금 새 문서만 하던 것을 문서까지 확대) |
  | 대시보드 | 대시보드 `<h1 tabIndex={-1}>` | `ref.focus()` |
  | 없는 문서 | 안내 문구 `<p tabIndex={-1}>` | `ref.focus()` |
  | 앱 시작(첫 `openRoute`) | 옮기지 않음 | 시작 여부 플래그(`startedRef`)로 구분 |
  | `InsertDialog` 닫기 | 편집기 | 이미 `closeDialog`가 `view.focus()` |
  | `ConfirmDialog` 닫기 | 대화상자를 연 요소 | 네이티브 `<dialog>.close()`가 `showModal()` 직전 포커스로 되돌림. 계속 진행해 화면이 바뀌면 위 표 규칙이 우선 |

- **Rationale**: 화면 전환 후 포커스가 `<body>`에 남으면 키보드 사용자는 Tab을 처음부터 다시 눌러야 합니다.
  `tabIndex={-1}`은 탭 순서에 끼지 않고 스크립트 포커스만 받습니다. 시작 시에는 건너뛰기 링크(R6)가 첫 Tab을 받도록 포커스를
  옮기지 않습니다.
- **Alternatives considered**: 화면마다 `autoFocus` — 시작과 이동을 구분할 수 없습니다.

## R6. 건너뛰기 링크

- **Decision**: `<header>` 앞에 `<button>` "본문으로 건너뛰기"를 둡니다. `sr-only focus:not-sr-only`로 포커스를 받을 때만
  보입니다. 누르면 편집 화면은 편집기, 대시보드는 `<h1>`, 없는 문서는 안내 문구로 포커스를 옮깁니다(R5와 같은 함수).
- **Rationale**: `<a href="#main">`은 해시를 바꿔 M6 해시 라우터가 `#main`을 주소로 해석합니다(→ 홈 이동). 그래서 링크 대신
  버튼으로 포커스만 옮깁니다. 보이는 위치는 좌상단, 1px border·흰 배경(그림자 없음).
- **Alternatives considered**: `href="#main"` + 라우터 예외 — 라우터에 특수 경로가 생깁니다.

## R7. 영역 이름 (랜드마크)

- **Decision**:

  | 영역 | 요소 |
  |------|------|
  | 상단 | `<header>` (banner) — 그대로 |
  | 주 이동 | `<nav aria-label>` — 그대로 |
  | 사이드바 | `<aside aria-label>` — 그대로 |
  | 편집 영역 전체 | `<section aria-label>` → `<main aria-label>` |
  | 문서 바 | `<section aria-label="문서 정보">` |
  | 툴바 | `role="toolbar"` — 그대로 |
  | 편집기 칸 | `<section aria-label="에디터">` |
  | 프리뷰 | 그대로(`aria-label`) |
  | 상태 표시줄 | `<footer>` → `<section aria-label="상태 표시줄">` (`<main>` 안 `footer`는 contentinfo가 아니고 이름을 붙일 수 없음) |

- **Rationale**: 이름 있는 `section`은 region 랜드마크가 되어 VoiceOver 로터로 이동할 수 있습니다.

## R8. 색 대비

- **Decision**: 입력 칸(`<input>`·`<select>`) 테두리 `#dfe4ec`(1.28:1) → `#8a94a6`(3.06:1). 대상은 `DocumentBar` 2곳,
  `InsertDialog` 2곳. 버튼 테두리는 글자로 버튼임을 알 수 있어 그대로 둡니다(WCAG 1.4.11 예외).
  글자 색은 번호 목록 번호(`.md-preview li::marker` `#8a93a6`, 3.09:1) 1곳만 기준 미달이라 `--fg-muted #6b7385`
  (4.76:1)로 바꿉니다. 나머지 글자 색은 기준을 넘습니다.

  | 조합 | 대비 | 기준 |
  |------|------|------|
  | `--fg-muted #6b7385` / 흰색 | 4.76 | 4.5 통과 |
  | `--fg-muted` / `--editor-bg #fbfcfe` | 4.63 | 통과 |
  | `#5a6577` / 흰색 (취소 버튼) | 5.89 | 통과 |
  | 흰색 / `--accent` (저장 버튼) | 5.67 | 통과 |
  | `--accent` / `#e8edfb` (눌린 버튼) | 4.84 | 통과 |
  | `#b42318` / 흰색 (오류) | 6.57 | 통과 |
  | `--fg-muted` / `#f1f3f9` (hover 배경) | 4.29 | **미달** — hover 중 보조 글자가 이 배경에 놓이는 곳을 구현 중 찾아 `#5a6577`로 바꿈 |
  | 입력 테두리 `#8a94a6` / 흰색 | 3.06 | 3.0 통과 |
  | 목록 번호 `#8a93a6` / 흰색 (현재) | 3.09 | **미달** → `#6b7385` 4.76 |

- **Rationale**: 시안 색에서 명도만 낮춘 가장 가까운 통과 값입니다(spec FR-013).

## R9. 자동 접근성 검사 — 서버 렌더 + `parse5`

- **Decision**: `tests/a11y/names.test.tsx`에서 `react-dom/server`의 `renderToStaticMarkup`으로 `Toolbar`·`StatusBar`·
  `DocumentBar`·`Dashboard`·`Sidebar`·`InsertDialog`·`ConfirmDialog`를 HTML로 만들고, `parse5`로 파싱해 이름 없는
  `button`·`a[href]`·`input`·`select`·`[role=treeitem]`을 찾습니다. 이름 판정은 `aria-label`, `aria-labelledby`, 감싼 `<label>`,
  `aria-hidden`이 아닌 텍스트 내용 순입니다. `tests/a11y/contrast.test.ts`는 R8 표의 색 조합을 WCAG 상대 휘도 공식으로 검사합니다.
- **Rationale**: Vitest가 `node` 환경이라 DOM이 없습니다. 서버 렌더는 DOM 없이 마크업을 만듭니다. `parse5` 8.1.1은
  `rehype-raw`를 거쳐 이미 설치돼 있어 `devDependencies`에 같은 버전을 적기만 합니다(새 다운로드 없음).
  Vitest `include`에 `tests/**/*.test.tsx`를 추가합니다.
- **Alternatives considered**: `jsdom` + `axe-core` — 의존성 2개 추가, 검사 범위는 넓지만 이 앱에서 빠진 항목은 이름·대비뿐이라
  과합니다. 브라우저 자동화 — 이 환경에서 Chrome 확장이 연결되지 않습니다.
- **Ceiling**: 효과(`useEffect`) 이후 생기는 요소(CodeMirror 편집기)는 검사하지 못합니다. 편집기 이름은
  `MarkdownEditor.tsx:68` `contentAttributes`로 이미 있고 quickstart 수동 검증에서 확인합니다.
