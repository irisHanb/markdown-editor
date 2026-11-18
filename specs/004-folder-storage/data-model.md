# Data Model: 폴더·문서 저장소 (M3)

IndexedDB `mdeditor` v1. requirement.md §6 스키마 + `collapsed`, `meta` 스토어.

## folders

| 필드 | 타입 | 규칙 |
|------|------|------|
| `id` | string (`crypto.randomUUID()`) | keyPath |
| `name` | string | 1–50자, `/`·`\` 금지, 폴더끼리 대소문자 무시 중복 금지 |
| `parentId` | `null` | 이번 단계는 항상 null(루트). 중첩 확장용 |
| `collapsed` | boolean | 기본 false (FR-008) |
| `createdAt` | number (epoch ms) | |

## documents

| 필드 | 타입 | 규칙 |
|------|------|------|
| `id` | string (`crypto.randomUUID()`) | keyPath |
| `folderId` | string | 인덱스 `byFolder`. 존재하는 폴더 id |
| `title` | string | 1–50자, `/`·`\` 금지, 같은 폴더 안 대소문자 무시 중복 금지 |
| `content` | string | 마크다운 원문. 빈 문자열 허용 |
| `createdAt` | number | |
| `updatedAt` | number | [저장] 시 갱신 (FR-005) |

## meta (키-값)

| 키 | 값 | 용도 |
|----|----|------|
| `lastDocId` | string \| null | 다음 방문 시 열 문서 (FR-004) |
| `legacyImported` | true | 옮기기 1회 보장 (FR-002, research R3) |

## 관계·제약

```
folders (1) ──< documents (N)     documents.folderId → folders.id
폴더 삭제 = 폴더 + byFolder 문서 전부를 트랜잭션 1개로 삭제 (FR-015)
```

## 상태 전이 — 시작 (research R3)

```
meta.legacyImported 있음 ──────────────────────────→ 그대로
없음 + localStorage["mdeditor:v1"] 있음 → [tx] "내 문서"/"제목 없는 문서"(저장본) + 플래그 → 커밋 후 removeItem
없음 + 저장본 없음 + 폴더 0개 → [tx] "내 문서"/"시작하기"(SAMPLE) + 플래그
tx 실패 → 저장본 유지, 다음 열기에서 재시도
메모리 저장소 모드(IndexedDB 열기 실패) → 옮겨 보여 주되 removeItem 하지 않음 (analyze U1)
```

## 상태 전이 — 열린 문서

```
[열림 doc A, baseline = A.content]
  ├─ 편집 → dirty = (편집기 본문 ≠ baseline), 전환 시점에만 계산
  ├─ [저장] → saveContent → baseline 갱신
  ├─ [취소] → 편집기 = baseline
  └─ 다른 문서 B 선택
       ├─ dirty 아님 → B 열기
       └─ dirty → 확인: [저장 후 이동] saveContent(A) 후 B / [버리고 이동] B / [취소] A 유지
          (planSwitch → runSwitch. 저장 실패면 B를 열지 않고 A 유지 + 실패 알림)
[A 삭제] → pickNextDocument: 같은 폴더 다른 문서 → 다른 폴더 첫 문서 → 없음(빈 화면)
```

## 파생 값

| 값 | 계산 |
|----|------|
| 트리 | 폴더 이름순(`localeCompare` ko), 각 폴더 문서 제목순 |
| 경로 표시 (FR-012) | `폴더 이름 / 문서 제목` |
| 새 문서 기본 이름 | `nextUntitled(같은 폴더 제목들)` |
