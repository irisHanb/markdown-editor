# Research: 툴바 완성 — 18버튼·토글·입력 대화상자·단축키 (M2-b)

조사일 2026-11-12. 새 의존성 없음(M1 버전 그대로).

## R1. 플러그인 인터페이스 확장 — 대화상자

- **Decision**: `MarkdownPlugin`에 선택 필드 `dialog?: PluginDialog`를 추가합니다. 대화상자 플러그인
  (링크·이미지)은 `apply` 대신 `dialog.open(state)` → 화면이 입력받음 → `dialog.submit(state, values)`
  순서로 동작합니다. 두 함수 모두 순수 함수입니다. 툴바·단축키 실행부는 `plugin.dialog` 유무로만
  분기하고 플러그인 종류를 알지 않습니다.
- **Rationale**: 헌장 원칙 I — `apply`는 `EditorState → EditorChange` 순수 함수여야 해서 사용자 입력을
  받을 수 없습니다. 입력 단계를 플러그인 밖(공용 대화상자 컴포넌트)에 두고, 값 해석·문법 조립만
  플러그인에 두면 순수성과 격리가 같이 유지됩니다. 새 대화상자 플러그인을 추가해도 툴바는 바뀌지
  않습니다.
- **Alternatives considered**: 링크·이미지 전용 분기를 툴바에 하드코딩 — 원칙 I(툴바 수정 금지) 위반.
  `apply`가 `window.prompt` 호출 — 순수 함수가 아니고 브라우저 대화상자는 디자인·접근성 제어 불가.

## R2. 토글 판정 — 구분자 길이(run) 기준

- **Decision**: 인라인 토글은 "같은 줄에서 선택(또는 커서)을 감싼 구분자 문자 연속 길이"로
  판정합니다.
  - `*` 계열: 연속 길이 1 → 기울임, 2 → 굵게, 3 → 둘 다. [굵게]는 길이 2·3일 때 해제(2개 제거),
    [기울임]은 1·3일 때 해제(1개 제거). 그 외는 추가합니다(FR-006).
  - `~~`: 길이 2. `` ` ``: 양쪽 길이가 같으면 해제.
  - 선택이 구분자를 포함한 경우(`[**강조**]`)와 바깥에 둔 경우(`**[강조]**`) 모두 같은 규칙입니다.
  - 선택이 없으면 커서를 포함하는 같은 줄의 `구분자 + 내용 + 같은 구분자` 범위를 찾아 해제합니다
    (Clarification Q1).
- **Rationale**: `**`와 `*`가 같은 문자라 문자열 일치만으로는 `**강조**`에서 기울임을 잘못 해제합니다.
  연속 길이로 보면 spec FR-006 세 경우가 한 규칙으로 정리됩니다.
- **Ceiling**: 한 줄 안 단순 중첩만 판정합니다. `**a *b* c**` 같은 중첩 안쪽 판정은 바깥 범위를
  기준으로 합니다(코드에 `ponytail:` 주석으로 한계 명시). 여러 줄에 걸친 강조는 판정하지 않습니다.
- **Alternatives considered**: mdast로 파싱해 판정 — 정확하지만 커서 이동마다 문서 전체 파싱(1만 자
  수 ms~수십 ms)이 생기고 원문 위치 매핑이 필요합니다. 툴바 판정에는 과합니다.

## R3. 줄 접두 토글 — 배타 묶음

- **Decision**: 줄 접두는 "묶음(family)" 단위로 판정합니다.
  - 제목 묶음: `^#{1,6} ` (H4–H6 줄도 같은 묶음으로 보고 [H1–H3]은 단계 교체).
  - 목록 묶음: 작업 `^- \[[ xX]\] ` → 번호 `^\d+[.)] ` → 글머리 `^[-*+] ` 순으로 먼저 맞는 것.
  - 인용: `^> ?` 단독 묶음.
  - 대상 줄(빈 줄 제외)이 모두 "같은 묶음의 같은 종류"면 제거, 아니면 각 줄의 같은 묶음 접두를 새
    접두로 교체(없으면 추가)합니다.
  - 번호 목록은 대상 줄 순서대로 `1. 2. 3.`을 붙입니다(빈 줄은 번호를 세지 않음).
- **Ceiling**: 인용 안의 목록(`> - a`)은 인용 접두 뒤를 보지 않습니다. 줄 맨 앞만 판정합니다.

## R4. 단축키 — 레지스트리 기반 keymap

- **Decision**: `MarkdownEditor`가 props로 `bindings: { key: string; run: () => boolean }[]`를 받아 CM6
  `keymap.of`에 넣습니다. `EditorScreen`이 `plugins.filter(p => p.shortcut)`로 바인딩을 만듭니다. 실행
  함수는 `view.composing`이면 `false`를 돌려 조합 중 입력을 건드리지 않습니다(FR-018). 바인딩은 기본
  keymap보다 우선순위를 높게(`Prec.high`) 둡니다.
- **Rationale**: 새 단축키 = 플러그인 `shortcut` 필드 1개. 편집기 코어는 바뀌지 않습니다(원칙 I).
  CM6는 Alt·Shift 조합에서 keyCode 기준 이름(`1`, `8`)도 함께 매칭하므로 macOS Option+1(`¡`)·Shift+8(`*`)
  조합도 `Mod-Alt-1`·`Mod-Shift-8`로 잡힙니다. 실기기 확인은 quickstart 수동 검증에 둡니다.
- **Alternatives considered**: `window` keydown 리스너 — 편집 영역 포커스 조건(FR-017)·조합 판정을
  직접 구현해야 합니다.

## R5. 활성 표시 — 선택 변경 시 판정

- **Decision**: `MarkdownEditor`가 `selectionSet || docChanged` 업데이트마다 `onSelection({doc,
  selectionStart, selectionEnd})`를 호출합니다. `EditorScreen`은 `plugins.filter(p => p.isActive?.(s))`로
  눌린 버튼 id 집합을 만들어 `Toolbar`에 넘깁니다. 툴바는 `isActive`가 있는 버튼에만 `aria-pressed`를
  붙입니다.
- **Rationale**: `isActive` 11개 × 현재 줄 정규식 1회라 1만 자 문서에서도 판정 비용이 작습니다.
  `doc.toString()` 1회(1만 자)는 1ms 미만입니다.
- **Ceiling**: 커서 이동마다 문서 문자열을 만듭니다. 판정이 현재 줄만 쓰므로 느려지면 현재 줄만
  넘기도록 바꿉니다(`ponytail:` 주석).

## R6. 입력 대화상자 — 네이티브 `<dialog>`

- **Decision**: 공용 `InsertDialog` 컴포넌트 1개가 `<dialog>`를 `showModal()`로 엽니다. 폼 칸 2개
  (`<label>` + `<input>`), [취소]·[삽입|수정] 버튼. `cancel` 이벤트(Esc)·[취소]·배경 클릭(대상이
  `<dialog>` 자신일 때)으로 닫고, 닫힌 뒤 `view.focus()`로 편집 영역에 포커스를 돌립니다.
- **Rationale**: `showModal()`이 뒤 화면을 비활성(inert)으로 만들고(FR-016), 포커스를 대화상자 안에
  가두고, Esc를 처리합니다(FR-015). 포커스 가두기를 직접 구현하지 않습니다.
- **열기 직후 포커스**: 주소 칸에 `autoFocus` 대신 `showModal()` 뒤 `input.focus()` 호출(FR-011).
- **배경**: `::backdrop`은 `rgba(20, 27, 43, 0.24)` 단색. blur 없음(헌장 원칙 VI).
- **Alternatives considered**: 직접 만든 모달(div + 포커스 트랩) — 코드가 늘고 inert 처리를 다시 만듭니다.

## R7. 툴팁 단축키 표기

- **Decision**: `formatShortcut("Mod-Shift-x", isMac)` → macOS `⌘⇧X`, 그 외 `Ctrl+Shift+X`. `Alt`는
  `⌥` / `Alt`. `isMac`은 마운트 후 `navigator.platform`(없으면 `userAgent`)으로 판정합니다. 서버
  렌더(정적 export)에는 플랫폼이 없으므로 첫 렌더는 이름만, 마운트 후 단축키를 붙입니다.
- **Rationale**: 하이드레이션 불일치 없이 플랫폼별 표기를 만듭니다.

## R8. M1 테스트 변경

- `tests/plugins/plugins.test.ts`: 레지스트리 12 → 18, id 순서·묶음 5개로 교체, 번호 목록 기대값
  `[1. x\n1. y]` → `[1. x\n2. y]`, 링크 기대값은 `dialog.submit` 기준으로 교체.
- `tests/plugins/helpers.test.ts`: 기존 3 헬퍼 테스트 유지 + 새 헬퍼(토글·묶음 접두·범위 탐색) 추가.
- 헬퍼 `prefixLines`는 토글 헬퍼로 대체되며, 기존 테스트는 같은 입력에 대한 토글 결과(접두 없음 →
  추가)와 같으므로 기대값을 유지합니다.
