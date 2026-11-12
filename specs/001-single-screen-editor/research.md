# Research: 단일 화면 마크다운 에디터 (M1)

조사일 2026-11-12. 버전은 같은 날 `npm show <pkg> version` 결과입니다.

## R1. 스캐폴딩 방법

- **Decision**: `create-next-app@16.4.6`을 빈 임시 디렉터리에서 실행하고, 생성된 파일을 저장소 루트로
  옮깁니다. 옵션은 `--ts --tailwind --app --src-dir --empty --use-npm --import-alias "@/*" --yes
  --disable-git --skip-install`입니다. `--yes`가 남은 대화형 질문을 기본값으로 채워 자동 실행이 멈추지
  않습니다. 16.4.6 `--help`에는 린터 끄기 플래그가 없으므로, 기본값으로 ESLint 설정이 생기면 이동 후
  `eslint.config.mjs`와 `package.json`의 `eslint*` devDependencies·`lint` script를 삭제합니다.
  `AGENTS.md`(기본 생성)는 옮기지 않습니다. `jsconfig.json`은 삭제합니다(TRD §1 지시).
- **Rationale**: create-next-app은 허용 목록 밖 파일(`README.md`, `CLAUDE.md`, `.claude/`, `.specify/`,
  `specs/`, `jsconfig.json`)이 있는 디렉터리에서 실행을 거부합니다. 임시 디렉터리에서 만들면 기존
  문서를 건드리지 않습니다.
- **Alternatives considered**: 수동으로 `package.json`·설정 작성 — Tailwind 4·Next 16 설정 조합을 직접
  맞춰야 해서 오류 여지가 큽니다. ESLint 포함 — 품질 게이트가 `tsc --noEmit` + Vitest로 정해져 있어
  M1에서는 넣지 않습니다.

## R2. 배포 형태

- **Decision**: `next.config.ts`에 `output: "export"`를 설정해 `out/`에 정적 파일만 만듭니다.
- **Rationale**: 헌장 원칙 V(서버 없음)와 FR-016을 빌드 단계에서 강제합니다. 서버 기능을 쓰면 빌드가
  실패하므로 위반이 조기에 드러납니다. Vercel은 정적 export를 무설정으로 배포합니다.
- **Alternatives considered**: 기본 출력(서버 런타임 포함) — 동작은 하지만 서버 의존 코드가 섞여도
  빌드가 막지 않습니다.

## R3. 버전 고정

| 패키지 | 버전 | 비고 |
|--------|------|------|
| `next` | 16.4.6 | Node ≥ 20.9 필요, 로컬 Node 24.20.0 |
| `react`, `react-dom` | 19.3.1 | |
| `typescript` | 5.9.3 | 최신은 7.0.2지만 헌장 기술 제약이 TS 5입니다 |
| `tailwindcss` | 4.3.5 | |
| `@codemirror/state` | 6.7.6 | |
| `@codemirror/view` | 6.43.15 | |
| `@codemirror/commands` | 6.11.1 | history·기본 keymap |
| `@codemirror/lang-markdown` | 6.5.2 | 에디터 내 구문 강조 |
| `unified` | 11.0.5 | |
| `remark-parse` | 11.0.0 | |
| `remark-gfm` | 4.0.1 | |
| `remark-rehype` | 11.1.2 | |
| `rehype-raw` | 7.0.0 | 헌장 1.0.1 스택 — R5 참조 |
| `rehype-sanitize` | 6.0.0 | |
| `rehype-stringify` | 10.0.1 | |
| `lucide-react` | 1.72.0 | 툴바 아이콘 |
| `pretendard` | 1.3.9 | 헌장 1.0.1 스택 — R9 참조 |
| `vitest` | 5.1.0 | |

M1에서 쓰지 않는 스택(`idb`, `zustand`, `react-resizable-panels`)은 설치하지 않습니다. 각각 M3, 전역
상태가 필요한 시점, M2에서 추가합니다.

## R4. 에디터 구성

- **Decision**: `codemirror` 메타 패키지의 `basicSetup` 대신 필요한 확장만 씁니다 —
  `history`, `defaultKeymap`·`historyKeymap`, `markdown()`, `EditorView.lineWrapping`, `placeholder`.
  CM6 인스턴스는 클라이언트 컴포넌트의 `useEffect`에서 만들고 파괴합니다.
- **Rationale**: 디자인 시안은 줄번호·접기·활성 줄 강조가 없는 평문 편집 영역입니다. `basicSetup`은
  이 요소를 켜서 시안과 달라집니다. CM6는 IME 조합을 자체 처리하므로 FR-003을 충족합니다.
- **Alternatives considered**: `<textarea>` — 시안과 같지만 헌장 기술 제약(CM6)과 TRD를 위반합니다.

## R5. 원시 HTML 처리 (Clarification Q2)

- **Decision**: 파이프라인을 `remark-parse → remark-gfm → remark-rehype({ allowDangerousHtml: true }) →
  rehype-raw → rehype-sanitize(defaultSchema) → rehype-stringify`로 구성합니다.
- **Rationale**: `remark-rehype`는 원시 HTML을 `raw` 노드로만 넘깁니다. `rehype-sanitize`는 `raw` 노드를
  통째로 제거하므로, `rehype-raw` 없이는 `<kbd>`도 렌더되지 않아 Q2 답(안전한 태그 렌더)을 충족할 수
  없습니다. `rehype-raw`가 `raw`를 실제 요소로 파싱한 뒤 sanitize가 허용 목록으로 거릅니다.
  `defaultSchema`가 GitHub 허용 목록(`kbd`, `details`, `summary`, `sub`, `sup`, 작업목록 `input` 포함)입니다.
- **Alternatives considered**: `rehype-raw` 없이 sanitize만 — 안전하지만 Q2와 CommonMark §5.3 기대값
  불일치. sanitize 스키마 직접 작성 — 허용 목록 유지 비용이 생기고 누락 위험이 있습니다.
- **Constraint**: `rehype-raw`는 반드시 `rehype-sanitize` 앞에 둡니다. 뒤에 두면 정제 이후 HTML이
  생겨 원칙 II 위반입니다.

## R6. 프리뷰 갱신 타이밍 (FR-004, SC-001, SC-003)

- **Decision**: 편집 내용 변경 시 100ms 디바운스 후 파이프라인을 동기 실행하고, 결과 HTML을
  `dangerouslySetInnerHTML`로 넣습니다. 문자 수·줄 수도 같은 디바운스 값으로 계산합니다.
- **Rationale**: 갱신 예산 150ms = 디바운스 100ms + 렌더 50ms 이내. 키 입력마다 파이프라인을 돌리면
  1만 자에서 키 입력 처리 시간이 늘어 SC-003(50ms)을 넘을 수 있습니다. 입력 표시는 CM6가 즉시
  처리하므로 디바운스가 타이핑 지연을 만들지 않습니다.
- **Alternatives considered**: `useDeferredValue` — 지연 상한이 없어 150ms 보장을 증명할 수 없습니다.
  Web Worker — 1만 자 규모에서는 직렬화 비용 대비 이득이 확인되지 않았습니다. 측정 결과 50ms를 넘으면
  그때 도입합니다.

## R7. 문자 수 계산 (Clarification Q3)

- **Decision**: `Intl.Segmenter("ko", { granularity: "grapheme" })`로 grapheme을 셉니다. 숫자는
  `toLocaleString("ko-KR")`로 천 단위 쉼표를 붙입니다. 줄 수 = `split("\n").length`.
- **Rationale**: 표준 API라 의존성이 없고, 이모지·결합 문자를 1자로 셉니다. 지원 대상 브라우저 4종
  최근 2개 버전 모두 `Intl.Segmenter`를 지원합니다.
- **Alternatives considered**: `[...str].length` — 코드포인트 단위라 결합 문자(`e` + `◌́`)를 2자로 셉니다.
  `str.length` — 시안 방식, Q3에서 기각.

## R8. 저장 (FR-011–FR-015)

- **Decision**: `localStorage` 키 `mdeditor:v1`에 본문 문자열을 그대로 저장합니다(시안과 같은 키·형식).
  저장 모듈은 `Storage` 객체를 인자로 받는 함수 2개(`loadDocument`, `saveDocument`)로 만들고, 예외를
  잡아 결과 객체(`{ ok: true } | { ok: false }`)로 돌려줍니다.
- **Rationale**: `setItem`은 용량 초과(`QuotaExceededError`)·차단(`SecurityError`)에서 예외를 던집니다.
  결과 객체로 바꾸면 UI가 성공·실패 알림을 분기하기 쉽습니다. `Storage`를 인자로 받으면 jsdom 없이
  가짜 객체로 테스트합니다.
- **Save source**: [저장]은 디바운스된 값이 아니라 CM6의 현재 문서(`view.state.doc.toString()`)를
  저장합니다. 디바운스 값을 쓰면 마지막 100ms 입력이 빠집니다.
- **Alternatives considered**: IndexedDB — 헌장 원칙 V가 M1에 `localStorage`를 허용하고, 문서 1개에는
  비동기 API가 불필요합니다.

## R9. 폰트

- **Decision**: JetBrains Mono는 `next/font/google`, Pretendard는 `pretendard` 패키지의 가변 woff2를
  `next/font/local`로 불러옵니다. 둘 다 빌드 시 `out/`에 포함돼 외부 요청이 없습니다.
- **Rationale**: 헌장 기술 제약이 두 폰트를 지정합니다. Pretendard는 Google Fonts에 없어 로컬 파일이
  필요합니다.
- **Alternatives considered**: CDN `<link>` — 실행 시 외부 요청이 생기고 오프라인에서 폰트가 빠집니다.

## R10. 시안 대비 시각 변경 (원칙 VI)

| 시안 | 변경 | 근거 |
|------|------|------|
| 로고 `linear-gradient(#3b5bdb, #5b73e8)` | 단색 `#3b5bdb` | 그라데이션 금지 |
| 알림 `box-shadow: 0 8px 28px …` | 그림자 없음 | blur ≥ 20px 금지 |
| 알림 `toastIn .22s` 등장 애니메이션 | 없음 | 장식 모션 금지 |
| 버튼·알림·`pre`·표 radius 9–10px | 8px | radius 0–8px |
| 인용 `border-left` + radius `0 8px 8px 0` | radius 0 | 한쪽 테두리엔 radius 0 |
| 표 `box-shadow: 0 0 0 1px` 링 | `border: 1px solid #e6eaf2` | 구획은 border로 |
| 보조 글자색 `#98a1b2`·`#99a2b3` (2.5–2.6:1) | `#6b7385` (4.6–4.8:1) | WCAG AA 4.5:1 |
| 취소선 글자색 `#94a3b8` (2.56:1) | `#6b7385` | 본문 텍스트 대비 |
| placeholder `#b3bccb` (1.86:1) | `#6b7385` | 대비 |

대비값은 WCAG 상대휘도 공식으로 계산했습니다.
