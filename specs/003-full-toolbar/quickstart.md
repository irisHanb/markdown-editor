# Quickstart: 툴바 완성 (M2-b) 검증

## 1. 자동 검증

```bash
npm test && npx tsc --noEmit && npm run build
```

| 테스트 | 대상 |
|--------|------|
| `tests/plugins/helpers.test.ts` | 토글·묶음 접두·범위 탐색·URL 정규화 헬퍼 |
| `tests/plugins/plugins.test.ts` | 레지스트리 18개·묶음 5개·단축키 11개, contracts/plugin-api.md 기대 예시, 토글 왕복(SC-002), 연속 2–10회(SC-003) |
| `tests/plugins/format-shortcut.test.ts` | 툴팁 단축키 표기 |
| 기존 M1·M2-a 테스트 | 회귀 없음(SC-007) |

## 2. 수동 검증 — `npm run build && python3 -m http.server 3000 -d out`

| # | 절차 | 기대 결과 | 근거 |
|---|------|----------|------|
| 1 | 툴바 보기 | 18버튼·5묶음, H4–H6 없음 | US1-6 |
| 2 | 각 버튼 선택 있음/없음 실행 | contracts/plugin-api.md 표와 같음, 프리뷰 렌더 | US1, SC-001 |
| 3 | `**강조**` 안에 커서 | [굵게] 눌림 표시, 누르면 해제 | US2-4, US2-6 |
| 4 | [링크] → 주소 입력 → Enter | `[텍스트](주소)`, 커서가 뒤 | US3-1 |
| 5 | 기존 링크 안에서 [링크] | 값이 채워진 "링크 수정" | US3-6 |
| 6 | 대화상자에서 Esc·배경 클릭 | 문서 변화 없음, 편집 영역 포커스 | US3-3 |
| 7 | 대화상자에서 Tab 반복 | 대화상자 밖 페이지 요소로 이동 안 함 | US3-5 |
| 8 | 단축키 11개 (macOS·Windows 각각) | 버튼과 같은 결과, 툴팁 표기 일치 | US4, FR-020 |
| 9 | 한글 조합 중 Mod-b·Mod-Alt-1 | 글자 손실·중복 0건 | SC-005 |
| 10 | VoiceOver로 툴바 | 토글 버튼 "눌림/눌리지 않음" 낭독 | FR-009 |
| 11 | 툴바 실행 후 Mod-z 1회 | 실행 전 문서 | FR-004 |

## 검증 기록

### 2026-11-12 — 자동 검증

| 항목 | 결과 |
|------|------|
| 1절 게이트 | 통과 — 229/229, `tsc` 오류 0건, 빌드 성공 |
| 18버튼 표시(1번 일부) | `out/index.html`에 새 버튼(제목 1–3, 이미지, 자동 링크, 작업 목록, 강제 줄바꿈) `aria-label` 포함 |
| 2·3·11번 동작 규칙 | 플러그인 단위 테스트로 대체 검증 — 18버튼 기대값, 토글 왕복 11개(SC-002), 연속 10회 중복 구분자 0건(SC-003) |
| anti-ai-slop 점검 | gradient·transform·애니메이션·그림자·blur 0건, radius 8px 초과 0건 |

### 미실행 — 사람이 실행해야 함

브라우저 자동화가 연결되지 않아 2절 4–10번(대화상자 조작·포커스, 단축키 실기기 동작, 한글 조합, VoiceOver
`aria-pressed` 낭독)은 실행하지 못했습니다. 특히 8번 `Mod-Shift-8`·`Mod-Alt-1`은 CM6의 keyCode 기준 매칭에
의존하므로(research R4) macOS·Windows 실기기에서 확인이 필요합니다.
