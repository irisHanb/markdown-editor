# Quickstart: 사이드바 2분할 레이아웃·리사이즈 (M2-a) 검증

## 1. 자동 검증

```bash
npm test             # M1 110개 + tests/lib/layout.test.ts
npx tsc --noEmit
npm run build
```

| 기대 결과 | 근거 |
|----------|------|
| 실패 0건 (M1 테스트 포함) | SC-005, 헌장 원칙 IV |
| 타입 오류 0건, `out/index.html` 생성 | 품질 게이트 |

## 2. 수동 검증 — `npm run build && python3 -m http.server 3000 -d out`

| # | 절차 | 기대 결과 | 근거 |
|---|------|----------|------|
| 1 | `localStorage.removeItem("mdeditor:layout:v1")` 후 새로고침 | 사이드바 260px + 빈 영역 안내, 툴바가 편집 영역 맨 위 | US1-1, FR-001 |
| 2 | 입력·[저장]·[취소]·툴바 버튼 사용 | M1과 같은 결과 | US1-2, FR-004 |
| 3 | 사이드바 경계를 끝까지 오른쪽·왼쪽으로 끌기 | 480px·180px에서 멈춤 | US2-1, US2-2 |
| 4 | 에디터·프리뷰 경계를 끝까지 끌기 | 에디터 30%·70%에서 멈춤, 끄는 동안 텍스트 선택 없음 | US2-3, US2-5 |
| 5 | 너비 바꾼 뒤 새로고침 | 같은 너비로 열리고, 첫 화면에서 너비가 튀지 않음 | US2-4, SC-003, research R3 |
| 6 | Tab으로 경계 포커스 → →, ←, Home, End | 10px(5%p) 단위 변경, 최소·최대 이동 | US3-1–3 |
| 7 | VoiceOver로 경계 읽기 | "사이드바 너비 조절, 260픽셀" 등 이름·값 낭독 | US3-4, FR-011 |
| 8 | `localStorage.setItem("mdeditor:layout:v1", "{\"sidebar\":600,\"editor\":\"x\"}")` 후 새로고침 | 사이드바 480px, 에디터 50% | FR-014 |
| 9 | 창 너비를 900px로 줄이기 | 사이드바가 먼저 줄고, 겹침 없이 편집 영역 가로 스크롤 | Edge Cases |
| 10 | 1만 자 문서에서 경계 끌기 + Performance 기록 | 100ms 초과 프레임 0건 | SC-001 |

## 검증 기록

### 2026-11-12 — 자동 검증

| 항목 | 결과 |
|------|------|
| 1절 게이트 | 통과 — 137/137, `tsc` 오류 0건, 빌드 성공 |
| 정적 HTML 구조 | `out/index.html`에 `role="separator"` 2개(사이드바 너비 조절, 에디터·미리보기 비율 조절), 사이드바 안내 문구, `role="toolbar"` 포함 |
| 복원 스크립트(8번 대응) | `out/index.html` 스크립트를 Node에서 실행 — 저장값 없음·`{bad` → 변수 미설정(기본값), `{"sidebar":600,"editor":"x"}` → `--sidebar-w: 480px`만 설정, `{"sidebar":300.4,"editor":20}` → `300px`·`30%` |
| anti-ai-slop 점검 | gradient·transform·애니메이션·그림자 0건, radius 8px 초과 0건 |

### 미실행 — 사람이 실행해야 함

브라우저 자동화(Claude in Chrome 확장)가 연결되지 않아 2절 1–7·9·10번(구조 확인, 끌기, 키보드,
VoiceOver, 좁은 창, 성능)은 실행하지 못했습니다.
