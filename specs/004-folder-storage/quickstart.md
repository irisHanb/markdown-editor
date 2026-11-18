# Quickstart: 폴더·문서 저장소와 사이드바 트리 (M3) 검증

## 1. 자동 검증

```bash
npm test && npx tsc --noEmit && npm run build
```

| 테스트 | 대상 |
|--------|------|
| `tests/lib/workspace/names.test.ts` | 이름 규칙·새 문서 이름·정렬·다음 문서 선택 |
| `tests/lib/workspace/repository.test.ts` | IndexedDB(fake-indexeddb)·메모리 구현 계약 |
| `tests/lib/workspace/bootstrap.test.ts` | 기존 문서 옮기기·첫 방문 샘플·재실행 시 중복 없음·메모리 모드 저장본 유지 |
| `tests/lib/workspace/switch.test.ts` | 저장하지 않은 변경 처리 순서, 저장 실패 시 전환 중단 (SC-005) |
| 기존 M1·M2 테스트 | 회귀 없음 (SC-007) |

## 2. 수동 검증 — `npm run build && python3 -m http.server 3000 -d out`

| # | 절차 | 기대 결과 | 근거 |
|---|------|----------|------|
| 1 | M2 빌드에서 문서 저장 → 이번 빌드로 열기 | "내 문서 / 제목 없는 문서"에 같은 본문, 새로고침 10번 후 문서 1개 | US1-1, SC-001 |
| 2 | 개발자 도구 Application에서 IndexedDB·localStorage 비우고 열기 | "내 문서 / 시작하기" | US1-2 |
| 3 | [+] → "회의" → Enter | 폴더 생성, 이름순 정렬 | US2-1, SC-002 |
| 4 | "회의" [⋯] → 새 문서 2번 | "제목 없는 문서", "제목 없는 문서 2" | US4 |
| 5 | 문서 수정 후 다른 문서 클릭 | 저장하지 않은 변경 확인 3버튼 | US2-5, SC-005 |
| 6 | 폴더 접기 → 새로고침 | 접힌 상태 유지 | US2-3 |
| 7 | 문서 이름 바꾸기(F2)·같은 이름 입력 | 오류 문구, 확정 안 됨 | US3-1, Edge Cases |
| 8 | 문서 3개 든 폴더 삭제 | "문서 3개도 함께 삭제" 확인 후 삭제, 열린 문서 전환 | US3-3 |
| 9 | 키보드만으로 3–8번 | 모두 가능 | SC-006 |
| 10 | 비공개 창(Firefox) 또는 IndexedDB 차단, M2 저장본이 있는 상태 | 저장소 사용 불가 안내, 저장본이 보이고 편집 동작, 정상 창에서 다시 열면 저장본이 그대로 남아 있음 | Edge Cases, analyze U1 |
| 11 | 아래 "대량 데이터 만들기" 실행 후 새로고침, Performance 패널에서 탐색 시작 → 트리 첫 항목 표시까지 측정 | 1초 이하 | SC-003 |
| 12 | 1만 자 문서를 만든 뒤 Performance 기록 중 트리에서 클릭 → 편집 영역에 본문이 그려진 프레임까지 측정 | 200ms 이하 | SC-004 |

### 대량 데이터 만들기 (11번용, 개발자 도구 콘솔)

화면을 한 번 열어 DB를 만든 뒤 실행합니다. 기존 데이터에 폴더 100개·문서 1,000개(각 본문 1,000자)를
더합니다.

```js
const req = indexedDB.open("mdeditor", 1);
req.onsuccess = () => {
  const tx = req.result.transaction(["folders", "documents"], "readwrite");
  const now = Date.now();
  for (let f = 0; f < 100; f++) {
    const folderId = crypto.randomUUID();
    tx.objectStore("folders").put({ id: folderId, name: `대량 ${String(f).padStart(3, "0")}`, parentId: null, collapsed: false, createdAt: now });
    for (let d = 0; d < 10; d++) {
      tx.objectStore("documents").put({ id: crypto.randomUUID(), folderId, title: `문서 ${d}`, content: "가".repeat(1000), createdAt: now, updatedAt: now });
    }
  }
  tx.oncomplete = () => console.log("done");
};
```

## 검증 기록

### 2026-11-12 — 자동 검증

| 항목 | 결과 |
|------|------|
| 1절 게이트 | 통과 — 280/280, `tsc` 오류 0건, 빌드 성공 |
| 1·2·10번 규칙 | `bootstrap.test.ts`로 대체 검증 — 옮기기·재실행 시 1개 유지·seed 실패 시 저장본 유지·메모리 모드 저장본 유지·첫 방문 샘플 |
| 5번 규칙 | `switch.test.ts`로 대체 검증 — 저장 실패 시 전환하지 않음 (SC-005) |
| 8번 규칙 | `repository.test.ts` — 폴더 삭제 시 소속 문서 2개 함께 삭제·개수 반환, 다른 폴더 유지 (IndexedDB·메모리 둘 다) |
| anti-ai-slop 점검 | gradient·transform·애니메이션·그림자·blur 0건, radius 8px 초과 0건. 새 색 대비: 삭제 버튼 6.57:1(hover 8.66:1), 오류 문구 6.40:1, 안내 배경 14.3:1 |

### 미실행 — 사람이 실행해야 함

브라우저 자동화가 연결되지 않아 2절 1–12번의 화면 조작(트리 클릭·키보드·확인 창·성능 측정)은 실행하지
못했습니다.
