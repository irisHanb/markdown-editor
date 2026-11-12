# Markdown Editor Constitution

## Core Principles

### I. 플러그인 격리

- 마크다운 태그 1개는 `src/plugins/<tag>.ts` 독립 파일 1개로 구현해야 합니다(MUST).
- 모든 플러그인은 동일한 `MarkdownPlugin` 인터페이스를 구현해야 합니다(MUST).
- 새 태그 추가는 플러그인 파일 1개 작성과 `plugins/index.ts` 레지스트리 1줄 추가로 끝나야
  합니다. 에디터 코어·툴바 컴포넌트를 수정해서는 안 됩니다(MUST NOT).
- `apply`·`isActive`는 `EditorState → EditorChange` 순수 함수여야 하며 CodeMirror·React에
  의존해서는 안 됩니다(MUST NOT).
- 동작 타입 4종(감싸기·줄 접두·블록 삽입·다이얼로그)은 `plugins/helpers.ts` 공통 헬퍼로
  처리해야 합니다(SHOULD). 같은 로직을 플러그인마다 복제하지 않습니다.

근거: 기능 확장이 코어 수정 없이 파일 추가로만 일어나야 회귀 범위가 플러그인 1개로
한정됩니다. 순수 함수여야 CM6·React 없이 Vitest로 단위 테스트할 수 있습니다(FR-6.4, FR-6.5).

### II. 안전한 렌더링 (NON-NEGOTIABLE)

- 프리뷰 파이프라인은 `remark-parse → remark-gfm → remark-rehype → rehype-raw →
  rehype-sanitize → rehype-stringify` 순서를 따라야 합니다(MUST).
- `rehype-raw`는 원시 HTML을 요소로 파싱하는 단계이며 반드시 `rehype-sanitize` 앞에 둡니다.
  sanitize 뒤에 HTML을 만드는 단계를 두어서는 안 됩니다(MUST NOT).
- `rehype-sanitize`는 어떤 경로에서도 생략·우회해서는 안 됩니다(MUST NOT).
  `dangerouslySetInnerHTML`에는 sanitize를 거친 HTML만 넣습니다.
- sanitize 스키마를 완화하는 변경은 XSS 회귀 테스트를 함께 추가해야 합니다(MUST).

근거: 사용자가 원시 HTML을 입력할 수 있으므로 정제 없는 렌더는 곧 XSS입니다(NFR-1).

### III. 명세 정확성

- 프리뷰 출력은 CommonMark 0.31.2 공식 출력과 일치해야 합니다(MUST).
- 표·취소선·작업목록·자동링크 리터럴은 GFM 확장으로 분류해야 하며, 코드·문서·테스트에서
  CommonMark 코어와 섞어 표기해서는 안 됩니다(MUST NOT).
- 렌더 기대값은 `docs/markdown-editor-spec.md`의 `HTML 결과물`을 출처로 삼아야 합니다(MUST).

근거: 핵심 가치가 "추측 없는 정확한 프리뷰"이므로, 정확성의 기준이 공식 명세 하나로
고정돼 있어야 합니다.

### IV. 테스트 우선 (NON-NEGOTIABLE)

- 구현 전에 실패하는 테스트를 먼저 작성해야 합니다(MUST). 순서는
  `/tdd-red → /tdd-green → /tdd-refactor`입니다.
- 플러그인 `apply`·`isActive`는 `EditorState` fixture 입력과 `EditorChange` 단언으로
  단위 테스트해야 합니다(MUST).
- 렌더 파이프라인은 원칙 III의 기대값으로 conformance 테스트를 갖춰야 합니다(MUST).
- TDD 진행 상태는 `TDD-IMPLEMENTS.md`에 마일스톤·테스트 파일·상태로 기록합니다.

근거: 플러그인 24종과 파이프라인이 서로 독립이라, 테스트가 없으면 한 태그 수정이 다른
태그를 깨뜨려도 발견할 수단이 없습니다.

### V. 로컬 우선·서버리스

- 앱은 계정·백엔드·서버 API 없이 정적 호스팅과 클라이언트 코드만으로 동작해야 합니다(MUST).
- 문서는 사용자 브라우저에만 저장합니다. 영속 저장소는 IndexedDB(`idb`)의
  `folders`·`documents` 스토어입니다. 단일 화면 단계(M1)만 `localStorage`(`mdeditor:v1`)를
  허용하며, 폴더 도입 시 IndexedDB로 이관해야 합니다(MUST).
- 새로고침·재방문 후 저장한 문서가 보존돼야 합니다(MUST, NFR-7).
- 미저장 변경이 있는 상태로 이탈하면 경고해야 합니다(SHOULD, FR-C-4).

근거: 제품 약속이 "계정·서버 불필요"이고 배포 대상이 Vercel 정적 호스팅입니다(NFR-6).

### VI. 절제된 디자인과 접근성

- UI·HTML·SVG 생성물은 `.claude/rules/anti-ai-slop.md`를 따라야 합니다(MUST). 그라데이션,
  컬러 그림자, 장식 모션, 배경 장식을 쓰지 않습니다.
- 시각 기준은 `docs/design/project/Markdown Editor.dc.html`입니다. 시각만 맞추고 프로토타입의
  내부 구조(`<textarea>`, 정규식 렌더러)는 복제하지 않습니다.
- 툴바 버튼은 전부 한글 `aria-label`(= 플러그인 `label`)을 갖고 키보드로 포커스할 수
  있어야 합니다(MUST, NFR-3).
- 본문 텍스트 색 대비는 WCAG AA(4.5:1) 이상이어야 합니다(MUST).
- 단축키는 한글 IME 조합 중 오동작해서는 안 됩니다(MUST NOT).

근거: 대상 사용자가 매일 쓰는 도구이므로 위계는 장식이 아니라 타이포·여백으로 만들고,
키보드 사용자를 배제해서는 안 됩니다.

## 기술 제약

- 확정 스택: Next.js 16(App Router), React 19, TypeScript 5, Tailwind CSS 4, CodeMirror 6,
  unified(remark/rehype, `rehype-raw` 포함), `idb`, Zustand, `react-resizable-panels`, Vitest,
  `pretendard`(본문 폰트 파일).
  결정 근거는 `docs/requirement.md §0–1`입니다.
- 스택 밖 의존성 추가는 기존 의존성·표준 API로 해결할 수 없다는 근거를 plan.md에 남겨야
  합니다(MUST).
- 패키지 버전은 구현 시점 `npm show <pkg> version`으로 확인해 정확한 버전으로 고정합니다.
- 성능: 프리뷰 갱신 디바운스는 150ms 이하여야 하며, 1만 자 문서에서 입력 지연이 없어야
  합니다(MUST, NFR-2).
- 배포: `npm run build`가 Vercel 무설정으로 통과해야 합니다(MUST, NFR-6).
- UI 문자열은 한글 기본이며 상수로 분리합니다(SHOULD, NFR-5).
- 폰트는 Pretendard(본문)·JetBrains Mono(에디터·코드), 액센트는 `#3b5bdb` 1색입니다.

## 개발 워크플로

- 명세 우선: spec 없는 구현은 금지합니다(MUST NOT). 순서는
  `/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks →
  /speckit-analyze → /speckit-implement`입니다.
- 산출물 위치는 `specs/<feature>/{spec,plan,tasks}.md`입니다.
- 마일스톤 기준은 `docs/requirement.md §12`(M1–M7)이며, 각 spec은 대응 마일스톤을 밝혀야
  합니다(MUST).
- plan.md의 Constitution Check는 원칙 I–VI을 항목별로 점검해야 합니다(MUST). 위반은
  Complexity Tracking에 사유와 기각한 대안을 적어야 합니다.
- 머지 전 품질 게이트: `npm test` 전부 통과, `npm run build` 통과, `tsc --noEmit` 오류 0건.
- 커밋 메시지와 문서는 한국어 합쇼체로 씁니다.

## Governance

- 이 헌장은 다른 개발 관행·문서보다 우선합니다. `CLAUDE.md`·PRD·TRD가 헌장과 충돌하면
  헌장을 따르고 해당 문서를 고칩니다.
- 개정은 `/speckit-constitution`으로 하며, 상단 Sync Impact Report에 변경 내역을 적어야
  합니다(MUST).
- 버전 규칙(SemVer):
  - MAJOR: 원칙 삭제 또는 기존 원칙을 호환되지 않게 재정의
  - MINOR: 원칙·섹션 추가 또는 지침의 실질적 확대
  - PATCH: 문구 명확화, 오탈자 수정
- 준수 점검: `/speckit-plan`의 Constitution Check와 `/speckit-analyze`에서 원칙 위반을
  확인합니다. 정당화되지 않은 위반은 구현 전에 해소해야 합니다(MUST).
- 런타임 개발 지침은 `CLAUDE.md`를 따릅니다.

**Version**: 1.0.1 | **Ratified**: 2026-11-12 | **Last Amended**: 2026-11-12
