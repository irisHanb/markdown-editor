# Contract: 렌더 파이프라인

헌장 원칙 II·III. 결정 근거는 research R5·R6.

## 함수 — `src/lib/markdown/pipeline.ts`

```typescript
export function renderMarkdown(markdown: string): string;  // 정제된 HTML 문자열
```

- 동기 함수입니다(`processSync`). 예외를 밖으로 던지지 않습니다. 실패하면 빈 문자열을 돌려줍니다.
- 프로세서는 모듈 로드 시 1회 만들고 재사용합니다.

## 처리 순서 (변경 금지)

```
remark-parse
→ remark-gfm
→ remark-rehype   { allowDangerousHtml: true }
→ rehype-raw
→ rehype-sanitize defaultSchema
→ rehype-stringify
```

## 출력 보장

| 입력 | 출력 조건 |
|------|----------|
| CommonMark 코어 예제 (`docs/markdown-editor-spec.md` §3–§5) | 태그 사이 공백을 정규화한 뒤 기대 HTML과 일치 |
| GFM 4종 (§7.1–§7.4) | `<table>`, `<del>`, `<input type="checkbox" disabled>`, `<a href>` 생성 |
| `<kbd>Ctrl</kbd>`, `<details><summary>` | 태그 유지 |
| `<script>…</script>` | 태그·내용 제거 |
| `<img src=x onerror="…">` | `onerror` 제거 |
| `[x](javascript:alert(1))` | `href` 제거 |
| `<iframe>`, `<style>`, `<object>` | 제거 |
| 빈 문자열 | 빈 문자열 |

## 알려진 차이 (기대 HTML 비교 시 정규화 대상)

| # | 차이 | 정규화 |
|---|------|--------|
| 1 | sanitize가 `id`·`name` 앞에 `user-content-`를 붙임(DOM clobbering 방지) | 접두사 제거 |
| 2 | 블록 사이 줄바꿈 개수가 참조 출력과 다르고, 명세 문서가 HTML을 들여쓰기해 적음 | 공백·줄바꿈 연속을 1칸으로 줄인 뒤 태그 앞뒤 공백 제거 |
| 3 | remark-gfm이 작업목록에 `class="contains-task-list"`(`ul`)·`class="task-list-item"`(`li`)를 붙임 | 이 두 class 속성만 제거 |
| 4 | 명세는 void 태그를 XHTML식(`<hr />`, `<br />`, `<img … />`)으로, rehype-stringify는 HTML식(`<hr>`)으로 씀 | 닫는 ` /` 제거 |

이 네 가지만 정규화하고, 그 외 차이는 실패로 봅니다.

## fixture 범위 (SC-002의 "전부")

`docs/markdown-editor-spec.md`에서 아래 두 형식만 옮깁니다. 다른 서술은 기대값으로 쓰지 않습니다.

1. 섹션의 **문법** 코드 블록과 **HTML 결과물** 코드 블록 쌍
2. 표 안의 `` `입력` → `출력` `` 형식 예시(핵심 규칙 표, §5.3·§7.x 값 표)와 값 표의 `문법`/`HTML` 행 쌍

규칙 설명만 있고 리터럴 입출력이 아닌 행(`#5 bolt` → 제목 아님, `U+0000` → `U+FFFD`, `<주소>` → `mailto:`)은 제외합니다.
한 칸에 입력이 둘 이상이면(`**foo bar**` 또는 `__foo bar__`, §4.9 두 방식) 각각 별도 항목으로 둡니다.

조각 HTML(예: §7.3의 `<li>…</li>`)은 렌더 결과 전체가 되도록 감싸는 태그(`<ul>`)를 붙여 적고,
fixture 항목에 `wrapped: true`로 표시합니다. 입력 마크다운은 원문 그대로 둡니다.

## 테스트 구성

- `tests/markdown/conformance.test.ts`: 명세 예제를 `tests/fixtures/conformance.ts`에 섹션 번호와 함께
  옮겨 표 기반으로 검증합니다.
- `tests/markdown/sanitize.test.ts`: SC-004의 XSS 견본 10종. 각 출력에 `<script`, ` on[a-z]+=`,
  `javascript:`가 없음을 단언합니다.
- `tests/markdown/perf.test.ts`: 1만 자 문서(`SAMPLE` 반복)로 `renderMarkdown`을 1회 예열 후 5회 실행해
  중앙값이 50ms 이하임을 단언합니다(SC-001 예산의 렌더 몫, research R6).
