"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { type RefObject, useEffect, useRef } from "react";
import { strings } from "@/content/strings";
import type { EditorState as PluginState } from "@/plugins/types";

// 시안의 평문 편집 영역과 맞추려고 basicSetup(줄번호·접기·활성 줄)을 쓰지 않는다 (research R4).
const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--editor-bg)", color: "#3a4458" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    fontSize: "13.5px",
    lineHeight: "1.85",
    overflow: "auto",
  },
  ".cm-content": { padding: "24px 26px 40px", caretColor: "var(--accent)" },
  ".cm-line": { padding: "0" },
  ".cm-placeholder": { color: "var(--fg-muted)" },
});

/** 단축키 바인딩. 편집기 코어는 플러그인을 모른다 — 바인딩은 호출부가 레지스트리에서 만든다 (헌장 원칙 I). */
export type KeyBinding = { key: string; run: () => boolean };

type Props = {
  initialDoc: string;
  onChange: (doc: string) => void;
  /** 선택·문서 변경마다 호출 — 툴바 활성 표시용 (specs/003-full-toolbar FR-009) */
  onSelection?: (state: PluginState) => void;
  bindings?: KeyBinding[];
  viewRef: RefObject<EditorView | null>;
};

export function MarkdownEditor({ initialDoc, onChange, onSelection, bindings = [], viewRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectionRef = useRef(onSelection);
  onSelectionRef.current = onSelection;
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          history(),
          // 한글 등 IME 조합 중에는 단축키를 무시해 조합 글자를 건드리지 않는다 (FR-018).
          Prec.high(
            keymap.of(
              bindingsRef.current.map((b) => ({
                key: b.key,
                run: (v: EditorView) => !v.composing && b.run(),
              })),
            ),
          ),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          EditorView.lineWrapping,
          placeholder(strings.editorPlaceholder),
          EditorView.contentAttributes.of({ "aria-label": strings.editorLabel, spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) {
              const sel = update.state.selection.main;
              // ponytail: 커서 이동마다 문서 전체 문자열을 만든다. isActive가 현재 줄만 보므로 느려지면 줄만 넘긴다.
              onSelectionRef.current?.({ doc: update.state.doc.toString(), selectionStart: sel.from, selectionEnd: sel.to });
            }
          }),
          theme,
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // initialDoc는 생성 시 1회만 쓴다. 이후 문서 교체는 트랜잭션으로 한다.
  }, []);

  return <div ref={hostRef} className="min-h-0 flex-1" />;
}
