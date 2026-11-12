import { findBracketSyntax, normalizeUrl } from "./helpers";
import type { PluginDialog } from "./types";

/** 링크·이미지 공용 대화상자 로직. 두 플러그인은 접두(`!`)·칸 이름·기본값만 다르다. */
export function createBracketDialog(image: boolean, firstLabel: string, defaultFirst: string): PluginDialog {
  return {
    firstLabel,
    open: ({ doc, selectionStart: s, selectionEnd: e }) => {
      const found = findBracketSyntax(doc, s, image);
      if (found) {
        return { mode: "edit", first: found.text, url: found.url, title: found.title, from: found.from, to: found.to };
      }
      return { mode: "insert", first: doc.slice(s, e) || defaultFirst, url: "", title: null, from: s, to: e };
    },
    submit: ({ doc }, init, values) => {
      const title = init.title === null ? "" : ` "${init.title}"`;
      const text = `${image ? "!" : ""}[${values.first}](${normalizeUrl(values.url)}${title})`;
      const caret = init.from + text.length;
      return { doc: doc.slice(0, init.from) + text + doc.slice(init.to), selectionStart: caret, selectionEnd: caret };
    },
  };
}
