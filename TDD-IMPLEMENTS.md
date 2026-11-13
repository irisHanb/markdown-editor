# TDD-IMPLEMENTS — M1 단일 화면 마크다운 에디터

기준: `specs/001-single-screen-editor/tasks.md`. 상태는 `TODO → RED → GREEN`.

| ID | 범위 | 테스트 파일 | 상태 |
|----|------|------------|------|
| US1-count | 문자 수·줄 수·천 단위 표기 (FR-008) | `tests/lib/count.test.ts` | GREEN |
| US1-pipeline | 렌더 파이프라인 conformance·XSS·50ms 예산 (FR-005–FR-007, SC-001·SC-002·SC-004) | `tests/markdown/conformance.test.ts`, `tests/markdown/sanitize.test.ts`, `tests/markdown/perf.test.ts` | GREEN |
| US2-storage | `localStorage` 읽기·쓰기 결과 객체 (FR-011, FR-015) | `tests/lib/local-document.test.ts` | GREEN |
| US2-session | 시작·저장·취소 상태 전이 (FR-012–FR-014) | `tests/lib/session.test.ts` | GREEN |
| US3-helpers | 툴바 헬퍼 3종 (FR-010) | `tests/plugins/helpers.test.ts` | GREEN |
| US3-plugins | 플러그인 12개·레지스트리 (FR-009, FR-010) | `tests/plugins/plugins.test.ts` | GREEN |
| M2a-layout | 레이아웃 범위 제한·키 처리·저장값 해석 (FR-005–FR-015) | `tests/lib/layout.test.ts` | GREEN |
| M2b-buttons | 18버튼 동작 (FR-001, FR-002) | `tests/plugins/plugins.test.ts`, `tests/plugins/helpers.test.ts` | GREEN |
| M2b-toggle | 토글·활성 판정 (FR-005–FR-009) | `tests/plugins/helpers.test.ts`, `tests/plugins/plugins.test.ts` | GREEN |
| M2b-dialog | 대화상자 open·submit (FR-010–FR-014) | `tests/plugins/helpers.test.ts`, `tests/plugins/plugins.test.ts` | GREEN |
| M2b-shortcut | 단축키 배정·표기 (FR-019, FR-020) | `tests/plugins/format-shortcut.test.ts` | GREEN |
| M3-names | 이름 규칙·새 문서 이름·정렬·다음 문서 (FR-007, FR-013, FR-016) | `tests/lib/workspace/names.test.ts` | GREEN |
| M3-repo | 저장소 계약 — IndexedDB·메모리 (FR-001, FR-008, FR-015) | `tests/lib/workspace/repository.test.ts` | GREEN |
| M3-bootstrap | 기존 문서 옮기기·첫 방문 샘플 (FR-002–FR-004) | `tests/lib/workspace/bootstrap.test.ts` | GREEN |
| M3-switch | 저장하지 않은 변경 처리 순서 (FR-010, SC-005) | `tests/lib/workspace/switch.test.ts` | GREEN |
| M6-route | 해시 주소 해석·생성 (FR-013, FR-017) | `tests/lib/route.test.ts` | GREEN |
| M6-save | 초안 저장 결정·자동 접미사·옮기기 충돌 (FR-003–FR-006) | `tests/lib/workspace/save-plan.test.ts` | GREEN |
| M6-date | 수정 시각 표기 (FR-007) | `tests/lib/date.test.ts` | GREEN |
| M6-repo | 저장소 updateDocument (FR-006) | `tests/lib/workspace/repository.test.ts` | GREEN |
| M7-dirty | 저장하지 않은 변경 판단 (FR-002) | `tests/lib/workspace/dirty.test.ts` | GREEN |
| M7-names | 접근 가능한 이름·영역·건너뛰기 버튼 (FR-007, FR-009, FR-010, SC-003) | `tests/a11y/names.test.tsx` | GREEN |
| M7-contrast | 색 대비 (FR-013, SC-005) | `tests/a11y/contrast.test.ts` | GREEN |

## 기록
- 2026-11-12 US1 RED: `npm test` → 4 files failed, `Cannot find package '@/lib/text/count'`, `Cannot find package '@/lib/markdown/pipeline'`
- 2026-11-12 US1 GREEN: 4 files, 64 tests passed
- 2026-11-12 US2 RED: 2 files failed, `Cannot find package '@/lib/storage/local-document'`, `Cannot find package '@/lib/document/session'`
- 2026-11-12 US2 GREEN: 6 files, 76 tests passed
- 2026-11-12 US3 RED: 2 files failed, `Cannot find package '@/plugins/helpers'`, `Cannot find package '@/plugins'`
- 2026-11-12 US3 GREEN: 8 files, 110 tests passed
- 2026-11-12 REFACTOR(T048): `src/plugins/`·`src/lib/` 점검 — 중복 로직 없음(플러그인 12개가 헬퍼 3종으로 수렴), 변경 없음

## 품질 게이트 (T049, 2026-11-12)

| 명령 | 결과 |
|------|------|
| `npm test` | 8 files, 110 tests passed, 실패 0건 |
| `npx tsc --noEmit` | 출력 없음, 종료 코드 0 |
| `npm run build` | `out/index.html` 생성, 경로 `/` Static |
- 2026-11-12 M2a RED: `Cannot find package '@/lib/layout/layout'`
- 2026-11-12 M2a GREEN: 9 files, 137 tests passed

## 품질 게이트 — M2-a (2026-11-12)

| 명령 | 결과 |
|------|------|
| `npm test` | 9 files, 137 tests passed (M1 110 + 레이아웃 27), 실패 0건 |
| `npx tsc --noEmit` | 오류 0건 |
| `npm run build` | `out/index.html` 생성, `<head>`에 레이아웃 복원 스크립트 포함 |
- 2026-11-12 M2b-buttons RED: 19 failed, `TypeError: toggleLinePrefix is not a function`, 레지스트리 길이 12≠18
- 2026-11-12 M2b-buttons GREEN: 147 tests passed
- 2026-11-12 M2b-toggle RED: 31 failed, `toggleInline is not a function`, isActive 목록 불일치
- 2026-11-12 M2b-toggle GREEN: 206 tests passed
- 2026-11-12 M2b-dialog RED: 15 failed, `findBracketSyntax is not a function`, `link에 dialog 없음`
- 2026-11-12 M2b-dialog GREEN: 221 tests passed
- 2026-11-12 M2b-shortcut RED: `Cannot find package '@/plugins/shortcut'`
- 2026-11-12 M2b-shortcut GREEN: 10 files, 229 tests passed

## 품질 게이트 — M2-b (2026-11-12)

| 명령 | 결과 |
|------|------|
| `npm test` | 10 files, 229 tests passed, 실패 0건 |
| `npx tsc --noEmit` | 오류 0건 |
| `npm run build` | `out/index.html` 생성 |
- 2026-11-12 M3 names·repo RED: `Cannot find package '@/lib/workspace/names'`, `Cannot find package '@/lib/workspace/idb-repository'`
- 2026-11-12 M3 names·repo GREEN: 12 files, 267 tests passed (IndexedDB 연결이 versionchange에서 닫히지 않아 deleteDatabase가 막히던 문제 수정)
- 2026-11-12 M3-bootstrap RED: `Cannot find package '@/lib/workspace/bootstrap'`
- 2026-11-12 M3-bootstrap GREEN: lib 7 files, 89 tests passed (resolveInitial 제거)
- 2026-11-12 M3-switch RED: `Cannot find package '@/lib/workspace/switch'`
- 2026-11-12 M3-switch GREEN

## 품질 게이트 — M3 (2026-11-12)

| 명령 | 결과 |
|------|------|
| `npm test` | 14 files, 280 tests passed (연속 2회). 첫 실행에서 `perf.test.ts` 1건이 337ms로 실패했으나 단독 2회·전체 2회 재실행 모두 통과 — 실행 시점 CPU 부하로 판단 |
| `npx tsc --noEmit` | 오류 0건 |
| `npm run build` | 성공 |
- 2026-11-12 M6 route·repo RED: `Cannot find package '@/lib/route/route'`, `repo.updateDocument is not a function` 8건
- 2026-11-12 M6 route·repo GREEN: 15 files, 301 tests passed (saveContent → updateDocument)
- 2026-11-12 M6 save·date RED: `Cannot find package '@/lib/workspace/save-plan'`, `'@/lib/text/date'`
- 2026-11-12 M6 save·date GREEN: 15 tests passed

## 품질 게이트 — M6 (2026-11-13)

| 명령 | 결과 |
|------|------|
| `npm test` | 17 files, 316 tests passed, 실패 0건 |
| `npx tsc --noEmit` | 오류 0건 |
| `npm run build` | 성공 (`Compiled successfully`) |
- 2026-11-13 M7-names·M7-contrast RED: 9 failed / 20 passed. 실패 — 영역 이름 3건(`section:상태 표시줄`·`section:문서 정보`·`main:편집 영역`), 편집기 칸 `editorPaneLabel` 없음, 첫 상호작용 요소 `'대시보드'`(건너뛰기 버튼 없음), 목록 번호 `'#8a93a6'`, `--input-border` 없음, 입력 칸 토큰 사용 0회 ×2. 이름 없는 요소 검사 10건은 이미 통과
- 2026-11-13 M7-dirty RED: `Cannot find package '@/lib/workspace/dirty'`
- 2026-11-13 M7-dirty GREEN: 9 tests passed. `EditorScreen` 저장 확인·이탈 경고·[취소]가 같은 기준 사용. `tests/lib` 12 files·142 tests 통과
- 2026-11-13 M7-names·M7-contrast GREEN: `tests/a11y` 29 tests passed (건너뛰기 버튼은 US2에서, 영역 이름·`--input-border`·목록 번호 색은 US3에서 통과)

## 품질 게이트 — M7 (2026-11-13)

| 명령 | 결과 |
|------|------|
| `npm test` | 20 files, 354 tests passed (M6까지 316 + M7 38), 실패 0건 |
| `npx tsc --noEmit` | 오류 0건 |
| `npm run build` | 성공 (`Compiled successfully`) |
