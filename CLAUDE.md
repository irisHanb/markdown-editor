# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 상태 — 구현 진행 중

`src/`·`package.json` 생성됨. 에디터·프리뷰·툴바·로컬 저장 동작, Vitest 88/88 GREEN, 빌드 통과. SDD 산출물은 `specs/001-single-screen-editor`(에디터 단일화면)·`specs/002-full-markdown-toolbar`(툴바 완성)에 있다.

확정 스택(2026-06 결정): **Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + CodeMirror 6 + unified(remark/rehype) + IndexedDB(`idb`) + Zustand**. 근거·버전은 `docs/requirement.md §0–1`. (현재 저장은 `localStorage`, 폴더 도입 시 IndexedDB로 이관.)

### 마일스톤 — `docs/requirement.md §12`가 기준(canonical)

7단계. 구현은 **가치우선**으로 진행돼 M4·M5(에디터·플러그인)를 M2·M3(레이아웃·저장소)보다 먼저 완성했다(순서 뒤섞임에 유의).

| 단계 | 범위 | 상태 |
|------|------|------|
| M1 | 프로젝트 스캐폴딩 (Next+TS+Tailwind) | ✅ 완료 |
| M2 | **레이아웃 — 사이드바+컨텐츠 2분할, 리사이즈** | ⬜ 미착수 (← **다음 작업**) |
| M3 | 저장소 — IndexedDB 스키마, 폴더 CRUD, `+` 버튼 | ⬜ 미착수 |
| M4 | 에디터/프리뷰 — CodeMirror 6 + unified 50:50, 실시간 렌더 | ✅ 완료(선구현) |
| M5 | 플러그인 — `MarkdownPlugin` + 전체 태그(24종) | ✅ 완료(선구현) |
| M6 | 문서 흐름 — 폴더 선택 저장, 파일 리스트, 네비게이션 | ⬜ 미착수 |
| M7 | 마감 — sanitize·접근성·토스트·dirty check | 🔶 대부분 완료(성능·E2E 수동검증 잔여) |

**SDD 매핑**: `specs/001-single-screen-editor` → M1 + M4 + M7 일부 · `specs/002-full-markdown-toolbar` → M5. (spec 디렉터리명은 가치우선 시기 명명이라 requirement.md 번호와 1:1 아님.) 전체 비전 `docs/PRD.md`, 기술 설계 `docs/TRD.md` — 둘 다 본 표 기준으로 정렬됨.


## 핵심 아키텍처 원칙 (반드시 준수)

### 1. 플러그인 = 마크다운 태그 1개 = 독립 파일 1개

툴바의 각 버튼(굵게/H1/링크 등)은 `src/plugins/<tag>.ts` **독립 모듈 1개**로 구현하고, 모두 동일한 `MarkdownPlugin` 인터페이스를 구현한다. 새 태그 추가 = 파일 1개 작성 + `plugins/index.ts` 레지스트리 배열에 1줄 추가. **에디터 코어·툴바 컴포넌트는 절대 수정하지 않는다**(격리). 인터페이스·헬퍼·예시 코드 원본은 `docs/requirement.md §7`.

```typescript
export interface MarkdownPlugin {
  id: string; label: string; icon: LucideIcon;
  group: "inline" | "block" | "special"; shortcut?: string;
  apply(state: EditorState): EditorChange;     // 순수 함수 — 프레임워크 비종속
  isActive?(state: EditorState): boolean;
}
```

`apply`/`isActive`는 **순수 함수**여야 한다(`EditorState → EditorChange`). CodeMirror·React에 의존하지 않으므로 Vitest로 단위 테스트 가능. 4가지 동작 타입(선택 감싸기 / 줄 접두 / 블록 삽입 / 입력 다이얼로그)은 `wrapSelection`·`toggleLinePrefix` 같은 공통 헬퍼(`plugins/helpers.ts`)로 수렴시킨다.

### 2. 마크다운 파이프라인 — sanitize 필수

```
입력(md) → remark-parse → remark-gfm → remark-rehype → rehype-sanitize → rehype-stringify → 프리뷰 DOM
```

`rehype-sanitize`는 **생략 불가**(XSS 방어, NFR-1). 사용자가 원시 HTML을 입력할 수 있으므로 프리뷰 렌더 전 정제는 보안 요구사항이다.

**CommonMark 코어 ≠ GFM 확장**: 표·취소선·작업목록·자동링크 리터럴은 CommonMark 0.31.2에 없는 **GFM 확장**이다(`remark-gfm` 필요). 코드·문서에서 코어/확장을 혼동하지 말 것. 기능별 문법·HTML 기대값·엣지 규칙 전수는 `docs/markdown-editor-spec.md`.

### 3. 저장소 — IndexedDB(`idb`), 단 M1은 예외

영속화는 IndexedDB의 `folders`/`documents` 스토어로 모델링한다(`documents.folderId → folders.id`, 1:N). 스키마는 `docs/requirement.md §6`. **단, M1 단일화면 단계는 디자인 프로토타입대로 `localStorage`(`mdeditor:v1`)로 시작**해도 무방하며, 폴더 기능 도입 시 IndexedDB로 이관한다.

## SDD 워크플로 (SpecKit)
- 신규 기능은 spec 먼저 — 코드보다 명세가 앞선다
- /speckit.constitution → 프로젝트 구현 원칙·제약 확정
- /speckit.specify → 요구사항 명세  ·  /speckit.clarify → 모호함 해소
- /speckit.plan → tasks → implement  (구현 전 /speckit.analyze 정합성 점검)
- 산출물 위치: specs/<feature>/{spec,plan,tasks}.md  ·  spec 없는 구현 금지


## 명령어

아직 `package.json` 없음. 스캐폴딩 후 표준 Next 명령 사용:

```bash
# 최초 스캐폴딩
npx create-next-app@latest . --ts --tailwind --app
# 정확 버전 고정 — 구현 시점 재확인
npm show <pkg> version

npm run dev        # 개발 서버 (Turbopack)
npm run build      # 프로덕션 빌드 (Vercel 배포 검증)
npm test           # Vitest 전체
npx vitest run <path>   # 단일 테스트 파일
```

## 디자인 레퍼런스

`docs/design/project/Markdown Editor.dc.html` = 확정 시각 디자인(단일 화면 분할: 툴바 / 에디터 / 프리뷰 / 하단 상태바·저장).
- **시각만 픽셀 매칭**, 내부 구조는 복제하지 않는다. 프로토타입은 `<textarea>`+정규식 렌더러+`localStorage`지만 실제 구현은 **CodeMirror 6 + unified + IndexedDB**다.
- 폰트: Pretendard(본문) / JetBrains Mono(에디터·코드). 액센트 1색(파랑 `#3b5bdb`).
- 프로토타입 제목의 "터미널 단축키"는 **샘플 콘텐츠(SAMPLE_MD)일 뿐** 앱 이름이 아니다. 앱명은 "Markdown Editor".

UI·HTML·SVG·슬라이드 생성 시 **`.claude/rules/anti-ai-slop.md` 강제**: 그라데이션·컬러 그림자·글로우·장식 모션·배경 워터마크 금지. 위계는 크기·여백·정렬·타이포로, 폰트는 system 기본값 수렴 금지.

## 문서 지도

| 문서 | 역할 |
|------|------|
| `docs/PRD.md` | 제품 요구사항 — 무엇을/왜, 사용자 흐름, 범위·마일스톤 |
| `docs/TRD.md` | 기술 설계 — 아키텍처, 데이터 모델, 플러그인 계약, 파이프라인, 테스트 |
| `docs/requirement.md` | 원본 요구사항 정의서(스택 결정·플러그인 코드·디렉터리 구조 상세) |
| `docs/markdown-editor-spec.md` | CommonMark 0.31.2 기능별 문법→HTML 레퍼런스(테스트 기대값 출처) |

## 비고

- Stop 훅이 매 응답 후 `extract-my-prompts.sh`로 `prompt.md`에 사용자 프롬프트를 증분 기록한다(`.claude/settings.json`). 의도된 동작이니 놀라지 말 것.
- 문서 내 다이어그램은 PlantUML 대신 **트리+표 텍스트 표기**를 쓴다.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/007-release-hardening/plan.md` (M7 마감 — 성능·접근성·안전종료·배포 검증, 진행 중).
완료 SDD: 001(에디터)·002(툴바)·003(사이드바)·004(저장소)·005(에디터보강 M4)·006(문서흐름·라우팅 M6).
M7 산출물: `research.md`(키보드리사이즈·대비·성능·클라네비 가드), `data-model.md`(신규모델 없음), `quickstart.md`(통합 수동·자동 검증), `contracts/`(accessibility·performance·save-feedback).
M7 감사 발견 결함: `--danger` 토큰 미정의(FolderSelect 사용)·`--fg-faint` 대비 2.6:1(AA 미달)·토스트 성공/실패 미구분·대시보드 링크 dirty 가드 없음.
<!-- SPECKIT END -->
