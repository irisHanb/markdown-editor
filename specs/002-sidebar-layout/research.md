# Research: 사이드바 2분할 레이아웃·리사이즈 (M2-a)

조사일 2026-11-12.

## R1. 리사이즈 구현 방식

- **Decision**: 라이브러리 없이 직접 만듭니다. 경계 컴포넌트 `ResizeHandle` 1개(포인터 끌기 + 키보드)와
  순수 함수 모듈 `src/lib/layout/layout.ts`(범위 제한·키 처리·저장값 해석)로 구성합니다.
- **Rationale**: spec이 요구하는 규칙이 라이브러리 기본 동작과 다릅니다.
  - 키보드 단위가 사이드바 10px, 에디터 비율 5%p로 서로 다릅니다(FR-007, FR-010).
  - 창 크기를 바꿔도 사이드바는 px, 에디터는 비율을 유지해야 합니다(spec Edge Cases).
  - 경계가 2개뿐이라 직접 구현해도 컴포넌트 1개, 순수 함수 5개 수준입니다.
  - 범위 제한·키 처리를 순수 함수로 두면 Vitest `node` 환경에서 테스트할 수 있습니다(헌장 원칙 IV).
- **Alternatives considered**: `react-resizable-panels` 4.21.0(헌장 스택에 있음) — px 단위 크기와
  키보드 조절은 지원합니다. 다만 README에서 키보드 조절 단위 설정을 확인하지 못했습니다. 저장 형식도
  레이아웃 전체 비율이라 "사이드바 px 유지" 규칙을 맞추려면 변환 코드가 필요합니다. 의존성을 추가하지
  않습니다.

## R2. 레이아웃 적용 방식 — CSS 변수

- **Decision**: 사이드바 너비와 에디터 비율을 `<html>`의 CSS 변수 `--sidebar-w`(px)·`--editor-ratio`(%)로
  둡니다. 사이드바 실제 너비는 `max(180px, min(var(--sidebar-w), 100vw - 480px))`로 계산합니다. 에디터·
  프리뷰 칸은 `flex-basis`로 비율을, `min-width: 240px`로 최소폭을 지킵니다.
- **Rationale**:
  - 좁은 창 처리(사이드바를 먼저 180px까지 줄임)를 CSS 식 하나로 끝냅니다. 저장값은 바뀌지 않습니다.
  - 끌기 중 React는 핸들의 `aria-valuenow`만 갱신합니다. 에디터(CM6)·프리뷰 DOM은 다시 그리지
    않습니다(SC-001).
- **Alternatives considered**: `window.resize` 이벤트에서 JS로 너비 계산 — CSS 식으로 같은 결과가 나와
  코드가 늘기만 합니다.

## R3. 새로고침 시 너비 깜빡임 방지

- **Decision**: `layout.tsx`의 `<head>`에 5줄 인라인 스크립트를 둡니다. 첫 화면을 그리기 전에
  `localStorage["mdeditor:layout:v1"]`을 읽어 범위 제한 후 CSS 변수를 설정합니다. `<html>`에
  `suppressHydrationWarning`을 둡니다.
- **Rationale**: 정적 export라 서버는 저장값을 모릅니다. React가 마운트 후 값을 적용하면 기본값
  260px로 한 번 그렸다가 저장값으로 바뀌는 레이아웃 이동이 생깁니다.
- **Alternatives considered**: 마운트 후 적용 — 저장값이 기본값과 다른 사용자는 새로고침마다 화면이
  움직입니다.
- **Constraint**: 스크립트는 예외를 삼키고(try/catch) 범위 밖 값은 기본값으로 둡니다. 스크립트의 범위
  제한 규칙은 `layout.ts`와 같은 상수를 문자열로 주입해 두 곳이 어긋나지 않게 합니다.

## R4. 포인터 끌기

- **Decision**: `pointerdown`에서 `setPointerCapture` + `preventDefault`, `pointermove`에서 값 계산,
  `pointerup`·`pointercancel`·`lostpointercapture`에서 종료 후 저장합니다. 끄는 동안 `document.body`에
  `cursor: col-resize`와 `user-select: none`을 둡니다.
- **Rationale**: 포인터 캡처는 마우스가 창 밖으로 나가도 이벤트를 받아 spec Edge Case(창 밖에서 놓기)를
  처리합니다. `preventDefault`와 `user-select: none`이 편집 영역 텍스트 선택을 막습니다(FR-012).
- **값 계산**: 사이드바 = `clientX - 사이드바 왼쪽`, 에디터 비율 = `(clientX - 편집 행 왼쪽) / 편집 행 폭 × 100`.

## R5. 저장 형식

- **Decision**: `localStorage["mdeditor:layout:v1"]`에 `{"sidebar":260,"editor":50}` JSON. 저장 시점은
  끌기 종료·키 입력 직후입니다(FR-013).
- **Rationale**: 문서 저장본(`mdeditor:v1`, 본문 문자열)과 키를 분리해 서로 손상되지 않게 합니다.
  저장 실패는 무시합니다(FR-015, 데이터 손실 없음).
- **복원 규칙**: JSON 파싱 실패·숫자 아님 → 기본값, 숫자인데 범위 밖 → 가장 가까운 한계값(FR-014).

## R6. 접근성

- **Decision**: 경계는 `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow/min/max`,
  `aria-valuetext`(예: "260픽셀", "에디터 50%"), `aria-label`, `tabIndex=0`. 사이드바는
  `<aside aria-label="사이드바">`, 편집 영역은 `<section aria-label="편집 영역">`.
- **Rationale**: WAI-ARIA Window Splitter 패턴이 분할 경계에 `separator` 역할과 값 속성을 요구합니다.
  ←·→·Home·End 처리는 같은 패턴을 따릅니다.

## R7. 툴바 이동 (Clarification Q1)

- **Decision**: `<Toolbar>`를 상단 바에서 편집 영역 첫 행으로 옮깁니다. 상단 바에는 로고와 앱 이름만
  남깁니다. 툴바 컴포넌트·플러그인은 바꾸지 않습니다.
