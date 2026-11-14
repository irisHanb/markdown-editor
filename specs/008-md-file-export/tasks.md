# Tasks: 저장 시 `.md` 파일 쓰기 (008)

**Tests**: 포함(헌장 원칙 IV). 경로 규칙·파일 쓰기는 순수 함수와 가짜 핸들로 먼저 테스트.

## Phase 1: Tests (RED)

- [X] T001 [P] `tests/lib/export/md-path.test.ts` — `mdPath("회의", "주간 회의")` = `{ dir: "회의", file: "주간 회의.md", display: "회의/주간 회의.md" }`; 금지 글자 `a:b?c` → `a_b_c`; 끝 공백·마침표 제거; `..` → `_` (FR-005)
- [X] T002 [P] `tests/lib/export/fs-export.test.ts` — 가짜 `DirHandle`(메모리): 새 하위 폴더·파일 생성과 본문; 덮어쓰기; `previous`가 다르면 이전 파일 삭제·같으면 유지; 권한 `denied` → `{ ok: false, reason: "permission" }`, 쓰기 예외 → `{ ok: false, reason: "write" }`; `prompt`면 `requestPermission` 호출 (FR-003·FR-004·FR-006)
- [X] T003 [P] `tests/lib/workspace/repository.test.ts` — `setMeta("exportDir", 값)` 왕복(두 구현) (FR-002)
- [X] T004 실패 확인 → `TDD-IMPLEMENTS.md`에 `F8-path`·`F8-write`·`F8-meta` RED 기록

## Phase 2: Implementation

- [X] T005 `src/lib/export/md-path.ts` — `mdPath(folderName, title)`
- [X] T006 `src/lib/export/fs-export.ts` — `DirHandle` 최소 인터페이스(타입), `ensurePermission`, `writeMarkdown(root, target, content, previous?)` → `{ ok: true, path } | { ok: false, reason }`
- [X] T007 `src/lib/workspace/repository.ts` — `Meta.exportDir?: unknown`(핸들, 구조화 복제 가능)
- [X] T008 `src/components/workspace/useWorkspace.ts` — `exportDir` 상태 로드·`connectExportDir()`(showDirectoryPicker `{ id: "md-export", mode: "readwrite" }` → setMeta)
- [X] T009 `src/components/editor/EditorScreen.tsx` — 헤더 [저장 폴더 연결] 버튼(`FolderSync` 아이콘, 지원 브라우저만), `handleSave` 성공 후 `writeMarkdown` 호출·이전 경로 전달, 알림 문구 분기. `strings.ts` 문구
- [X] T010 게이트(`npm test`·`tsc`·`build`) → GREEN 기록

## Phase 2b: 문서 다운로드 (FR-007–FR-010)

- [X] T013 [P] `tests/lib/export/md-path.test.ts` — `mdFileName("주간 회의")` = `"주간 회의.md"`, `mdFileName('a:b')` = `"a_b.md"`
- [X] T014 [P] `tests/lib/export/download.test.ts` — `downloadMarkdown("주간 회의.md", "# 본문", 가짜 document)`: 앵커 `download`·`href`(blob URL) 지정, `click` 1회, Blob 형식 `text/markdown;charset=utf-8`·내용 일치, 클릭 뒤 URL 해제
- [X] T015 [P] `tests/a11y/names.test.tsx` — 문서 줄마다 `‘제목’ 다운로드` 버튼(aria-hidden 아이콘 1개), 폴더 줄에는 없음, 문서 줄 버튼 순서 다운로드 → 이름 바꾸기 → 삭제
- [X] T016 실패 확인 → `F8-download` RED 기록
- [X] T017 `src/lib/export/md-path.ts` `mdFileName`, `src/lib/export/download.ts` `downloadMarkdown`, `src/components/layout/Sidebar.tsx` 문서 줄 [다운로드](저장된 `doc.content`), 문서 줄 오른쪽 여백을 버튼 3개에 맞춤, `strings.download` → GREEN 기록·게이트

## Phase 3: Polish

- [X] T011 `CLAUDE.md` SDD 매핑·저장소 설명에 008 1줄, `docs/requirement.md` FR-7.5 상태
- [ ] T012 수동 검증(Chrome, 시나리오 1–6) — 사용자 확인 필요
