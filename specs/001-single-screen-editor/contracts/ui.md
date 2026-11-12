# Contract: 화면 요소와 문구

시각 기준은 `docs/design/project/Markdown Editor.dc.html`, 변경점은 research R10.
문구는 `src/content/strings.ts` 상수로 둡니다(NFR-5).

## 영역

| 영역 | 요소 | 접근성 |
|------|------|--------|
| 상단 바 | 로고 "M" + "Markdown Editor", 툴바 | 툴바 `role="toolbar"`, `aria-label="서식"` |
| 툴바 버튼 12개 | 아이콘 버튼 34×34px | `aria-label`·`title` = 플러그인 `label`, `type="button"` |
| 편집 영역 | 헤더 "MARKDOWN" + CM6 | 편집 영역 `aria-label="마크다운 입력"` |
| 프리뷰 | 헤더 "미리보기" + 렌더 결과 | `aria-label="미리보기"`, `aria-live` 없음(입력마다 낭독 방지) |
| 상태바 | `{n}자 | {n}줄`, [취소], [저장] | 버튼은 텍스트 라벨 |
| 알림 | 화면 하단 중앙 | `role="status"`, `aria-live="polite"` |

## 문구

| 키 | 문구 |
|----|------|
| `editorPlaceholder` | 여기에 마크다운을 입력하세요… |
| `toastSaved` | 저장되었습니다 |
| `toastSaveFailed` | 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주십시오 |
| `toastReverted` | 마지막 저장 상태로 되돌렸습니다 |
| `cancel` | 취소 |
| `save` | 저장 |

## 알림 동작

- 표시 시간 1,900ms(시안 값). 새 알림이 오면 이전 알림을 즉시 바꾸고 타이머를 다시 시작합니다.
- 성공·되돌림은 체크 아이콘, 실패는 경고 아이콘. 색은 아이콘에만 쓰고 배경은 `#1c2434` 단색입니다.
- 등장·퇴장 애니메이션 없음.

## 툴바 동작

- 버튼 실행 후 편집 영역에 포커스를 돌려주고 `EditorChange`의 선택 범위를 적용합니다.
- 툴바 실행은 CM6 트랜잭션 1개이므로 실행 취소(`Mod-z`) 1번으로 되돌아갑니다.
