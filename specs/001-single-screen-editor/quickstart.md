# Quickstart: 단일 화면 마크다운 에디터 (M1) 검증

## 준비

- Node 20.9 이상(로컬 24.20.0 확인)
- 저장소 루트에서 `npm install`

## 1. 자동 검증 — 품질 게이트

```bash
npm test             # Vitest 전체
npx tsc --noEmit     # 타입 오류 0건
npm run build        # 정적 export → out/
```

| 명령 | 기대 결과 | 대응 |
|------|----------|------|
| `npm test` | 실패 0건 | 헌장 원칙 IV |
| `npx tsc --noEmit` | 출력 없음, 종료 코드 0 | 개발 워크플로 게이트 |
| `npm run build` | `out/index.html` 생성 | FR-016, research R2 |

테스트 파일과 검증 대상:

| 파일 | 대상 |
|------|------|
| `tests/plugins/*.test.ts` | contracts/plugin.md 12개 플러그인 + 헬퍼 |
| `tests/markdown/conformance.test.ts` | SC-002, contracts/render-pipeline.md |
| `tests/markdown/sanitize.test.ts` | SC-004, FR-007 |
| `tests/lib/count.test.ts` | FR-008 (`한글👍é` → `4`, `12345`자 → `12,345`) |
| `tests/lib/local-document.test.ts` | contracts/storage.md |
| `tests/lib/session.test.ts` | data-model.md 상태 전이 모듈 |
| `tests/markdown/perf.test.ts` | SC-001 렌더 예산 50ms |

## 2. 수동 검증 — 브라우저

```bash
npm run build && python3 -m http.server 3000 -d out   # 정적 결과물만으로 실행
```

| # | 절차 | 기대 결과 | 근거 |
|---|------|----------|------|
| 1 | 개발자 도구에서 `localStorage.removeItem("mdeditor:v1")` 후 새로고침 | 샘플 문서와 프리뷰 표시 | US1-1 |
| 2 | 편집 영역에 `# 제목` 입력 | 프리뷰에 1단계 제목 | US1-2 |
| 3 | `<img src=x onerror="alert(1)">` 입력 | 알림창 없음, 프리뷰 HTML에 `onerror` 없음 | US1-4 |
| 4 | 문서 수정 → [저장] → 새로고침 | "저장되었습니다" 알림, 수정본 유지 | US2-1, US2-2 |
| 5 | 다시 수정 → [취소] | 저장본으로 복원, 되돌림 알림 | US2-3 |
| 6 | `Storage.prototype.setItem = () => { throw new DOMException("x", "QuotaExceededError") }` 실행 후 [저장] | 실패 알림, 편집 내용 유지 | US2-5 |
| 7 | Tab으로 툴바 이동, VoiceOver(⌘F5) 켬. 이어서 Tab으로 [취소]·[저장]까지 이동해 각각 Enter | 버튼 12개 순서대로 포커스·한글 이름 낭독, [취소]·[저장]이 키보드로 실행되고 알림 표시 | US3-5, SC-006 |
| 8 | "강조" 선택 → [굵게] | `**강조**`, "강조" 선택 유지 | US3-1 |
| 9 | 한글 IME로 "안녕하세요" 빠르게 입력 | 글자 중복·누락 없음 | FR-003 |
| 10 | 1만 자 문서 붙여넣기 → Performance 패널 기록하며 10초 타이핑 | 키 입력 처리 50ms 초과 0건, 프리뷰 갱신 150ms 이내 | SC-001, SC-003 |
| 11 | 디자인 시안과 나란히 비교 | research R10 변경점 외 시각 차이 없음 | FR-002 |

## 3. 배포 검증

Vercel에 저장소를 연결하고 기본 설정으로 배포합니다. 빌드 성공과 배포 URL에서 2절 1·4번 재확인이
기준입니다.

## 검증 기록

### 2026-11-12 — 자동 검증

| 항목 | 결과 |
|------|------|
| 1절 품질 게이트 3종 | 통과 — `npm test` 110/110, `tsc --noEmit` 오류 0건, `out/index.html` 생성 |
| 정적 서버 응답 | `python3 -m http.server 3000 -d out` → `GET /` 200 |
| 툴바 접근 이름 | `out/index.html`에 `<button aria-label>` 12개(제목…구분선), `role="toolbar"`·`role="status"`·`role="region"` 각 1개 |
| 외부 런타임 요청 | `out/`에 `fonts.googleapis`·`cdn.jsdelivr` 참조 0건 (폰트 2종 모두 `out/_next/static/media`에 포함) |
| anti-ai-slop 점검(T050) | gradient·backdrop-filter·keyframes·transform·animate 0건, box-shadow 0건, radius 8px 초과 0건 |

### 미실행 — 사람이 실행해야 함

2절 수동 검증 11항목은 브라우저 자동화(Claude in Chrome 확장)가 연결되지 않아 실행하지 못했습니다.
2·3번(입력·XSS), 4–6번(저장·취소·저장 실패), 7번(VoiceOver), 8번(툴바), 9번(한글 IME), 10번(Performance 패널),
11번(시안 비교)이 남아 있습니다.
