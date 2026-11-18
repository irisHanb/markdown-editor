# Quickstart: 문서 흐름 (M6) 검증

## 1. 자동 검증

```bash
npm test && npx tsc --noEmit && npm run build
```

| 테스트 | 대상 |
|--------|------|
| `tests/lib/route.test.ts` | 해시 주소 해석·생성 |
| `tests/lib/workspace/save-plan.test.ts` | 폴더 미선택 차단, 자동 접미사, 옮기기 충돌 차단 (SC-002) |
| `tests/lib/date.test.ts` | 수정 시각 표기 |
| `tests/lib/workspace/repository.test.ts` | `updateDocument` 두 구현 |
| 기존 M1–M3 테스트 | 회귀 없음 (SC-007) |

## 2. 수동 검증 — `npm run build && python3 -m http.server 3000 -d out`

| # | 절차 | 기대 결과 | 근거 |
|---|------|----------|------|
| 1 | [새 문서] → 본문 입력 → 폴더 선택 안 하고 [저장] | 저장 안 됨, 안내, 폴더 칸 포커스 | US1-2, SC-002 |
| 2 | 폴더 "회의"·제목 "주간 회의" → [저장] | 사이드바에 생김, 주소 `#/doc/…`, 뒤로 가기 시 `#/new`로 가지 않음 | US1-3, FR-013 |
| 3 | 같은 제목으로 새 문서 저장 | "주간 회의-1" + 알림 | US1-4 |
| 4 | 저장된 문서 폴더 바꾸고 [저장] | 다른 폴더로 옮겨짐. 같은 제목이 있는 폴더면 오류·변화 없음 | FR-006 |
| 5 | [대시보드] | 최근 수정순 목록, 행 클릭·Enter로 열림 | US2-1·2 |
| 6 | 문서 수정 후 [대시보드]·뒤로 가기 | 저장 확인 3버튼, [취소] 시 주소 원래대로 | FR-015, SC-005 |
| 7 | A → B 열고 뒤로·앞으로 10회 | 기록과 열린 문서 일치 | SC-004 |
| 8 | 문서 주소에서 새로고침 | 같은 문서 | SC-006 |
| 9 | 없는 id 주소(`#/doc/xxx`) | "문서를 찾을 수 없습니다" + [대시보드로] | FR-016 |
| 10 | 주소 해시 없이 열기 | 마지막 문서 편집 화면(문서 0개면 대시보드) | FR-012 |
| 11 | M3 quickstart "대량 데이터 만들기" 후 대시보드 | 1초 이하 표시 | SC-003 |
| 12 | 대시보드 링크 가운데 클릭 | 새 탭에서 그 문서 열림 | research R2 |

## 3. 검증 기록 (2026-11-13)

| 항목 | 결과 |
|------|------|
| 자동 검증 | 17 files, 316 tests 통과. `tsc` 오류 0건. 빌드 성공 |
| 이동 경로 (T026, SC-005) | `grep -rnE "openRoute\(\|location\.hash\|history\.(push\|replace)State\|navigate\(" src/components` 결과, 주소를 바꾸는 코드는 `useHashRoute.ts`의 `navigate` 1곳뿐임. 문서를 여는 `openRoute` 호출은 `hashchange` 처리(`EditorScreen.tsx:243`)와 시작 시 1회(`EditorScreen.tsx:255`) 2곳. 사이드바·대시보드·[대시보드]·[새 문서]·저장 후 이동·삭제 후 이동은 모두 `navigate`를 거침 |
| anti-ai-slop (T029) | `grep -rnE "gradient\|transform\|animate-\|shadow\|blur\|rounded-(lg\|xl\|2xl\|3xl\|full)" src` 13건. 주석 2건, `rounded-lg`(8px) 10건, 7px 상태 점 `rounded-full` 1건이라 위반 0건. M6 신규 파일(`Dashboard.tsx`·`DocumentBar.tsx`)은 `rounded-md`만 씀 |
| 수동 검증 2절 12항목 (T030) | 미실행. Chrome 확장이 연결되지 않아 브라우저 자동화를 쓸 수 없음. 사람이 2절 표대로 실행해야 함 |
