# Data Model: 마감 — 이탈 경고·접근성 (M7)

저장 데이터(IndexedDB `folders`·`documents`·`meta`)는 바뀌지 않습니다. 새로 정의하는 것은 화면 상태에서 계산하는
판단 입력 1개입니다.

## UnsavedInput — `hasUnsavedChanges`의 입력

| 필드 | 타입 | 뜻 |
|------|------|----|
| `content` | `string` | 편집기 현재 본문 |
| `baseline` | `string` | 마지막 저장(또는 열기) 시점 본문. 초안은 `""` |
| `form` | `DocumentForm` (`{ folderId: string \| null; title: string }`, M6) | 문서 바 현재 값 |
| `saved` | `{ folderId: string \| null; title: string }` | 기준값. 저장된 문서는 저장 시점 폴더·제목, 초안은 초안을 연 시점 값(`folderId: null`, `title: UNTITLED` "제목 없는 문서") |
| `isDraft` | `boolean` | 초안 여부 |

## 판단 규칙 (spec FR-002)

변경 있음 = `content !== baseline` ∨ `form.title !== saved.title` ∨ (`!isDraft` ∧ `form.folderId !== saved.folderId`)

| 경우 | 결과 |
|------|------|
| 저장된 문서에서 본문·제목·폴더 중 하나를 바꿈 | 변경 있음 |
| 초안에 본문 입력 또는 제목을 "제목 없는 문서"에서 바꿈 | 변경 있음 |
| 초안에서 폴더만 고름 | 변경 없음 (잃을 내용이 없음) |
| 바꾼 값을 직접 원래대로 되돌림 | 변경 없음 (값 비교) |

- 저장 중에는 `baseline`이 아직 갱신되지 않아 변경 있음으로 판단합니다(spec Edge Cases).
- 열린 문서가 없는 화면(대시보드·없는 문서)은 편집기가 없어 `isDirty()`가 `false`입니다.

## 상태 전이 — [취소]

본문은 `baseline`, 문서 바는 `saved`(폴더·제목)로 되돌립니다. 되돌린 뒤 `hasUnsavedChanges`는 `false`입니다(US1-6).
