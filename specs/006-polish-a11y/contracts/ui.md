# Contract: UI (M7)

## 문구 (`src/content/strings.ts` 추가)

| 키 | 문구 | 쓰는 곳 |
|----|------|---------|
| `skipToContent` | 본문으로 건너뛰기 | 건너뛰기 버튼 |
| `documentInfoLabel` | 문서 정보 | 문서 바 영역 이름 |
| `editorPaneLabel` | 에디터 | 편집기 칸 영역 이름 |
| `statusBarLabel` | 상태 표시줄 | 상태 표시줄 영역 이름 |

브라우저 이탈 확인 문구는 브라우저가 정하므로 문구 키가 없습니다.

## 화면 구조 (랜드마크 순서)

```text
[button 본문으로 건너뛰기 — 포커스 때만 보임]
header (banner)
 └ nav "Markdown Editor"            [대시보드] [새 문서]
aside "사이드바"                      트리
main "편집 영역"
 ├ section "문서 정보"               폴더·제목
 ├ div role=toolbar "서식"
 ├ section "에디터"                   CodeMirror (aria-label "마크다운 입력")
 ├ div "미리보기"
 └ section "상태 표시줄"             경로·글자 수·[취소][저장]
   — 대시보드면 main 안에 h1 "모든 문서"(tabIndex=-1) + 표
   — 없는 문서면 main 안에 p 안내(tabIndex=-1) + [대시보드로]
```

## 시각

| 요소 | 값 |
|------|----|
| 건너뛰기 버튼 (포커스 때) | 좌상단 고정 `top:8px left:8px`, 흰 배경, `1px solid var(--border)`, radius 6px, 글자 `var(--fg)` 13px 600, 포커스 outline 액센트 2px. 그림자 없음 |
| 편집기 포커스 | `outline: 2px solid var(--accent); outline-offset: -2px` |
| 입력 칸 테두리 (`DocumentBar` select·input, `InsertDialog` input 2개) | `#dfe4ec` → `#8a94a6`. 오류 시 `#b42318` 그대로 |
| 프리뷰 목록 번호 (`.md-preview li::marker`) | `#8a93a6` → `var(--fg-muted)` (3.09 → 4.76:1) |
| 사이드바 이름 바꾸기 칸 | `outline-none` 제거, `focus-visible:outline-2 outline-offset-1 outline-[var(--accent)]` |
| `h1`·안내 문구 (`tabIndex=-1`) | `outline-none` 허용 — 스크립트로만 포커스를 받는 비상호작용 요소라 FR-008 대상이 아님 |

## 동작

| 계기 | 결과 |
|------|------|
| 변경 있음 + 탭 닫기·새로고침·외부 주소 | 브라우저 이탈 확인 |
| 변경 있음 + 앱 안 이동 | M6 저장 확인 3버튼만 (브라우저 확인 없음) |
| [취소] | 본문·폴더·제목을 저장 시점으로. 알림은 M1 문구 그대로 |
| 앱 안 이동 완료 | research R5 표의 대상에 포커스 |
| 건너뛰기 버튼 Enter/Space | 같은 대상에 포커스 |
