# Contract: 화면 구조·경계 컴포넌트

시각 규칙은 `.claude/rules/anti-ai-slop.md`, 색 토큰은 `src/app/globals.css` `:root`.

## 구조

```
<header>                         로고 + "Markdown Editor" (툴바 없음)
<div row>
├─ <aside aria-label="사이드바">   width: max(180px, min(var(--sidebar-w), 100vw - 480px))
│    빈 영역 안내 1줄
├─ <ResizeHandle 사이드바>
└─ <section aria-label="편집 영역">  flex: 1, min-width: 480px
     ├─ 툴바 행 (border-bottom 1px)
     ├─ 편집 행
     │   ├─ 에디터 칸   flex: 0 0 var(--editor-ratio), min-width 240px
     │   ├─ <ResizeHandle 에디터·프리뷰>
     │   └─ 프리뷰 칸   flex: 1, min-width 240px
     └─ 상태바
<Toast>
```

## `ResizeHandle` — `src/components/layout/ResizeHandle.tsx`

```typescript
type Props = {
  label: string;                       // aria-label
  bounds: Bounds;
  value: number;
  valueText: (v: number) => string;    // aria-valuetext
  fromPointer: (clientX: number) => number; // 포인터 x → 원시 값 (clamp 전)
  onChange: (v: number) => void;       // 끌기 중·키 입력 시
  onCommit: (v: number) => void;       // 끌기 종료·키 입력 직후 (저장)
};
```

| 항목 | 값 |
|------|----|
| 역할·속성 | `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow/min/max`, `aria-valuetext`, `tabIndex=0` |
| 히트 영역 | 폭 8px(투명), 가운데 1px 선 `var(--border)` |
| hover·끌기 중 | 가운데 선 색만 `var(--accent)`, transition 없음 |
| focus-visible | `outline: 2px solid var(--accent)` |
| 커서 | `col-resize` (끌기 중에는 `document.body`에도) |
| 키 | `stepByKey` 결과가 null이 아니면 `preventDefault` 후 `onChange`+`onCommit` |

## 문구 (`src/content/strings.ts`에 추가)

| 키 | 문구 |
|----|------|
| `sidebarLabel` | 사이드바 |
| `sidebarEmpty` | 폴더 기능은 다음 단계에서 제공됩니다 |
| `contentLabel` | 편집 영역 |
| `sidebarHandleLabel` | 사이드바 너비 조절 |
| `splitHandleLabel` | 에디터·미리보기 비율 조절 |
