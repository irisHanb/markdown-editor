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
