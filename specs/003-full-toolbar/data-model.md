# Data Model: 툴바 완성 (M2-b)

영속 데이터 없음. 모두 메모리 모델입니다.

## MarkdownPlugin (확장)

| 필드 | 타입 | 규칙 |
|------|------|------|
| `id` | string | 레지스트리 안에서 고유. contracts/plugin-api.md 표 |
| `label` | string | 한글. `aria-label`, 툴팁 앞부분 |
| `icon` | LucideIcon | |
| `group` | `"inline" \| "block" \| "special"` | 동작 분류(툴바 묶음과 별개) |
| `shortcut?` | string | CM6 키 표기(`Mod-b`). FR-020 표의 11개만 |
| `apply` | `(EditorState) => EditorChange` | 순수. `dialog`가 있으면 호출되지 않음(빈 변경) |
| `isActive?` | `(EditorState) => boolean` | 순수. 토글 11개만 가짐 |
| `dialog?` | `PluginDialog` | 링크·이미지 2개만 가짐 |

## PluginDialog

| 필드 | 타입 | 규칙 |
|------|------|------|
| `firstLabel` | string | "텍스트" / "대체 텍스트" |
| `open` | `(EditorState) => DialogInit` | 순수. 커서가 같은 종류 문법 안이면 수정 모드 |
| `submit` | `(EditorState, DialogInit, DialogValues) => EditorChange` | 순수 |

## DialogInit (열 때 계산)

| 필드 | 타입 | 규칙 |
|------|------|------|
| `mode` | `"insert" \| "edit"` | FR-010a |
| `first` | string | 선택 텍스트 → 없으면 기본값("링크 텍스트"/"이미지"), 수정 모드면 기존 값 |
| `url` | string | 수정 모드면 기존 주소, 아니면 `""` |
| `title` | string \| null | 수정 모드에서 기존 `"title"` 유지용 |
| `from`, `to` | number | 교체 범위 — 삽입 모드는 선택 범위, 수정 모드는 기존 문법 전체 |

## DialogValues (사용자 입력)

| 필드 | 규칙 |
|------|------|
| `first` | 그대로 사용 (빈 문자열 허용 — 이미지 대체 텍스트 생략 가능) |
| `url` | 앞뒤 공백 제거 후 빈 문자열이면 제출 불가(FR-012), 가운데 공백 → `%20`(FR-013) |

## 상태 전이 — 대화상자

```
[닫힘] ─버튼/Mod-k→ open(state) → [열림: insert|edit, 주소 칸 포커스]
[열림] ─[삽입|수정]/Enter (url 유효)→ submit → 트랜잭션 1개 → [닫힘, 편집 영역 포커스, 커서 = 결과 끝]
[열림] ─Esc/[취소]/배경 클릭→ [닫힘, 편집 영역 포커스, 선택 = 열기 전]
```

## 활성 상태

`activeIds: Set<string>` — 선택 변경마다 `isActive`가 true인 플러그인 id. 화면 상태(React)이며 저장하지
않습니다.
