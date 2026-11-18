# Quickstart: 마감 — 이탈 경고·접근성 (M7) 검증

## 1. 자동 검증

```bash
npm test && npx tsc --noEmit && npm run build
```

| 테스트 | 대상 |
|--------|------|
| `tests/lib/workspace/dirty.test.ts` | 저장하지 않은 변경 판단 9경우 (contracts/modules.md) |
| `tests/a11y/names.test.tsx` | 서버 렌더한 `Toolbar`·`StatusBar`·`DocumentBar`·`Dashboard`·`Sidebar`·`InsertDialog`·`ConfirmDialog`에 이름 없는 상호작용 요소 0개, `EditorScreen` 영역 이름·첫 요소 건너뛰기 버튼 (SC-003, FR-007·FR-010) |
| `tests/a11y/contrast.test.ts` | research R8 색 조합, 입력 칸 테두리 3:1, 목록 번호 4.5:1 (SC-005) |
| 기존 M1–M6 테스트 | 회귀 없음 (SC-006) |

## 2. 수동 검증 — `npm run build && python3 -m http.server 3000 -d out` (Chrome)

| # | 절차 | 기대 결과 | 근거 |
|---|------|----------|------|
| 1 | 문서 본문 1글자 고침 → 새로고침 | 브라우저 이탈 확인. 머무르면 고친 본문 그대로 | US1-1·2 |
| 2 | 1에서 제목만 고침 → 탭 닫기 | 이탈 확인 | FR-002 |
| 3 | [저장] 직후 새로고침 | 확인 없음 | US1-3 |
| 4 | [새 문서] → 바로 탭 닫기 / 폴더만 고르고 닫기 | 둘 다 확인 없음 | US1-5 |
| 5 | [새 문서] → 본문 입력 → 탭 닫기 | 이탈 확인 | US1-4 |
| 6 | 본문·제목 고침 → [취소] → 새로고침 | 확인 없음, 본문·제목 원래대로 | US1-6 |
| 7 | 본문 고침 → [대시보드] | M6 저장 확인 3버튼만, 브라우저 확인 없음 | FR-003 |
| 8 | 새로고침 직후 Tab 1회 | "본문으로 건너뛰기" 보임 → Enter → 편집기에 포커스 | FR-007 |
| 9 | 마우스 없이 SC-002 작업 7개 | 모두 완료 | SC-002 |
| 10 | 편집기에서 Tab / Shift+Tab | 다음·이전 요소로 포커스 이동 | FR-006 |
| 11 | 사이드바에서 문서 Enter / [대시보드] / [새 문서] / `#/doc/xxx` | 포커스: 편집기 / "모든 문서" 제목 / 편집기 / 안내 문구 | FR-005, SC-004 |
| 12 | 링크 대화상자 열고 Esc / 사이드바 삭제 확인 열고 Esc | 편집기로 복귀 / 대화상자를 연 트리 항목으로 복귀 | US2-2 |
| 13 | 모든 버튼·입력 칸 Tab 순회 | 액센트 포커스 테두리가 매번 보임 (편집기 포함) | FR-008 |
| 14 | VoiceOver(⌘F5) 로터 → 랜드마크 | 배너·탐색·사이드바·편집 영역·문서 정보·에디터·미리보기·상태 표시줄 | FR-010 |
| 15 | VoiceOver로 [저장] / 폴더 미선택 저장 | "저장되었습니다" / 오류 문구 낭독 | FR-011 |
| 16 | VoiceOver로 굵은 글자 안 커서 → 툴바 [굵게] / 트리의 열린 문서 | "눌림" / "선택됨" | FR-012 |

## 3. 검증 기록 (2026-11-13)

| 항목 | 결과 |
|------|------|
| 포커스 테두리 누락 (T022) | `src/components/**/*.tsx`의 `button`·`a`·`input`·`select`·`textarea` 전부와 트리 항목·메뉴 항목이 `focus-visible:outline-*` 클래스(직접 또는 `focusRing`·`fieldClass`·`linkClass`·`navButton` 상수)를 가짐. 누락 0건. `ResizeHandle.tsx`의 중복 `outline-none` 1개 제거(`focus-visible`이 이미 덮어쓰던 값). `grep -rn "outline-none" src` 결과는 `tabIndex={-1}` 비상호작용 요소 2곳(`Dashboard.tsx` 제목, `EditorScreen.tsx` 없는 문서 안내)뿐 |
| hover 대비 (T029) | 해당 없음. `--fg-muted` 글자가 `hover:bg-[#f1f3f9]`·`focus:bg-[#f1f3f9]`와 같은 요소에 쓰인 곳 0건. 그 배경 위 글자색은 `--accent` 5.11:1, `#4a5568` 6.78:1, `#1f2a44` 12.85:1, `--fg` 14.01:1로 모두 4.5:1 이상 |
| 자동 검증 | 20 files, 354 tests 통과. `tsc` 오류 0건. 빌드 성공 |
| anti-ai-slop (T032) | `grep -rnE "gradient\|transform\|animate-\|shadow\|blur" src` 2건 모두 주석. 이번 변경으로 추가한 radius는 `rounded-md`(6px) 4곳 |
| 수동 검증 2절 16항목 (T033) | 미실행. Chrome 확장이 연결되지 않아 브라우저 자동화를 쓸 수 없음. 이탈 확인(1–7)·키보드(8–13)·VoiceOver(14–16)는 사람이 2절 표대로 실행해야 함 |
