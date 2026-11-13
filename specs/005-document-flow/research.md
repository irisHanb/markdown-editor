# Research: 문서 흐름 — 폴더 선택 저장·대시보드·문서 주소 (M6)

조사일 2026-11-12. 새 의존성 없음.

## R1. 문서 주소 — 해시 라우팅

- **Decision**: 페이지는 `/` 하나로 유지하고, 화면 상태를 URL 해시로 표현합니다.

  | 화면 | 해시 |
  |------|------|
  | 문서 편집 | `#/doc/<id>` |
  | 새 문서 | `#/new` |
  | 대시보드 | `#/dashboard` |
  | 지정 없음(첫 화면) | 빈 해시 → FR-012 규칙으로 `#/doc/<id>` 또는 `#/dashboard`로 **replace** |

  - 이동은 `location.hash` 대입(기록 추가)과 `history.replaceState`(기록 교체)로만 합니다.
  - 화면 반영은 `hashchange` 이벤트 1곳에서 합니다.
- **Rationale**:
  - **정적 export 제약**: `/editor/[docId]` 동적 경로는 빌드할 때 모든 id를 알아야 합니다(`generateStaticParams`). 문서 id는 사용자 브라우저(IndexedDB)에서 실행 중에 생기므로 미리 만들 수 없습니다(FR-017, 헌장 원칙 V).
  - **서버 설정 불필요**: 해시는 서버로 전송되지 않습니다. 그래서 `python3 -m http.server`, Vercel 어디서든 새로고침·직접 진입이 같은 `index.html`로 동작합니다.
  - **Next 라우터와 충돌 없음**: Next App Router는 `pushState`를 가로채고 `popstate`를 직접 처리합니다. 해시만 바꾸면 Next 라우터와 충돌하지 않습니다.
  - **사이드바 유지**: 같은 페이지 안에서 바뀌므로 사이드바·IndexedDB 연결·레이아웃이 다시 마운트되지 않습니다.
- **Alternatives considered**:
  - `/editor?id=` + Next `useSearchParams`/`router.push`: 정적 export에서는 `/editor` 경로가 `editor.html`이 됩니다. 그러면 `trailingSlash` 설정이 필요하고 `useSearchParams`는 Suspense 경계를 요구합니다. 뒤로 가기에서 [취소]로 주소를 되돌리려면 Next 내부 기록 상태와 맞춰야 합니다. 페이지가 바뀔 때 화면 전체가 다시 마운트되는 문제도 있습니다.
  - `/editor/[docId]`: 위 정적 export 제약으로 불가능합니다.

## R2. 화면 이동과 저장 확인 — 해시 변경 1곳에서 처리

- **Decision**: 모든 이동은 해시를 바꾸는 것으로 시작하고, `hashchange` 처리기 1곳에서 순서대로 처리합니다. 대상은 사이드바 문서, 대시보드 행, [대시보드], [새 문서], 뒤로·앞으로 가기입니다.
  1. 새 해시를 해석합니다(`parseRoute`).
  2. 현재 화면이 같은 문서면 끝냅니다.
  3. M3의 `planSwitch`/`runSwitch`로 저장하지 않은 변경을 확인합니다.
  4. [취소]나 저장 실패면 `history.replaceState`로 이전 해시를 복원합니다(FR-015).
- **Rationale**: 클릭과 뒤로 가기를 같은 경로로 처리해 SC-005("확인 없이 변경이 사라지는 이동 0개")의 예외 경로가 생기지 않게 합니다.
- **Ceiling**: [취소] 시 이전 해시로 `replaceState`하므로 브라우저 기록에 같은 문서 항목이 1개 더 남을 수 있습니다. 앞으로 가기를 누르면 같은 문서가 다시 열리는 수준의 영향입니다(`ponytail:` 주석).
- **대시보드 행·사이드바 문서**: `<a href="#/doc/<id>">` 네이티브 링크를 씁니다. Enter·가운데 클릭(새 탭)이 브라우저 기본 동작으로 됩니다(FR-008).

## R3. 새 문서 초안

- **Decision**: `useWorkspace`의 열린 대상을 `Doc | Draft | null`로 넓힙니다.
  - `Draft = { kind: "draft", key, title, folderId: string | null }`입니다. 본문은 편집기가 갖습니다.
  - 편집기 `key`는 `draft-<n>`으로, 초안을 만들 때마다 새 편집기를 씁니다.
  - 초안의 "저장하지 않은 변경"은 본문이 빈 문자열이 아닐 때만으로 봅니다(spec Edge Case).
- **저장 결정 — 순수 함수**: `planSave(target, form, docs)`가 결과를 돌려줍니다.
  - 새 문서 만들기: `{ create, folderId, title, renamed }`
  - 기존 문서 갱신: `{ update, patch }`
  - 저장 불가: `{ error: "noFolder" | "duplicate" | NameCheck 사유 }`
  - 헌장 원칙 IV에 따라 테스트를 먼저 씁니다.
- **자동 접미사**: `uniqueTitle(title, siblings)`는 "제목"이 겹치면 "제목-1", "제목-2" 순으로 비어 있는 가장 작은 번호를 붙입니다(FR-004, requirement.md FR-3.4 표기).

## R4. 문서 옮기기·제목 변경 — 저장소에 `updateDocument` 추가

- **Decision**: `Repository.updateDocument(id, patch: { content?, title?, folderId? })`를 추가합니다.
  - 트랜잭션 1개에서 대상 폴더가 있는지 확인하고, 문서를 쓰고, `updatedAt`을 갱신합니다.
  - 같은 제목이 있는지는 호출 전에 `planSave`가 막습니다(FR-006 "아무것도 저장하지 않음").
  - 기존 `saveContent`는 `updateDocument(id, { content })`로 대체하고 삭제합니다.
- **Rationale**: 본문·제목·폴더를 한 번에 써야 중간에 실패해도 일부만 저장되는 상태가 생기지 않습니다. DB 스키마는 바뀌지 않으므로 버전은 1로 유지합니다.

## R5. 대시보드

- **Decision**: 편집 영역 자리에 `Dashboard` 컴포넌트를 렌더합니다. 사이드바는 그대로 둡니다(FR-011).
  - 구조: `<table>`에 제목(링크)·폴더·수정 시각 열을 두고, 수정 시각 내림차순으로 정렬합니다.
  - 시각 표기: `formatDateTime(epoch)` → `YYYY-MM-DD HH:mm`(사용자 시간대)
- **Rationale**: 문서 1,000행을 그대로 렌더해도 수백 ms 수준이라 SC-003(1초)을 넘지 않습니다. 가상 스크롤은 넣지 않습니다(`ponytail:` 주석, 1초를 넘으면 도입).

## R6. 화면 배치

- **상단 바(전체 폭)**: 로고·앱 이름 다음 오른쪽에 [대시보드]·[새 문서] 버튼을 둡니다. [대시보드]는 대시보드에서 `aria-current="page"`로 표시합니다.
- **문서 바(편집 영역 맨 위, 툴바 위)**: "폴더" `<select>`(첫 옵션 "폴더 선택")와 "제목" `<input>`을 둡니다. 저장된 문서는 현재 값이 채워진 상태입니다. M2-a의 "툴바가 편집 영역 맨 위" 결정은 "문서 바 → 툴바" 순서로 바뀝니다.
- **없는 문서**: 편집 영역 자리에 "문서를 찾을 수 없습니다" 안내와 [대시보드로] 링크(`#/dashboard`)를 보여 줍니다.
