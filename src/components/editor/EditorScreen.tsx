"use client";

import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { Sidebar } from "@/components/layout/Sidebar";
import { useWorkspace } from "@/components/workspace/useWorkspace";
import { strings } from "@/content/strings";
import { applySave, revert, type ToastKey, type ToastKind } from "@/lib/document/session";
import { DEFAULT_LAYOUT, EDITOR, type Layout, loadLayout, SIDEBAR, saveLayout } from "@/lib/layout/layout";
import { renderMarkdown } from "@/lib/markdown/pipeline";
import { countChars, countLines } from "@/lib/text/count";
import { plugins } from "@/plugins";
import { formatShortcut } from "@/plugins/shortcut";
import type { DialogValues, EditorChange, EditorState, MarkdownPlugin } from "@/plugins/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { type DialogRequest, InsertDialog } from "./InsertDialog";
import { type KeyBinding, MarkdownEditor } from "./MarkdownEditor";
import { Preview } from "./Preview";
import { StatusBar } from "./StatusBar";
import { Toast } from "./Toast";
import { Toolbar } from "./Toolbar";

// 입력 멈춤 → 프리뷰 갱신 예산 150ms = 디바운스 100ms + 렌더 ≤ 50ms (research R6, FR-004)
const DEBOUNCE_MS = 100;
const TOAST_MS = 1900; // FR-014

type Derived = { html: string; chars: number; lines: number };
type ToastState = { key: ToastKey; kind: ToastKind } | null;

function derive(doc: string): Derived {
  return { html: renderMarkdown(doc), chars: countChars(doc), lines: countLines(doc) };
}

// window.localStorage 참조 자체가 예외를 던지는 환경이 있다 (contracts/storage.md).
function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readState(view: EditorView): EditorState {
  const sel = view.state.selection.main;
  return { doc: view.state.doc.toString(), selectionStart: sel.from, selectionEnd: sel.to };
}

// 문서 전체 교체 트랜잭션 1개 → Mod-z 1회로 되돌아간다 (FR-004).
// ponytail: 전체 교체는 1만 자에서 문자열 1회 교체라 충분히 싸다. 실행 취소 단위가 문제 되면 변경 범위 계산으로 바꾼다.
function applyChange(view: EditorView, next: EditorChange) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: next.doc },
    selection: { anchor: next.selectionStart, head: next.selectionEnd },
    scrollIntoView: true,
  });
  view.focus();
}

function activeOf(state: EditorState): Set<string> {
  return new Set(plugins.filter((p) => p.isActive?.(state)).map((p) => p.id));
}

function PaneHeader({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <div className="flex flex-none items-center gap-2 border-b border-[var(--border-soft)] px-[22px] py-[9px]">
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: dotColor }} aria-hidden="true" />
      <span className="text-[11px] font-bold tracking-[0.09em] text-[var(--fg-muted)]">{label}</span>
    </div>
  );
}

export function EditorScreen() {
  const viewRef = useRef<EditorView | null>(null);
  const baselineRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [derived, setDerived] = useState<Derived | null>(null);
  // 폴더·문서 저장소 (specs/004-folder-storage). 열린 문서가 바뀌면 편집기를 새로 만든다(research R4).
  const workspace = useWorkspace();
  const current = workspace.current;
  const [toast, setToast] = useState<ToastState>(null);
  // 레이아웃 (specs/002-sidebar-layout). 첫 화면 CSS 변수는 layout.tsx 인라인 스크립트가 이미 적용했다.
  const sidebarRef = useRef<HTMLElement>(null);
  const splitRowRef = useRef<HTMLDivElement>(null);
  // null = 저장값 읽기 전. 그 동안 CSS 변수를 덮어쓰지 않는다(인라인 스크립트 값 유지).
  const [loadedLayout, setLayout] = useState<Layout | null>(null);
  const layout = loadedLayout ?? DEFAULT_LAYOUT;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [activeIds, setActiveIds] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  // 정적 export라 첫 렌더에는 플랫폼을 모른다 — 마운트 후 판정해 툴팁에 단축키를 붙인다 (research R7).
  const [isMac, setIsMac] = useState<boolean | null>(null);

  useEffect(() => {
    setLayout(loadLayout(getStorage()));
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 다른 문서를 열면 baseline·프리뷰·활성 표시를 그 문서로 맞춘다.
  const currentId = current?.id ?? null;
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    baselineRef.current = current?.content ?? "";
    setDerived(current ? derive(current.content) : null);
    setActiveIds(new Set());
    // 문서 id가 바뀔 때만 — 저장으로 current.content가 바뀌어도 다시 계산하지 않는다.
  }, [currentId]);

  const handleChange = useCallback((doc: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDerived(derive(doc)), DEBOUNCE_MS);
  }, []);

  const showToast = useCallback((key: ToastKey, kind: ToastKind) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ key, kind });
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // 디바운스 값이 아니라 현재 편집기 문서를 저장한다 — 마지막 100ms 입력 누락 방지 (M1 research R8).
  const { save } = workspace;
  const handleSave = useCallback(async (): Promise<{ ok: boolean }> => {
    const view = viewRef.current;
    if (!view) return { ok: false };
    const doc = view.state.doc.toString();
    const saved = await save(doc);
    const result = applySave(saved, doc, baselineRef.current);
    baselineRef.current = result.baseline;
    showToast(result.toast, result.kind);
    return saved;
  }, [save, showToast]);

  // 문서 전환·새 문서 전에 넘기는 편집기 상태 (FR-010)
  const editorGuard = useMemo(
    () => ({
      isDirty: () => (viewRef.current ? viewRef.current.state.doc.toString() !== baselineRef.current : false),
      saveCurrent: handleSave,
    }),
    [handleSave],
  );

  // 툴바 클릭·단축키가 같은 경로를 쓴다 (specs/003-full-toolbar plan "주요 흐름").
  const runPlugin = useCallback((plugin: MarkdownPlugin) => {
    const view = viewRef.current;
    if (!view) return;
    const state = readState(view);
    if (plugin.dialog) setDialog({ plugin, init: plugin.dialog.open(state) });
    else applyChange(view, plugin.apply(state));
  }, []);

  const submitDialog = useCallback(
    (values: DialogValues) => {
      const view = viewRef.current;
      if (view && dialog?.plugin.dialog) applyChange(view, dialog.plugin.dialog.submit(readState(view), dialog.init, values));
      setDialog(null);
    },
    [dialog],
  );

  // 닫기만 하면 문서는 그대로, 포커스·선택은 열기 전으로 (FR-015)
  const closeDialog = useCallback(() => {
    setDialog(null);
    viewRef.current?.focus();
  }, []);

  // 단축키 = 레지스트리의 shortcut 필드 (FR-020). 편집기 코어는 플러그인을 모른다.
  const bindings = useMemo<KeyBinding[]>(
    () =>
      plugins.flatMap((p) =>
        p.shortcut ? [{ key: p.shortcut, run: () => (runPlugin(p), true) }] : [],
      ),
    [runPlugin],
  );

  const titleOf = useCallback(
    (p: MarkdownPlugin) => (p.shortcut && isMac !== null ? `${p.label} (${formatShortcut(p.shortcut, isMac)})` : p.label),
    [isMac],
  );

  const handleSelection = useCallback((state: EditorState) => setActiveIds(activeOf(state)), []);

  const handleCancel = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const result = revert(baselineRef.current);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: result.doc } });
    showToast(result.toast, result.kind);
  }, [showToast]);

  useEffect(() => {
    if (!loadedLayout) return;
    const root = document.documentElement.style;
    root.setProperty("--sidebar-w", `${loadedLayout.sidebar}px`);
    root.setProperty("--editor-ratio", `${loadedLayout.editor}%`);
  }, [loadedLayout]);

  const setSidebar = useCallback((sidebar: number) => setLayout((l) => ({ ...(l ?? DEFAULT_LAYOUT), sidebar })), []);
  const setEditor = useCallback((editor: number) => setLayout((l) => ({ ...(l ?? DEFAULT_LAYOUT), editor })), []);
  // onCommit은 onChange 직후 호출되므로 최신 값을 인자로 받아 저장한다.
  const commitSidebar = useCallback((sidebar: number) => saveLayout(getStorage(), { ...layoutRef.current, sidebar }), []);
  const commitEditor = useCallback((editor: number) => saveLayout(getStorage(), { ...layoutRef.current, editor }), []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-[var(--fg)]">
      <header className="flex flex-none items-center gap-3.5 border-b border-[var(--border)] px-[18px] py-[11px]">
        <div className="mr-1 flex items-center gap-[9px]">
          <div
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--accent)] text-[13px] font-extrabold text-white"
            aria-hidden="true"
          >
            M
          </div>
          <span className="text-[14.5px] font-bold tracking-[-0.01em] text-[#2a3346]">{strings.appName}</span>
        </div>
      </header>
      {workspace.storageUnavailable && (
        <p role="status" className="m-0 flex-none border-b border-[#f5d9b0] bg-[#fff4e5] px-[18px] py-1.5 text-[12.5px] text-[var(--fg)]">
          {strings.storageUnavailable}
        </p>
      )}

      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <Sidebar
          ref={sidebarRef}
          folders={workspace.folders}
          docs={workspace.docs}
          currentId={currentId}
          onCreateFolder={workspace.createFolder}
          onToggleFolder={workspace.toggleFolder}
          onOpenDocument={(id) => void workspace.requestOpen(id, editorGuard)}
          onCreateDocument={(folderId, title) => void workspace.createDocument(folderId, title, editorGuard)}
          onRename={workspace.rename}
          onDelete={workspace.remove}
        />
        <ResizeHandle
          label={strings.sidebarHandleLabel}
          bounds={SIDEBAR}
          value={layout.sidebar}
          valueText={(v) => `${v}픽셀`}
          fromPointer={(x) => x - (sidebarRef.current?.getBoundingClientRect().left ?? 0)}
          onChange={setSidebar}
          onCommit={commitSidebar}
        />
        <section aria-label={strings.contentLabel} className="flex min-w-[480px] flex-1 flex-col">
          <div className="flex flex-none items-center border-b border-[var(--border)] px-3.5 py-1.5">
            <Toolbar onRun={runPlugin} activeIds={activeIds} titleOf={titleOf} disabled={!current} />
          </div>

          <div ref={splitRowRef} className="flex min-h-0 flex-1">
            <div
              className="flex min-w-[240px] flex-col bg-[var(--editor-bg)]"
              style={{ flex: "0 0 var(--editor-ratio)" }}
            >
              <PaneHeader dotColor="var(--accent)" label={strings.editorHeader} />
              {current ? (
                <MarkdownEditor
                  key={current.id}
                  initialDoc={current.content}
                  onChange={handleChange}
                  onSelection={handleSelection}
                  bindings={bindings}
                  viewRef={viewRef}
                />
              ) : (
                workspace.ready && <p className="m-0 px-[26px] pt-6 text-sm text-[var(--fg-muted)]">{strings.emptyEditor}</p>
              )}
            </div>
            <ResizeHandle
              label={strings.splitHandleLabel}
              bounds={EDITOR}
              value={layout.editor}
              valueText={(v) => `에디터 ${v}%`}
              fromPointer={(x) => {
                const r = splitRowRef.current?.getBoundingClientRect();
                return r ? ((x - r.left) / r.width) * 100 : layoutRef.current.editor;
              }}
              onChange={setEditor}
              onCommit={commitEditor}
            />
            <div className="flex min-w-[240px] flex-1 flex-col bg-white">
              <PaneHeader dotColor="#2bb673" label={strings.previewHeader} />
              <Preview html={derived?.html ?? ""} />
            </div>
          </div>

          <StatusBar
            path={current ? `${workspace.folders.find((f) => f.id === current.folderId)?.name ?? ""} / ${current.title}` : null}
            charCount={derived?.chars ?? 0}
            lineCount={derived?.lines ?? 1}
            disabled={!current}
            onCancel={handleCancel}
            onSave={() => void handleSave()}
          />
        </section>
      </div>
      <InsertDialog request={dialog} onSubmit={submitDialog} onClose={closeDialog} />
      <ConfirmDialog request={workspace.confirm} onChoose={workspace.resolveConfirm} />
      <Toast message={toast ? strings[toast.key] : null} kind={toast?.kind ?? "success"} />
    </div>
  );
}
