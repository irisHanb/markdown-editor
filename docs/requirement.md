# 마크다운 에디터 웹앱 — 요구사항 정의서 (requirement.md)

> **프로젝트**: 웹 기반 마크다운 에디터 (폴더/문서 관리 + 실시간 프리뷰 + 플러그인 툴바)
> **참고 스펙**: `markdown-editor-spec-commonmark.md` (CommonMark 0.31.2 기반, 본 문서의 툴바·렌더링 기준)
> **작성 기준일**: 2026-06-25 (버전·아이콘·코드 전수 검증 완료)

---

## 0. 결론 — 핵심 결정 요약

| 항목 | 결정 | 근거 |
|------|------|------|
| 프레임워크 | **Next.js 16.2.x (App Router)** | 현재 stable, Turbopack 기본, Vercel 1-클릭 배포 |
| 언어 | **TypeScript 5.x** | 타입 안정성, 플러그인 인터페이스 강제 |
| UI | **React 19** | Next 16 기본, React Compiler 1.0 stable |
| 스타일 | **Tailwind CSS 4** | 유틸리티 기반, 디자인 토큰 관리 용이 |
| 아이콘 | **lucide-react** | 요구사항 지정, 마크다운 태그 아이콘 완비 |
| 에디터 코어 | **CodeMirror 6** | 확장(plugin) 모델, 한글 IME 안정 |
| 렌더링 | **unified (remark + rehype)** + `rehype-sanitize` | CommonMark+GFM 정확 렌더, XSS 방어 |
| 로컬 저장소 | **IndexedDB (1차)** + File System Access API (선택) | 크로스 브라우저 + Vercel 서버리스 무관 |
| 상태관리 | **Zustand** | 경량, 에디터/사이드바 전역 상태 |
| 배포 | **Vercel** | Next.js 네이티브, 정적+서버리스 |

**핵심 아키텍처 원칙**: 마크다운 툴바의 **각 태그(굵게/H1/링크 등) = 독립 플러그인 모듈 1개**. 모든 플러그인은 동일한 `MarkdownPlugin` 인터페이스를 구현하며 레지스트리 배열에 등록만 하면 툴바에 자동 로드된다. (§8 인터페이스 스펙 참조)

---

## 1. 기술 스택 상세

| 레이어 | 패키지 | 버전 기준 | 역할 |
|--------|--------|----------|------|
| 런타임 | Node.js | 20+ (Next 16 최소) | 빌드/개발 서버 |
| 프레임워크 | `next` | 16.2.x | 라우팅, 빌드, 배포 |
| UI | `react`, `react-dom` | 19.x | 컴포넌트 |
| 언어 | `typescript` | 5.x | 정적 타입 |
| 스타일 | `tailwindcss` | 4.x | 스타일링 |
| 아이콘 | `lucide-react` | latest | 툴바/사이드바 아이콘 |
| 에디터 | `codemirror`, `@codemirror/*` | 6.x | 텍스트 편집 코어 |
| 파서 | `unified`, `remark-parse`, `remark-gfm` | 최신 | 마크다운 → AST |
| 렌더 | `remark-rehype`, `rehype-sanitize`, `rehype-stringify` | 최신 | AST → 안전한 HTML |
| 부가 렌더 | `rehype-katex`(+`katex`), `rehype-highlight` | 최신 | 수식/코드 하이라이트 (선택) |
| 저장 | `idb` (IndexedDB 래퍼) | 최신 | 로컬 폴더/문서 영속화 |
| 상태 | `zustand` | 최신 | 전역 상태 |
| 리사이즈 | `react-resizable-panels` | 최신 | 사이드바/에디터 분할 리사이즈 |

> ⚠️ **녹화/구현 시점 재확인**: 패키지 정확 버전은 `npm show <pkg> version`으로 최종 확인. 본 문서는 2026-06 기준.

---

## 2. 시스템 아키텍처

### 2.1 컴포넌트 구성도

```text
Vercel (Static Hosting)
  └─[배포]─> Next.js App (Client)

Next.js App (Client)
├─ Dashboard Page
├─ Editor Page
├─ Sidebar
│  ├─ FolderTree
│  ├─ ResizeHandle
│  └─ NewFolderButton
├─ Content Area (50:50)
│  ├─ Toolbar
│  ├─ MarkdownEditor (CodeMirror 6)
│  └─ Preview (unified render)
├─ Plugin Registry
│  ├─ bold.ts
│  ├─ heading.ts
│  ├─ link.ts
│  └─ … 태그별 독립 모듈
└─ lib
   ├─ Storage (IndexedDB / idb)
   ├─ Markdown Pipeline (remark+rehype)
   └─ Zustand Store
```

### 2.2 컴포넌트 의존 관계

| 출발 | 도착 | 관계 |
|------|------|------|
| Dashboard Page | Storage | 폴더/파일 목록 조회 |
| Dashboard Page | Editor Page | 파일 클릭 시 이동 |
| Editor Page | MarkdownEditor (CodeMirror 6) | 에디터 렌더 |
| Editor Page | Preview (unified render) | 프리뷰 렌더 |
| Toolbar | Plugin Registry | 버튼 = 플러그인 |
| Plugin Registry | MarkdownEditor (CodeMirror 6) | `apply()` 결과 dispatch |
| MarkdownEditor (CodeMirror 6) | Markdown Pipeline | 입력 텍스트 전달 |
| Markdown Pipeline | Preview (unified render) | 안전한 HTML 출력 |
| Editor Page | Storage | 저장 버튼 → md 저장 |
| Zustand Store | Sidebar | 전역 상태 구독 |
| Zustand Store | Editor Page | 전역 상태 구독 |
| Static Hosting (Vercel) | Dashboard Page | 정적 배포 |

---

## 3. 화면 레이아웃 (와이어프레임)

```text
┌──────────────────────────────────────────────────────────────────┐
│  상단 바: [앱명]            [폴더 경로 선택 ▼]   [저장 💾]          │
├───────────────┬──────────────────────────────────────────────────┤
│  사이드바     │  툴바: H1 H2 H3 H4 H5 H6 | B I S | <> ▢ | 🔗 🖼     │
│  (리사이즈)   │        " • 1. ☑ | ▦ — ↵                            │
│               ├───────────────────────────┬──────────────────────┤
│  [+] 폴더생성 │                           │                      │
│  📁 폴더A     │   마크다운 에디터          │   프리뷰             │
│   └ 📄 doc1   │   (CodeMirror 6)          │   (실시간 렌더)      │
│   └ 📄 doc2   │                           │                      │
│  📁 폴더B     │        50%                │        50%           │
│   └ 📄 doc3   │                           │                      │
│               │                           │                      │
└───────────────┴───────────────────────────┴──────────────────────┘
```

[스크린샷 영역: 실제 구현 후 대시보드 전체 화면 캡처]

**레이아웃 분할 비율**

| 영역 | 기본 너비 | 리사이즈 | 최소/최대 |
|------|----------|---------|----------|
| 사이드바 | 260px | 가능(드래그) | 180px / 480px |
| 에디터 | 잔여 영역의 50% | 가능(드래그) | 30% / 70% |
| 프리뷰 | 잔여 영역의 50% | 에디터와 연동 | 30% / 70% |

---

## 4. 기능 요구사항 (Functional Requirements)

### FR-1. 대시보드 레이아웃

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-1.1 | 화면은 좌측 사이드바 + 우측 컨텐츠 영역 2분할로 구성한다 | 필수 |
| FR-1.2 | 우측 컨텐츠는 상단 툴바 + 하단 (에디터 50 : 프리뷰 50)으로 구성한다 | 필수 |
| FR-1.3 | 대시보드 진입 시 로컬 저장소의 폴더/파일 목록을 사이드바에 렌더한다 | 필수 |

### FR-2. 사이드바 (폴더/문서 관리)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-2.1 | 사이드바 상단 **`+` 버튼(FolderPlus 아이콘)**으로 새 폴더를 생성한다 | 필수 |
| FR-2.2 | 폴더 하위에 마크다운 문서를 트리 형태로 표시한다 (폴더 > 문서) | 필수 |
| FR-2.3 | 폴더는 접기/펼치기(toggle) 가능하다 | 권장 |
| FR-2.4 | 사이드바는 우측 경계 드래그로 **너비 리사이즈** 가능하다 | 필수 |
| FR-2.5 | 문서 클릭 시 우측 에디터 영역에 해당 문서를 로드한다 (FR-7.4와 연계) | 필수 |
| FR-2.6 | 폴더/문서 우클릭(또는 ⋯ 메뉴)으로 이름변경/삭제 제공 | 권장 |

### FR-3. 문서 생성

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-3.1 | 새 문서 생성 시 상단 영역에서 **저장할 폴더 경로(폴더명)를 선택**한다 | 필수 |
| FR-3.2 | 폴더 선택 후 제목 입력 → **저장 버튼**으로 해당 폴더 하위에 문서를 저장한다 | 필수 |
| FR-3.3 | 폴더 미선택 시 저장을 막고 안내 메시지를 표시한다 | 필수 |
| FR-3.4 | 동일 폴더 내 중복 파일명은 경고하거나 자동 접미사(`-1`) 처리한다 | 권장 |

### FR-4. 에디터 / 프리뷰

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-4.1 | 에디터(좌) : 프리뷰(우)를 **50:50** 비율로 표시한다 | 필수 |
| FR-4.2 | 에디터 입력 시 프리뷰가 **실시간(디바운스 ≤150ms)**으로 갱신된다 | 필수 |
| FR-4.3 | 프리뷰는 CommonMark 0.31.2 + GFM 확장(표/취소선/체크박스)을 렌더한다 | 필수 |
| FR-4.4 | 프리뷰 렌더 전 `rehype-sanitize`로 원시 HTML을 정제한다 (XSS 방어) | 필수 |
| FR-4.5 | 에디터/프리뷰 사이 경계 드래그로 비율 리사이즈 가능하다 | 권장 |
| FR-4.6 | 에디터/프리뷰 스크롤 동기화 | 선택 |

### FR-5. 툴바 (마크다운 태그 아이콘)

> 스펙 문서의 **모든 태그**를 지원. 아이콘은 lucide-react (전 항목 export 존재 검증 완료, §14).

| 버튼 | 라벨 | lucide 아이콘 (React) | 삽입 문법 | 동작 타입 | 출처(코어/GFM) |
|------|------|----------------------|----------|----------|---------------|
| H1 | 제목1 | `Heading1` | `# ` | 줄 접두 | 코어 |
| H2 | 제목2 | `Heading2` | `## ` | 줄 접두 | 코어 |
| H3 | 제목3 | `Heading3` | `### ` | 줄 접두 | 코어 |
| H4 | 제목4 | `Heading4` | `#### ` | 줄 접두 | 코어 |
| H5 | 제목5 | `Heading5` | `##### ` | 줄 접두 | 코어 |
| H6 | 제목6 | `Heading6` | `###### ` | 줄 접두 | 코어 |
| B | 굵게 | `Bold` | `**…**` | 선택 감싸기 | 코어 |
| I | 기울임 | `Italic` | `*…*` | 선택 감싸기 | 코어 |
| S | 취소선 | `Strikethrough` | `~~…~~` | 선택 감싸기 | GFM |
| `<>` | 인라인 코드 | `Code` | `` `…` `` | 선택 감싸기 | 코어 |
| ▢ | 코드 블록 | `SquareCode` | ` ```lang ` | 블록 삽입 | 코어 |
| 🔗 | 링크 | `Link` | `[…](url)` | 다이얼로그 | 코어 |
| 🖼 | 이미지 | `Image` | `![…](url)` | 다이얼로그 | 코어 |
| " | 인용구 | `Quote` | `> ` | 줄 접두 | 코어 |
| • | 글머리 목록 | `List` | `- ` | 줄 접두 | 코어 |
| 1. | 번호 목록 | `ListOrdered` | `1. ` | 줄 접두 | 코어 |
| ☑ | 작업 목록 | `ListChecks` | `- [ ] ` | 줄 접두 | GFM |
| ▦ | 표 | `Table` | 표 템플릿 | 블록 삽입 | GFM |
| — | 구분선 | `Minus` | `---` | 블록 삽입 | 코어 |
| ↵ | 강제 줄바꿈 | `WrapText` | 줄 끝 `\` | 줄 끝 삽입 | 코어 |
| 🌐 | 자동 링크 | `Link2` | `<url>` | 선택 감싸기 | 코어 |

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-5.1 | 위 표의 모든 버튼을 툴바에 렌더한다 | 필수 |
| FR-5.2 | 각 버튼 클릭 시 현재 커서/선택 위치에 해당 문법을 삽입/토글한다 | 필수 |
| FR-5.3 | 인라인 버튼은 이미 적용된 서식이면 해제(토글)한다 (`isActive`) | 권장 |
| FR-5.4 | 링크/이미지 버튼은 URL 입력 다이얼로그를 띄운다 | 필수 |
| FR-5.5 | 주요 버튼에 단축키 매핑(굵게 `Mod-b`, 기울임 `Mod-i` 등) | 권장 |

> **참고**: 들여쓰기 코드 블록, 참조 링크, 백슬래시 이스케이프, 엔티티 참조는 **문법으로는 지원**하되 별도 툴바 버튼은 두지 않는다(편집기에서 직접 입력). 필요 시 "더보기(⋯)" 메뉴로 확장.

### FR-6. 플러그인 아키텍처 (독립 소스)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-6.1 | 각 태그는 `plugins/` 하위 **독립 파일 1개**로 구현한다 (예: `bold.ts`) | 필수 |
| FR-6.2 | 모든 플러그인은 공통 `MarkdownPlugin` 인터페이스를 구현한다 | 필수 |
| FR-6.3 | 플러그인은 `plugins/index.ts` 레지스트리 배열에 등록되어 툴바에 자동 로드된다 | 필수 |
| FR-6.4 | 플러그인 추가/수정 시 다른 플러그인·에디터 코어를 수정하지 않는다 (격리) | 필수 |
| FR-6.5 | 플러그인 로직은 프레임워크 비종속(순수 함수)으로 단위 테스트 가능해야 한다 | 권장 |

### FR-7. 저장 / 로컬 저장소 / 파일 네비게이션

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-7.1 | **저장 버튼** 클릭 시 에디터 내용을 지정 폴더 하위에 `.md`로 저장한다 | 필수 |
| FR-7.2 | 저장 위치는 IndexedDB 내 폴더/문서 모델로 영속화한다 (1차) | 필수 |
| FR-7.3 | 대시보드는 로컬 저장소의 파일들을 **리스트 형태**로 출력한다 | 필수 |
| FR-7.4 | 리스트의 파일 클릭 시 **에디터 화면으로 이동**한다 (`/editor/[docId]`) | 필수 |
| FR-7.5 | (선택) File System Access API로 실제 디스크 폴더에 `.md` 내보내기/가져오기 | 선택 |
| FR-7.6 | 저장 성공/실패 토스트 피드백 제공 | 권장 |
| FR-7.7 | 미저장 변경 후 이탈 시 경고(dirty check) | 권장 |

---

## 5. 비기능 요구사항 (Non-Functional)

| ID | 항목 | 요구사항 |
|----|------|---------|
| NFR-1 | 보안 | 프리뷰 렌더 시 `rehype-sanitize` 필수. 사용자 입력 HTML로 인한 XSS 차단 |
| NFR-2 | 성능 | 프리뷰 갱신 디바운스 ≤150ms, 1만 자 문서에서 입력 지연 체감 없음 |
| NFR-3 | 접근성 | 모든 툴바 버튼에 `aria-label`(한글 라벨) 부여, 키보드 포커스 가능 |
| NFR-4 | 반응형 | 데스크톱 우선. 모바일은 에디터/프리뷰 탭 전환으로 대응(선택) |
| NFR-5 | 국제화 | UI 한글 기본. 텍스트 상수 분리로 i18n 확장 여지 확보 |
| NFR-6 | 배포 | Vercel 빌드 무설정 통과. 서버 의존 기능 없이 정적+클라이언트로 동작 |
| NFR-7 | 데이터 | 새로고침/재방문 후에도 폴더·문서 보존(IndexedDB 영속) |

---

## 6. 데이터 모델 (IndexedDB)

| 스토어 | 키 | 필드 |
|--------|----|----|
| `folders` | `id` (string, uuid) | `name`, `parentId(null=루트)`, `createdAt` |
| `documents` | `id` (string, uuid) | `folderId`, `title`, `content(md)`, `createdAt`, `updatedAt` |

**관계**: `documents.folderId → folders.id` (1 폴더 : N 문서). 폴더 중첩이 필요하면 `folders.parentId`로 트리 확장.

[구체적인 내용을 담은 ERD 흐름도: folders(1) ──< documents(N), folders self-relation(parentId)]

---

## 7. 플러그인 인터페이스 스펙 (검증 완료 코드)

> 아래 코드는 `tsc --noEmit` (TypeScript strict) **컴파일 통과** 및 lucide-react 아이콘 export 검증을 마친 실제 동작 코드다.

### 7.1 공통 타입 — `plugins/types.ts`

```typescript
import type { LucideIcon } from "lucide-react";

/** 에디터의 현재 상태(선택 영역 포함) — 프레임워크 비종속 모델 */
export interface EditorState {
  doc: string;
  selectionStart: number;
  selectionEnd: number;
}

/** 플러그인 적용 결과(에디터에 dispatch할 변경) */
export interface EditorChange {
  doc: string;
  selectionStart: number;
  selectionEnd: number;
}

export type PluginGroup = "inline" | "block" | "special";

/** 모든 마크다운 툴바 버튼이 구현하는 공통 인터페이스 */
export interface MarkdownPlugin {
  id: string;
  label: string;
  icon: LucideIcon;
  group: PluginGroup;
  shortcut?: string;
  apply(state: EditorState): EditorChange;
  isActive?(state: EditorState): boolean;
}
```

### 7.2 공통 헬퍼 — `plugins/helpers.ts`

```typescript
import type { EditorState, EditorChange } from "./types";

/** 선택 영역을 좌우 구분자로 감싸는 인라인 헬퍼 */
export function wrapSelection(state: EditorState, marker: string): EditorChange {
  const { doc, selectionStart, selectionEnd } = state;
  const selected = doc.slice(selectionStart, selectionEnd);
  const before = doc.slice(0, selectionStart);
  const after = doc.slice(selectionEnd);
  return {
    doc: `${before}${marker}${selected}${marker}${after}`,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionEnd + marker.length,
  };
}

/** 현재 줄 맨 앞에 접두 문자열을 토글하는 블록 헬퍼 */
export function toggleLinePrefix(state: EditorState, prefix: string): EditorChange {
  const { doc, selectionStart, selectionEnd } = state;
  const lineStart = doc.lastIndexOf("\n", selectionStart - 1) + 1;
  const before = doc.slice(0, lineStart);
  const rest = doc.slice(lineStart);
  const applied = rest.startsWith(prefix);
  const next = applied ? before + rest.slice(prefix.length) : before + prefix + rest;
  const delta = applied ? -prefix.length : prefix.length;
  return { doc: next, selectionStart: selectionStart + delta, selectionEnd: selectionEnd + delta };
}
```

### 7.3 플러그인 예시 — `plugins/bold.ts`

```typescript
import { Bold } from "lucide-react";
import type { MarkdownPlugin } from "./types";
import { wrapSelection } from "./helpers";

export const boldPlugin: MarkdownPlugin = {
  id: "bold",
  label: "굵게",
  icon: Bold,
  group: "inline",
  shortcut: "Mod-b",
  apply: (state) => wrapSelection(state, "**"),
  isActive: (state) =>
    state.doc.slice(state.selectionStart - 2, state.selectionStart) === "**" &&
    state.doc.slice(state.selectionEnd, state.selectionEnd + 2) === "**",
};
```

### 7.4 팩토리 패턴 예시 — `plugins/heading.ts`

```typescript
import { Heading1, Heading2, Heading3, Heading4, Heading5, Heading6 } from "lucide-react";
import type { MarkdownPlugin } from "./types";
import { toggleLinePrefix } from "./helpers";

const icons = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6];

/** H1~H6 제목 플러그인 팩토리 */
export function createHeadingPlugin(level: 1 | 2 | 3 | 4 | 5 | 6): MarkdownPlugin {
  return {
    id: `heading-${level}`,
    label: `제목 H${level}`,
    icon: icons[level - 1],
    group: "block",
    shortcut: `Mod-${level}`,
    apply: (state) => toggleLinePrefix(state, `${"#".repeat(level)} `),
  };
}
```

### 7.5 레지스트리 — `plugins/index.ts`

```typescript
import type { MarkdownPlugin } from "./types";
import { boldPlugin } from "./bold";
import { createHeadingPlugin } from "./heading";

/** 에디터에 로드되는 전체 플러그인 레지스트리. 새 태그는 이 배열에만 추가한다. */
export const markdownPlugins: MarkdownPlugin[] = [
  createHeadingPlugin(1),
  createHeadingPlugin(2),
  createHeadingPlugin(3),
  boldPlugin,
  // italic, strikethrough, code, link, image, quote, list, ... 동일 패턴으로 추가
];
```

> **확장 방법**: 새 태그 추가 = `plugins/<tag>.ts` 파일 1개 작성 후 `index.ts` 배열에 1줄 추가. 에디터 코어·툴바 컴포넌트 수정 불필요 → FR-6.4 충족.

---

## 8. 디렉터리 구조 (Next.js App Router)

```text
markdown-editor/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # 루트 레이아웃
│  │  ├─ page.tsx                # 대시보드(파일 리스트)
│  │  └─ editor/
│  │     └─ [docId]/page.tsx     # 에디터 화면
│  ├─ components/
│  │  ├─ sidebar/
│  │  │  ├─ Sidebar.tsx          # 리사이즈 컨테이너
│  │  │  ├─ FolderTree.tsx
│  │  │  └─ NewFolderButton.tsx  # + 버튼
│  │  ├─ editor/
│  │  │  ├─ Toolbar.tsx          # 플러그인 → 버튼 렌더
│  │  │  ├─ MarkdownEditor.tsx   # CodeMirror 6 래퍼
│  │  │  └─ Preview.tsx          # unified 렌더
│  │  └─ dashboard/
│  │     └─ FileList.tsx
│  ├─ plugins/                   # ★ 태그별 독립 플러그인
│  │  ├─ types.ts
│  │  ├─ helpers.ts
│  │  ├─ index.ts                # 레지스트리
│  │  ├─ bold.ts
│  │  ├─ italic.ts
│  │  ├─ heading.ts
│  │  ├─ strikethrough.ts
│  │  ├─ code.ts
│  │  ├─ codeBlock.ts
│  │  ├─ link.ts
│  │  ├─ image.ts
│  │  ├─ quote.ts
│  │  ├─ bulletList.ts
│  │  ├─ orderedList.ts
│  │  ├─ taskList.ts
│  │  ├─ table.ts
│  │  ├─ hr.ts
│  │  └─ hardBreak.ts
│  └─ lib/
│     ├─ storage/                # IndexedDB(idb) 래퍼
│     │  ├─ db.ts
│     │  ├─ folders.ts
│     │  └─ documents.ts
│     ├─ markdown/
│     │  └─ pipeline.ts          # remark+rehype 설정
│     └─ store/
│        └─ useAppStore.ts       # Zustand
├─ public/
├─ next.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

---

## 9. 마크다운 렌더링 파이프라인 (프리뷰)

```text
입력(md)
  → remark-parse        (CommonMark 0.31.2 파싱)
  → remark-gfm          (표/취소선/체크박스/자동링크 리터럴)
  → remark-rehype       (mdast → hast)
  → rehype-sanitize     (XSS 방어 — 필수)
  → rehype-katex        (수식, 선택)
  → rehype-highlight    (코드 하이라이트, 선택)
  → rehype-stringify    (HTML 출력)
프리뷰 DOM 렌더
```

| 단계 | 패키지 | 비고 |
|------|--------|------|
| 파싱 | `remark-parse` | 스펙 문서 §3–6 코어 |
| 확장 | `remark-gfm` | 스펙 문서 §7 GFM |
| 변환 | `remark-rehype` | AST 브리지 |
| 정제 | `rehype-sanitize` | NFR-1 보안 |
| 출력 | `rehype-stringify` | 최종 HTML |

> React 컴포넌트에서는 `react-markdown` + `remarkPlugins=[remarkGfm]` + `rehypePlugins=[rehypeSanitize]` 조합으로도 동일 구현 가능.

---

## 10. 로컬 저장 전략 (중요 설계 결정)

| 방식 | 장점 | 단점 | 채택 |
|------|------|------|------|
| **IndexedDB** (`idb`) | 전 브라우저 지원, 영속성, 폴더/문서 트리 모델링 자유, Vercel 서버리스 무관 | 실제 디스크 폴더가 아님(브라우저 내부 저장) | ✅ **1차 채택** |
| **File System Access API** | 실제 OS 폴더에 `.md` 직접 저장/읽기 | Chromium 계열만 지원(Safari/Firefox 제약), 권한 프롬프트 | △ 선택(내보내기 보조) |
| localStorage | 간단 | 용량 한계(~5MB), 구조화 약함 | ✗ |

**결론**: "로컬 저장소"는 **IndexedDB로 폴더/문서 트리를 모델링**해 구현한다. 사용자가 실제 디스크 파일을 원하면 File System Access API로 `.md` 내보내기를 **선택 기능**으로 추가한다.

> ⚠️ File System Access API 브라우저 지원 범위는 구현 시점에 caniuse 재확인 권장.

---

## 11. 핵심 사용자 흐름 (문서 생성 → 저장 → 재진입)

**참여자**: 사용자 · Sidebar · Editor · Toolbar · IndexedDB(DB) · Dashboard

| # | 발신 | 수신 | 메시지 | 응답 |
|---|------|------|--------|------|
| 1 | 사용자 | Sidebar | `[+]` 폴더 생성 | — |
| 2 | Sidebar | DB | `folders.add(name)` | `folderId` |
| 3 | 사용자 | Editor | 새 문서 작성 | — |
| 4 | 사용자 | Editor | 상단에서 폴더 경로 선택 | — |
| 5 | 사용자 | Toolbar | 굵게/H1 등 버튼 클릭 | — |
| 6 | Toolbar | Editor | `plugin.apply(state)` 결과 dispatch | — |
| 7 | Editor | Editor | 프리뷰 실시간 갱신 (self) | — |
| 8 | 사용자 | Editor | `[저장]` 클릭 | — |
| 9 | Editor | DB | `documents.add({folderId, title, content})` | 저장 완료(toast) |
| 10 | 사용자 | Dashboard | 대시보드 이동 | — |
| 11 | Dashboard | DB | `documents.getAll()` | 파일 리스트 |
| 12 | 사용자 | Dashboard | 파일 클릭 | — |
| 13 | Dashboard | Editor | `/editor/[docId]` 이동 + 로드 | — |

---

## 12. 구현 마일스톤 (제안)

| 단계 | 범위 | 산출물 |
|------|------|--------|
| M1 | 프로젝트 스캐폴딩 | `create-next-app` (TS+Tailwind), Vercel 연결 |
| M2 | 레이아웃 | 사이드바+컨텐츠 2분할, 리사이즈(FR-1, FR-2.4) |
| M3 | 저장소 | IndexedDB 스키마, 폴더 CRUD, `+` 버튼(FR-2, FR-6 데이터) |
| M4 | 에디터/프리뷰 | CodeMirror 6 + unified 50:50, 실시간 렌더(FR-4) |
| M5 | 플러그인 | `MarkdownPlugin` 인터페이스 + 전체 태그 플러그인(FR-5, FR-6) |
| M6 | 문서 흐름 | 폴더 선택 저장, 파일 리스트, 클릭 네비게이션(FR-3, FR-7) |
| M7 | 마감 | 보안(sanitize)·접근성·토스트·dirty check(NFR) |

---

## 13. 출처 (Sources)

| 출처 | URL | 확인일 |
|------|-----|--------|
| Next.js 공식 블로그(16.x 현황) | https://nextjs.org/blog | 2026-06-25 |
| Next.js npm(버전) | https://www.npmjs.com/package/next | 2026-06-25 |
| Next.js 16 업그레이드 가이드 | https://nextjs.org/docs/app/guides/upgrading/version-16 | 2026-06-25 |
| Lucide 아이콘 | https://lucide.dev/icons/ | 2026-06-25 |
| Lucide heading-1 상세 | https://lucide.dev/icons/heading-1 | 2026-06-25 |
| Lucide square-code 상세 | https://lucide.dev/icons/square-code | 2026-06-25 |
| CommonMark Spec 0.31.2 | https://spec.commonmark.org/0.31.2/ | 2026-06-25 |
| (사내) 마크다운 에디터 스펙 | `markdown-editor-spec-commonmark.md` | 본 프로젝트 |
