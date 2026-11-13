# Data Model: 문서 흐름 (M6)

IndexedDB 스키마 변경 없음(`mdeditor` v1 유지). 저장소 메서드 1개 추가, 메모리 모델 2개 추가.

## Repository 변경

| 변경 | 내용 |
|------|------|
| 추가 | `updateDocument(id, patch: { content?: string; title?: string; folderId?: string }): Promise<void>` — 한 트랜잭션, 대상 폴더 없으면 reject, `updatedAt` 갱신 |
| 삭제 | `saveContent` (호출부를 `updateDocument(id, { content })`로 교체) |

## Route (해시)

| 종류 | 해시 | 필드 |
|------|------|------|
| `doc` | `#/doc/<id>` | `id` (encodeURIComponent) |
| `new` | `#/new` | — |
| `dashboard` | `#/dashboard` | — |
| `home` | `""`, `#`, `#/`, 알 수 없는 형식 | — (FR-012 규칙으로 replace) |

## Draft (새 문서 초안, 메모리)

| 필드 | 타입 | 규칙 |
|------|------|------|
| `kind` | `"draft"` | |
| `key` | number | 초안마다 증가 — 편집기 key |
| `title` | string | 기본 "제목 없는 문서" |
| `folderId` | string \| null | 기본 null |

본문은 편집기가 보유. 저장하지 않은 변경 = 본문 ≠ `""`.

## 문서 바 폼 값 (DocumentForm)

| 필드 | 규칙 |
|------|------|
| `folderId` | string \| null |
| `title` | 앞뒤 공백 제거. 비면 "제목 없는 문서". M3 `validateName` 규칙(1–50자, `/`·`\` 금지) |

## 저장 결정 — `planSave(target, form, content, docs)`

| target | 조건 | 결과 |
|--------|------|------|
| Draft | `folderId` null | `{ error: "noFolder" }` (FR-003) |
| Draft | 제목 규칙 위반(빈 제목 제외) | `{ error: <reason> }` |
| Draft | 폴더에 같은 제목 있음 | `{ kind: "create", folderId, title: uniqueTitle(...), renamed: true }` (FR-004) |
| Draft | 그 외 | `{ kind: "create", folderId, title, renamed: false }` |
| Doc | 대상 폴더(바뀐 경우 새 폴더)에 자기 외 같은 제목 | `{ error: "duplicate" }` — 아무것도 저장 안 함 (FR-005, FR-006) |
| Doc | 제목 규칙 위반 | `{ error: <reason> }` |
| Doc | 그 외 | `{ kind: "update", patch: { content, title?, folderId? } }` (바뀐 필드만) |

## 상태 전이 — 화면

```
hashchange(new) ─┬─ 현재와 같은 대상 → 무시
                 └─ planSwitch(dirty, 선택) → runSwitch
                        ├─ 진행 → 대상 열기 (doc: getDocument / 없으면 notFound, new: Draft 생성, dashboard)
                        └─ 취소·저장 실패 → history.replaceState(이전 해시)
Draft [저장] → planSave → create → createDocument → replaceState(#/doc/<새 id>) (기록 늘리지 않음)
Doc [저장] → planSave → update → updateDocument → (폴더가 바뀌었으면 대상 폴더 펼침)
```
