# Contract: 사이드바 트리·확인 창·편집 영역 변경

시각 규칙은 `.claude/rules/anti-ai-slop.md`. 색은 기존 `:root` 토큰.

## Sidebar (`src/components/layout/Sidebar.tsx` 확장)

```
<aside aria-label="사이드바">
  헤더 행: "폴더" 라벨(11px, --fg-muted) ............ [+] (FolderPlus, aria-label "새 폴더")
  <ul role="tree" aria-label="폴더와 문서">
    <li role="treeitem" aria-level=1 aria-expanded>  ▸/▾ 폴더 이름 ........ [⋯]
      <ul role="group">
        <li role="treeitem" aria-level=2 aria-selected> 문서 제목 ......... [⋯]
```

| 항목 | 값 |
|------|----|
| 행 높이·들여쓰기 | 30px, 문서 들여쓰기 20px |
| 아이콘 | 폴더 `ChevronRight`/`ChevronDown` 14px, 문서 `FileText` 14px |
| 열린 문서 | 배경 `#e8edfb`, 글자 `var(--accent)`, `aria-selected="true"` |
| hover | 배경 `#f1f3f9` (색만, transition 없음) |
| 포커스 | roving tabindex, `focus-visible` outline 2px `var(--accent)` |
| [⋯] | hover·포커스 행에서만 보임(포커스 시에는 항상 보임), `aria-haspopup="menu"`, `aria-label "‘{이름}’ 메뉴"` |
| 메뉴 | 폴더: 새 문서 · 이름 바꾸기 · 삭제 / 문서: 이름 바꾸기 · 삭제. 1px border, radius 6px, 그림자 없음 |
| 이름 입력 | 행 자리 `<input>` 1개, 오류는 입력 아래 12px `#b42318` 문구 + `aria-invalid`·`aria-describedby` |

### 키 (FR-011)

| 키 | 동작 |
|----|------|
| ↑ / ↓ | 이전·다음 보이는 항목 |
| → | 접힌 폴더 펼치기, 펼친 폴더면 첫 문서로 |
| ← | 펼친 폴더 접기, 문서면 소속 폴더로 |
| Enter | 폴더 접기·펼치기, 문서 열기 |
| F2 | 이름 바꾸기 |
| Delete | 삭제 확인 창 |
| Home / End | 첫·끝 항목 |
| Shift+F10 / ContextMenu | 포커스 항목의 [⋯] 메뉴 열기 (키보드로 새 문서 만들기, SC-006) |

## ConfirmDialog (`src/components/editor/ConfirmDialog.tsx`)

| props | 설명 |
|-------|------|
| `request: { title, message, actions: { label, kind: "primary" \| "danger" \| "default", value }[] } \| null` | |
| `onChoose(value)` / `onClose()` | Esc·배경 클릭 = 취소 |

| 확인 | 제목 | 버튼 |
|------|------|------|
| 저장하지 않은 변경 | 저장하지 않은 변경이 있습니다 | [취소] [버리고 이동] [저장 후 이동](primary) |
| 문서 삭제 | '{제목}' 문서를 삭제할까요? | [취소] [삭제](danger) — 본문 "되돌릴 수 없습니다" |
| 폴더 삭제 | '{이름}' 폴더를 삭제할까요? | [취소] [삭제](danger) — 본문 "안의 문서 N개도 함께 삭제되며 되돌릴 수 없습니다"(N=0이면 "되돌릴 수 없습니다") |

`danger` 버튼: 배경 `#b42318`, 흰 글자(대비 6.5:1). 첫 포커스는 [취소].

## 편집 영역 변경

| 항목 | 값 |
|------|----|
| 경로 표시 (FR-012) | 상태바 왼쪽 맨 앞 `내 문서 / 회의록` (12.5px, `--fg-muted`, 길면 말줄임), 구분선 후 문자 수·줄 수 |
| 열린 문서 없음 | 에디터·프리뷰 자리에 "문서를 선택하거나 새로 만드십시오" 1줄, 툴바·[저장]·[취소] `disabled` |
| 저장소 사용 불가 | 상단 바 아래 1줄 안내 "브라우저 저장소를 쓸 수 없어 변경 내용이 저장되지 않습니다"(`role="status"`, 배경 `#fff4e5`, 1px border) |

## 문구 (`src/content/strings.ts` 추가)

`foldersHeader` 폴더 · `newFolder` 새 폴더 · `newDocument` 새 문서 · `rename` 이름 바꾸기 · `delete` 삭제 ·
`treeLabel` 폴더와 문서 · `defaultFolderName` 새 폴더 · `emptyEditor` 문서를 선택하거나 새로 만드십시오 ·
`storageUnavailable` (위 문구) · `unsavedTitle` 저장하지 않은 변경이 있습니다 · `saveAndGo` 저장 후 이동 ·
`discardAndGo` 버리고 이동 · 이름 오류 4종(`nameEmpty` 이름을 입력하십시오 · `nameTooLong` 50자 이하로
입력하십시오 · `nameSlash` /와 \는 쓸 수 없습니다 · `nameDuplicate` 같은 이름이 있습니다)
