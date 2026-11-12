import type { EditorChange, EditorState } from "@/plugins/types";

// 표기: `|` = 커서, `[…]` = 선택 (contracts/plugin.md "테스트 기대 예시").
// 문서 본문에 `[`·`]`·`|`가 들어가는 경우(링크·표)는 parse 대신 객체를 직접 만든다.
export function parse(marked: string): EditorState {
  const caret = marked.indexOf("|");
  if (caret !== -1) {
    return { doc: marked.replace("|", ""), selectionStart: caret, selectionEnd: caret };
  }
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return { doc: marked.replace("[", "").replace("]", ""), selectionStart: start, selectionEnd: end };
}

export function show(change: EditorChange): string {
  const { doc, selectionStart: s, selectionEnd: e } = change;
  if (s === e) return `${doc.slice(0, s)}|${doc.slice(s)}`;
  return `${doc.slice(0, s)}[${doc.slice(s, e)}]${doc.slice(e)}`;
}
