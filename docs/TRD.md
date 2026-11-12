# TRD — 마크다운 에디터 기술 설계서

> **문서 성격**: 기술 요구사항(어떻게). 제품 요구사항은 `PRD.md`, 원본 정의서·전체 코드는 `requirement.md`, 마크다운 기능 스펙은 `markdown-editor-spec.md`.
> **작성 기준일**: 2026-06-26 · **상태**: 그린필드(구현 전)

## 1. 기술 스택 (확정)

| 레이어 | 패키지 | 버전 기준 | 역할 |
|--------|--------|----------|------|
| 프레임워크 | `next` (App Router) | 16.2.x | 라우팅·빌드·배포 |
| UI | `react`, `react-dom` | 19.x | 컴포넌트 |
| 언어 | `typescript` | 5.x | 정적 타입(플러그인 인터페이스 강제) |
| 스타일 | `tailwindcss` | 4.x | 스타일링 |
| 아이콘 | `lucide-react` | latest | 툴바·사이드바 아이콘 |
| 에디터 코어 | `codemirror`, `@codemirror/*` | 6.x | 텍스트 편집(한글 IME 안정) |
| 파서 | `unified`, `remark-parse`, `remark-gfm` | latest | md → AST |
| 렌더 | `remark-rehype`, `rehype-sanitize`, `rehype-stringify` | latest | AST → 안전한 HTML |
| 저장 | `idb` | latest | IndexedDB 래퍼 |
| 상태 | `zustand` | latest | 전역 상태 |
| 리사이즈 | `react-resizable-panels` | latest | 분할 리사이즈 |
| 테스트 | `vitest` | latest | 단위·conformance |

> 정확 버전은 구현 시점 `npm show <pkg> version`으로 고정. 결정 근거는 `requirement.md §0–1`, 할루시네이션 검증표는 `requirement.md §14`.

> ⚠️ **제거 대상**: `jsconfig.json`·`.lsp.json`·`server.mjs` 참조는 Next 확정 이전 바닐라 설정의 잔재다. `create-next-app`이 생성하는 `tsconfig.json`으로 대체하고 `jsconfig.json`은 삭제한다.

## 2. 시스템 아키텍처

배포는 Vercel 정적 호스팅, 런타임은 전부 클라이언트(서버 의존 없음).

```
Next.js App (Client)
├─ app/
│  ├─ page.tsx              대시보드(파일 리스트) — M4
│  └─ editor/[docId]/page.tsx  에디터 화면
├─ components/
│  ├─ sidebar/   Sidebar · FolderTree · NewFolderButton   — M3
│  ├─ editor/    Toolbar · MarkdownEditor(CM6) · Preview(unified)
│  └─ dashboard/ FileList   — M4
├─ plugins/      ★ 태그별 독립 플러그인 + 레지스트리
└─ lib/
   ├─ storage/   IndexedDB(idb): db · folders · documents
   ├─ markdown/  pipeline.ts (remark+rehype)
   └─ store/     useAppStore.ts (Zustand)
```

전체 디렉터리 트리(플러그인 파일 목록 포함)는 `requirement.md §8`.

### 2.1 컴포넌트 의존 관계

| 출발 | 도착 | 관계 |
|------|------|------|
| Toolbar | Plugin Registry | 버튼 = 플러그인 |
| Plugin Registry | MarkdownEditor(CM6) | `apply()` 결과 dispatch |
| MarkdownEditor | Markdown Pipeline | 입력 텍스트 전달 |
| Markdown Pipeline | Preview | 안전한 HTML 출력 |
| Editor Page | Storage | 저장/로드 |
| Zustand Store | Sidebar · Editor Page | 전역 상태 구독 |

## 3. 플러그인 아키텍처 (핵심 계약)

**원칙**: 마크다운 태그 1개 = `plugins/<tag>.ts` 독립 파일 1개. 전부 동일한 `MarkdownPlugin`을 구현하고 `plugins/index.ts` 레지스트리 배열에 등록만 하면 툴바에 자동 로드. **새 태그 추가 시 에디터 코어·툴바 컴포넌트를 수정하지 않는다**(FR-6.4 격리).

### 3.1 인터페이스 — `plugins/types.ts`

```typescript
import type { LucideIcon } from "lucide-react";

export interface EditorState {  // 프레임워크 비종속 모델
  doc: string;
  selectionStart: number;
  selectionEnd: number;
}
export interface EditorChange { doc: string; selectionStart: number; selectionEnd: number; }
export type PluginGroup = "inline" | "block" | "special";

export interface MarkdownPlugin {
  id: string;
  label: string;          // 한글 — aria-label로도 사용(NFR-3)
  icon: LucideIcon;
  group: PluginGroup;
  shortcut?: string;
  apply(state: EditorState): EditorChange;   // 순수 함수
  isActive?(state: EditorState): boolean;    // 토글 표시
}
```

전체 코드(헬퍼 `wrapSelection`/`toggleLinePrefix`, `bold.ts` 예시, `createHeadingPlugin` 팩토리, 레지스트리)는 `requirement.md §7` — `tsc --noEmit` strict 통과 검증본.

### 3.2 동작 타입 4종

| 타입 | 헬퍼 | 해당 기능 | 토글 |
|------|------|----------|------|
| 선택 감싸기(wrap) | `wrapSelection` | 굵게·기울임·코드·취소선 | O |
| 줄 접두(line prefix) | `toggleLinePrefix` | 제목·인용·목록 | O |
| 블록 삽입(block) | `insertBlock` | 코드블록·구분선·표 | △ |
| 입력 다이얼로그(dialog) | — | 링크·이미지 | X |

분류 근거·토글 규칙은 `markdown-editor-spec.md §2`.

### 3.3 CodeMirror 연동

플러그인은 순수 함수이므로 CM6 비종속. 어댑터가 CM6 `EditorView` ↔ `EditorState`(doc/selection)를 변환하고, `apply()`가 돌려준 `EditorChange`를 CM6 트랜잭션으로 `dispatch`한다. 단축키는 CM6 keymap에 `shortcut` 매핑.

> 순수 함수 격리 덕분에 **플러그인 로직은 CM6·React 없이 Vitest로 직접 단위 테스트**할 수 있다(FR-6.5).

## 4. 마크다운 렌더링 파이프라인

```
입력(md)
  → remark-parse      CommonMark 0.31.2 파싱
  → remark-gfm        표·취소선·체크박스·자동링크 리터럴(GFM 확장)
  → remark-rehype     mdast → hast
  → rehype-sanitize   XSS 방어 — 필수(NFR-1)
  → rehype-stringify  HTML 출력
  → 프리뷰 DOM
```

선택 확장: `rehype-katex`(수식), `rehype-highlight`(코드 하이라이트).

**구현 규칙**
- `rehype-sanitize`는 생략 불가. 원시 HTML(`markdown-editor-spec.md §5.3`)을 그대로 렌더하면 XSS.
- **CommonMark 코어 ≠ GFM 확장**: 표·취소선·작업목록·자동링크 리터럴은 GFM. `remark-gfm` 없으면 동작 안 함. 코어/확장 분리 표기는 `markdown-editor-spec.md §0·§7`.
- React 경로는 `react-markdown` + `remarkPlugins=[remarkGfm]` + `rehypePlugins=[rehypeSanitize]` 조합도 동등.
- 디바운스 ≤150ms로 입력→렌더 갱신(NFR-2).

## 5. 데이터 모델 (IndexedDB)

| 스토어 | 키 | 필드 |
|--------|----|----|
| `folders` | `id` (uuid) | `name`, `parentId`(null=루트), `createdAt` |
| `documents` | `id` (uuid) | `folderId`, `title`, `content`(md), `createdAt`, `updatedAt` |

관계: `documents.folderId → folders.id` (1:N). 폴더 중첩은 `folders.parentId` 자기참조 트리.

```
folders (1) ──< documents (N)
   └─ parentId ──> folders (self, 중첩 트리)
```

### 5.1 저장 전략 — 단계별

| 단계 | 저장소 | 비고 |
|------|--------|------|
| M1 단일화면 | `localStorage`(`mdeditor:v1`) | 디자인 프로토타입과 일치. 단일 문서 |
| M3 폴더 도입 | IndexedDB(`idb`) | 폴더/문서 트리 영속. localStorage에서 이관 |
| 선택 | File System Access API | 실제 디스크 `.md` 내보내기/가져오기(Chromium 중심) |

방식별 트레이드오프는 `requirement.md §10`. File System Access API 브라우저 지원은 구현 시점 caniuse 재확인.

## 6. 화면 레이아웃

```
┌──────────────────────────────────────────────────┐
│ 상단바: [M] Markdown Editor   [툴바 아이콘들]      │
├──────────────────────┬───────────────────────────┤
│ ● MARKDOWN           │ ● 미리보기                 │
│ 에디터(CodeMirror 6) │ 프리뷰(unified)            │
│        50%           │        50%                 │
├──────────────────────┴───────────────────────────┤
│ {n}자  |  {n}줄              [취소]  [저장 💾]      │
└──────────────────────────────────────────────────┘
```

폴더 도입 후 좌측에 리사이즈 사이드바 추가(기본 260px / 180–480px). 분할 비율·리사이즈 한계는 `requirement.md §3`. 시각 디테일(색·폰트·간격)은 디자인 `docs/design/project/Markdown Editor.dc.html`에서 직접 읽는다.

## 7. 테스트 전략

- **프레임워크**: Vitest.
- **플러그인 단위 테스트**: `apply()`/`isActive()`가 순수 함수이므로 `EditorState` fixture를 입력해 `EditorChange`를 단언. CM6·React 불필요.
- **Conformance 테스트**: `markdown-editor-spec.md`의 각 기능 `HTML 결과물`(CommonMark 공식 예제 출력)을 파이프라인 기대값으로 사용 → 렌더 회귀 방지.
- **TDD 마일스톤**: `/tdd-red` → `/tdd-green` → `/tdd-refactor`. 진행 상태는 `TDD-IMPLEMENTS.md`(최초 구현 시 생성)에 마일스톤·테스트 파일·상태로 기록.

## 8. 구현 마일스톤

기준은 **`requirement.md §12`(canonical, 7단계)**. 구현은 가치우선으로 M4·M5(에디터·플러그인)를 M2·M3(레이아웃·저장소)보다 먼저 완성했다 — 상태 열 참조.

| 단계 | 범위 | 핵심 산출물 | 상태 |
|------|------|------------|------|
| M1 | 프로젝트 스캐폴딩 | `create-next-app`(TS+Tailwind), 빌드/배포 골격 | ✅ |
| M2 | 레이아웃 | 사이드바+컨텐츠 2분할, 리사이즈(`react-resizable-panels`) | ⬜ ← 다음 |
| M3 | 저장소 | IndexedDB 스키마(`folders`/`documents`)·폴더 CRUD·`[+]` 버튼, localStorage 이관 | ⬜ |
| M4 | 에디터/프리뷰 | CM6 + unified 50:50 + 실시간 렌더(디바운스) | ✅ 선구현 |
| M5 | 플러그인 | `MarkdownPlugin` 인터페이스 + 전체 태그(24종) + 단축키·토글·활성표시 | ✅ 선구현 |
| M6 | 문서 흐름 | 폴더 선택 저장, 파일 리스트, `/editor/[docId]` 네비게이션 | ⬜ |
| M7 | 마감 | sanitize·접근성(aria)·토스트·dirty check·Vercel 검증 | 🔶 대부분 완료 |

**SDD 매핑**: `specs/001-single-screen-editor` → M1+M4+M7 일부 · `specs/002-full-markdown-toolbar` → M5.
원본 마일스톤 표는 `requirement.md §12`. M2(레이아웃)·M3(저장소) 설계 상세는 §2·§5 참조.

## 9. 보안·접근성 체크리스트

- [ ] 프리뷰 렌더 전 `rehype-sanitize` 적용(NFR-1)
- [ ] 툴바 버튼 전부 한글 `aria-label`(= 플러그인 `label`) + 키보드 포커스(NFR-3)
- [ ] 단축키 IME 충돌 없음(한글 입력 중 동작 확인)
- [ ] 미저장 이탈 경고(FR-C-4)
- [ ] UI·HTML 생성물은 `.claude/rules/anti-ai-slop.md` 준수
