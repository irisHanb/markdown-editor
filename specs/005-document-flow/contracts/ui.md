# Contract: 화면 (M6)

시각 규칙은 `.claude/rules/anti-ai-slop.md`, 색은 기존 `:root` 토큰.

## 구조

```
<header>  [M] Markdown Editor ........................ [대시보드] [새 문서]
<div row>
├─ <Sidebar> (M3, 문서 행은 #/doc/<id> 링크로 이동)
├─ <ResizeHandle>
└─ <section aria-label="편집 영역">
     view = doc | new  → 문서 바 · 툴바 · 에디터|프리뷰 · 상태바
     view = dashboard  → <Dashboard>
     문서 없음          → "문서를 찾을 수 없습니다" + [대시보드로]
```

## 상단 바 버튼

| 버튼 | 아이콘 | 동작 | 상태 |
|------|--------|------|------|
| [대시보드] | `LayoutList` 16px + 글자 | `#/dashboard` | 대시보드에서 `aria-current="page"`, 배경 `#e8edfb`·글자 accent |
| [새 문서] | `FilePlus` 16px + 글자 | `#/new` | — |

높이 32px, radius 6px, 1px border `var(--border)`, hover 배경 `#f1f3f9`.

## 문서 바 (`src/components/editor/DocumentBar.tsx`)

| 요소 | 값 |
|------|----|
| 폴더 | `<label>폴더 <select>` — 첫 옵션 `""` "폴더 선택", 폴더 이름순 |
| 제목 | `<label>제목 <input>` — 최대 길이 검사는 [저장] 시 |
| 오류 | 행 아래 12px `#b42318` 문구, 해당 칸 `aria-invalid` |
| 폴더 없음 | `<select>` 옆 "폴더가 없습니다 — 사이드바 [+]로 만드십시오" (12.5px, `--fg-muted`) |
| 배치 | 편집 영역 맨 위, 툴바 위. 높이 40px, 하단 1px border |

[저장] 실패 시 포커스: `noFolder` → 폴더 `<select>`, 제목 오류 → 제목 `<input>`.

## 대시보드 (`src/components/dashboard/Dashboard.tsx`)

| 요소 | 값 |
|------|----|
| 제목 | `<h1>` "모든 문서" 18px |
| 표 | `<table>` 열: 제목(`<a href="#/doc/<id>">`) · 폴더 · 수정 시각, 수정 시각 내림차순 |
| 행 | 높이 36px, 하단 1px `--border-soft`, 링크 focus-visible outline |
| 빈 상태 | "문서가 없습니다" + [새 문서] 링크 버튼(`#/new`) |

## 문구 (`src/content/strings.ts` 추가)

`dashboard` 대시보드 · `allDocuments` 모든 문서 · `colTitle` 제목 · `colFolder` 폴더 · `colUpdated` 수정 시각 ·
`noDocuments` 문서가 없습니다 · `folderLabel` 폴더 · `titleLabel` 제목 · `selectFolder` 폴더 선택 ·
`noFolders` 폴더가 없습니다 — 사이드바 [+]로 만드십시오 · `needFolder` 저장할 폴더를 선택하십시오 ·
`moveDuplicate` 옮길 폴더에 같은 이름이 있습니다 · `notFound` 문서를 찾을 수 없습니다 · `toDashboard`
대시보드로 · `renamedOnSave` (형식 문자열) 같은 이름이 있어 '{title}'(으)로 저장했습니다
