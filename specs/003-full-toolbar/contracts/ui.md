# Contract: 툴바·대화상자 화면

시각 규칙은 `.claude/rules/anti-ai-slop.md`.

## Toolbar (`src/components/editor/Toolbar.tsx`)

| props | 설명 |
|-------|------|
| `onRun(plugin)` | 버튼 클릭 → 실행부(EditorScreen)가 `apply` 또는 대화상자 열기 |
| `activeIds: Set<string>` | 눌림 표시 대상 |
| `isMac: boolean` | 툴팁 단축키 표기 |

| 항목 | 값 |
|------|----|
| 묶음 | `pluginGroups` 5개, 경계마다 1×20px `#e7ebf2` 구분선 |
| 버튼 | 34×34px, 아이콘 18px, `aria-label = label` |
| 툴팁 | `title = label` + 단축키가 있으면 ` (⌘B)` / ` (Ctrl+B)` (FR-019) |
| 토글 버튼 | `isActive`가 있는 버튼에만 `aria-pressed={activeIds.has(id)}` |
| 눌림 표시 | 배경 `#e8edfb`, 아이콘 색 `var(--accent)` (색은 상태 의미로만) |
| 실행 시 | 버튼에서 포커스가 나가지 않도록 `onMouseDown` `preventDefault` — 편집 영역 선택 유지 |

## InsertDialog (`src/components/editor/InsertDialog.tsx`)

| props | 설명 |
|-------|------|
| `open: { plugin, init } \| null` | null이면 닫힘 |
| `onSubmit(values)` / `onClose()` | |

| 항목 | 값 |
|------|----|
| 요소 | `<dialog aria-labelledby>`를 `showModal()`로 표시 |
| 제목 | "링크 넣기" / "이미지 넣기", 수정 모드 "링크 수정" / "이미지 수정" |
| 칸 | `<label>` + `<input>` 2개: 첫 칸(`firstLabel`), "주소"(`type="text"`, `inputMode="url"`) |
| 버튼 | [취소], [삽입] 또는 [수정] — 주소가 공백뿐이면 `disabled` |
| 첫 포커스 | 주소 칸 |
| 닫기 | Esc(`cancel` 이벤트), [취소], 배경 클릭(`event.target === dialog`) |
| 모양 | 폭 360px, radius 8px, 1px border `var(--border)`, 그림자 없음, `::backdrop rgba(20,27,43,.24)` |
| 애니메이션 | 없음 |

## 문구 (`src/content/strings.ts` 추가)

| 키 | 문구 |
|----|------|
| `dialogLinkInsert` | 링크 넣기 |
| `dialogLinkEdit` | 링크 수정 |
| `dialogImageInsert` | 이미지 넣기 |
| `dialogImageEdit` | 이미지 수정 |
| `dialogUrl` | 주소 |
| `dialogInsert` | 삽입 |
| `dialogUpdate` | 수정 |
