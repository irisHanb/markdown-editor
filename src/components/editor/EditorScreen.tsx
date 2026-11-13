"use client";

import type { EditorView } from "@codemirror/view";
import { FilePlus, LayoutList } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { Sidebar } from "@/components/layout/Sidebar";
import { useHashRoute } from "@/components/workspace/useHashRoute";
import { useWorkspace } from "@/components/workspace/useWorkspace";
import { strings } from "@/content/strings";
import { revert, type ToastKind } from "@/lib/document/session";
import { DEFAULT_LAYOUT, EDITOR, type Layout, loadLayout, SIDEBAR, saveLayout } from "@/lib/layout/layout";
import { renderMarkdown } from "@/lib/markdown/pipeline";
import { formatRoute, type Route } from "@/lib/route/route";
import { countChars, countLines } from "@/lib/text/count";
import { hasUnsavedChanges } from "@/lib/workspace/dirty";
import type { DocumentForm } from "@/lib/workspace/save-plan";
import { plugins } from "@/plugins";
import { formatShortcut } from "@/plugins/shortcut";
import type { DialogValues, EditorChange, EditorState, MarkdownPlugin } from "@/plugins/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { type BarError, DocumentBar } from "./DocumentBar";
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
type ToastState = { message: string; kind: ToastKind } | null;

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
  // 폴더·문서 저장소 (specs/004-folder-storage). 열린 대상이 바뀌면 편집기를 새로 만든다(M3 research R4).
  const workspace = useWorkspace();
  const { current, view: screen, editorKey } = workspace;
  const hasEditor = screen === "doc" || screen === "new";
  // 문서 바 (specs/005-document-flow FR-002)
  const [form, setForm] = useState<DocumentForm>({ folderId: null, title: "" });
  const [barError, setBarError] = useState<BarError>(null);
  const folderSelectRef = useRef<HTMLSelectElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipGuardRef = useRef(false);
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

  // 다른 문서·새 초안을 열면 baseline·프리뷰·활성 표시를 맞춘다. 초안이 저장돼도 editorKey는 그대로다.
  const currentId = current?.id ?? null;
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    baselineRef.current = current?.content ?? "";
    setDerived(editorKey ? derive(current?.content ?? "") : null);
    setActiveIds(new Set());
    setBarError(null);
  }, [editorKey]);

  // 화면의 시작점으로 포커스 — 편집기 / 대시보드 제목 / 없는 문서 안내 (M7 FR-005, FR-007, research R5)
  const dashboardHeadingRef = useRef<HTMLHeadingElement>(null);
  const notFoundRef = useRef<HTMLParagraphElement>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const focusMain = useCallback(() => {
    const s = screenRef.current;
    if (s === "doc" || s === "new") viewRef.current?.focus();
    else if (s === "dashboard") dashboardHeadingRef.current?.focus();
    else if (s === "notFound") notFoundRef.current?.focus();
  }, []);

  // 앱 안 이동(hashchange)의 목표 화면이 그려진 뒤에만 옮긴다. 앱 시작 시에는 건너뛰기 버튼이 첫 Tab을 받도록 그대로 둔다.
  // openDoc은 상태를 바꾼 뒤에도 await가 남아 있어, "이동 완료" 시점이 아니라 목표 화면 도달로 판정한다.
  // 편집기는 자식 효과에서 만들어지므로 이 효과(부모) 시점에는 viewRef가 채워져 있다.
  const focusTargetRef = useRef<Route | null>(null);
  useEffect(() => {
    const t = focusTargetRef.current;
    if (!t) return;
    const reached =
      t.view === "doc"
        ? (screen === "doc" && editorKey === t.id) || screen === "notFound"
        : t.view === "home" || screen === t.view;
    if (!reached) return;
    focusTargetRef.current = null;
    requestAnimationFrame(focusMain);
  }, [screen, editorKey, focusMain]);

  // 문서 바 값 = 열린 대상의 폴더·제목 (이름 바꾸기·옮기기 후에도 맞춘다)
  const draft = workspace.draft;
  useEffect(() => {
    if (current) setForm({ folderId: current.folderId, title: current.title });
    else if (draft) setForm({ folderId: draft.folderId, title: draft.title });
  }, [editorKey, current?.folderId, current?.title, draft]);

  // 저장하지 않은 변경의 기준값 — 문서는 저장 시점, 초안은 초안을 연 시점 폴더·제목 (M7 FR-002, data-model.md)
  const saved = current
    ? { folderId: current.folderId, title: current.title }
    : { folderId: draft?.folderId ?? null, title: draft?.title ?? "" };
  const formRef = useRef(form);
  formRef.current = form;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const isDraftRef = useRef(false);
  isDraftRef.current = screen === "new";

  const handleChange = useCallback((doc: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDerived(derive(doc)), DEBOUNCE_MS);
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, kind });
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const { route, navigate } = useHashRoute((next, prev) => void onHashChange(next, prev));

  // [저장] — 디바운스 값이 아니라 현재 편집기 문서를 저장한다(M1 research R8).
  // 초안이면 폴더·제목으로 새 문서를 만들고, 문서면 본문·제목·폴더(옮기기)를 갱신한다 (M6 FR-003–FR-006).
  const { saveForm } = workspace;
  const handleSave = useCallback(async (): Promise<{ ok: boolean }> => {
    const view = viewRef.current;
    if (!view) return { ok: false };
    const content = view.state.doc.toString();
    const outcome = await saveForm(form, content);
    if (!outcome.ok) {
      if (outcome.reason === "storage") showToast(strings.toastSaveFailed, "error");
      else if (outcome.reason === "noFolder") {
        setBarError({ field: "folder", message: strings.needFolder });
        folderSelectRef.current?.focus();
      } else {
        const message =
          outcome.reason === "duplicate"
            ? strings.moveDuplicate
            : { empty: strings.nameEmpty, tooLong: strings.nameTooLong, slash: strings.nameSlash }[outcome.reason];
        setBarError({ field: "title", message });
        titleInputRef.current?.focus();
      }
      return { ok: false };
    }
    setBarError(null);
    baselineRef.current = content;
    showToast(outcome.renamedTo ? strings.renamedOnSave(outcome.renamedTo) : strings.toastSaved, "success");
    // 초안이 문서가 되면 기록을 늘리지 않고 그 문서 주소로 바꾼다 (FR-013)
    if (outcome.createdId) navigate({ view: "doc", id: outcome.createdId }, { replace: true });
    return { ok: true };
  }, [form, navigate, saveForm, showToast]);

  // 문서 전환·새 문서·탭 닫기 전에 넘기는 편집기 상태 (M3 FR-010, M7 FR-002 — 본문·폴더·제목)
  const editorGuard = useMemo(
    () => ({
      isDirty: () =>
        viewRef.current
          ? hasUnsavedChanges({
              content: viewRef.current.state.doc.toString(),
              baseline: baselineRef.current,
              form: formRef.current,
              saved: savedRef.current,
              isDraft: isDraftRef.current,
            })
          : false,
      saveCurrent: handleSave,
    }),
    [handleSave],
  );

  // 탭 닫기·새로고침·외부 주소 이동 경고 (M7 FR-001, research R1). 해시 변경은 beforeunload를 일으키지 않는다(FR-003).
  const guardRef = useRef(editorGuard);
  guardRef.current = editorGuard;
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!guardRef.current.isDirty()) return;
      e.preventDefault();
      e.returnValue = ""; // 구형 Chrome·Safari 호환
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

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
    // 문서 바도 저장 시점으로 (M7 FR-002)
    setForm({ ...savedRef.current });
    setBarError(null);
    showToast(strings[result.toast], result.kind);
  }, [showToast]);

  // 모든 화면 이동은 해시 변경 → 여기 1곳 (M6 research R2). 취소·저장 실패면 이전 주소로 되돌린다.
  // ponytail: 되돌릴 때 replaceState라 같은 문서 기록이 1개 더 남을 수 있다 — 앞으로 가기에서 같은 문서가 한 번 더 열리는 수준.
  async function onHashChange(next: Route, prev: Route) {
    const skipGuard = skipGuardRef.current;
    skipGuardRef.current = false;
    focusTargetRef.current = next;
    const result = await workspace.openRoute(next, editorGuard, { skipGuard });
    if (!result.ok) {
      focusTargetRef.current = null;
      navigate(prev, { replace: true });
    }
    else if (result.replace) navigate(result.replace, { replace: true });
  }

  // 시작: 주소의 화면을 연다. 해시가 없으면 마지막 문서·첫 문서·대시보드 순 (FR-012)
  const { ready, openRoute } = workspace;
  const startedRef = useRef(false);
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      const result = await openRoute(route, editorGuard, { skipGuard: true });
      if (result.ok && result.replace) navigate(result.replace, { replace: true });
    })();
  }, [ready, openRoute, route, editorGuard, navigate]);

  // 사이드바 [새 문서](M3): 확인 → 만들기 → 그 문서로 이동(확인은 이미 했으므로 생략)
  const createFromSidebar = useCallback(
    async (folderId: string, title: string) => {
      if (!(await workspace.confirmLeave(editorGuard))) return;
      const id = await workspace.createDocument(folderId, title);
      if (!id) return;
      skipGuardRef.current = true;
      navigate({ view: "doc", id });
    },
    [editorGuard, navigate, workspace],
  );

  const removeFromSidebar = useCallback(
    async (kind: "folder" | "doc", id: string) => {
      const r = await workspace.remove(kind, id);
      if (r.next) navigate(r.next, { replace: true });
      return r.removed;
    },
    [navigate, workspace],
  );

  const navButton = (active: boolean) =>
    `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
      active ? "bg-[#e8edfb] text-[var(--accent)]" : "bg-white text-[var(--fg)] hover:bg-[#f1f3f9]"
    }`;

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
      {/* 건너뛰기 — 해시를 바꾸는 <a href="#…">는 M6 해시 주소와 충돌하므로 버튼 (M7 FR-007, research R6) */}
      <button
        type="button"
        onClick={focusMain}
        className="sr-only rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--fg)] focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {strings.skipToContent}
      </button>
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
        <nav className="ml-auto flex items-center gap-2" aria-label={strings.appName}>
          <button
            type="button"
            aria-current={screen === "dashboard" ? "page" : undefined}
            onClick={() => navigate({ view: "dashboard" })}
            className={navButton(screen === "dashboard")}
          >
            <LayoutList size={16} aria-hidden="true" />
            {strings.dashboard}
          </button>
          <button type="button" onClick={() => navigate({ view: "new" })} className={navButton(false)}>
            <FilePlus size={16} aria-hidden="true" />
            {strings.newDocument}
          </button>
        </nav>
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
          onOpenDocument={(id) => navigate({ view: "doc", id })}
          onCreateDocument={(folderId, title) => void createFromSidebar(folderId, title)}
          onRename={workspace.rename}
          onDelete={removeFromSidebar}
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
        <main aria-label={strings.contentLabel} className="flex min-w-[480px] flex-1 flex-col">
          {screen === "dashboard" && <Dashboard docs={workspace.docs} folders={workspace.folders} headingRef={dashboardHeadingRef} />}
          {screen === "notFound" && (
            <div className="flex items-center gap-3 px-8 py-6 text-sm text-[var(--fg-muted)]">
              {/* tabIndex=-1: 스크립트 포커스 전용 비상호작용 문구 (M7 FR-008 예외) */}
              <p ref={notFoundRef} tabIndex={-1} className="m-0 outline-none">
                {strings.notFound}
              </p>
              <a
                href={formatRoute({ view: "dashboard" })}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--fg)] hover:bg-[#f1f3f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {strings.toDashboard}
              </a>
            </div>
          )}
          {hasEditor && (
            <>
          <DocumentBar
            folders={workspace.folders}
            form={form}
            onChange={(f) => {
              setForm(f);
              setBarError(null);
            }}
            error={barError}
            folderRef={folderSelectRef}
            titleRef={titleInputRef}
          />
          <div className="flex flex-none items-center border-b border-[var(--border)] px-3.5 py-1.5">
            <Toolbar onRun={runPlugin} activeIds={activeIds} titleOf={titleOf} />
          </div>

          <div ref={splitRowRef} className="flex min-h-0 flex-1">
            <section
              aria-label={strings.editorPaneLabel}
              className="flex min-w-[240px] flex-col bg-[var(--editor-bg)]"
              style={{ flex: "0 0 var(--editor-ratio)" }}
            >
              <PaneHeader dotColor="var(--accent)" label={strings.editorHeader} />
              {editorKey ? (
                <MarkdownEditor
                  key={editorKey}
                  initialDoc={current?.content ?? ""}
                  onChange={handleChange}
                  onSelection={handleSelection}
                  bindings={bindings}
                  viewRef={viewRef}
                />
              ) : (
                workspace.ready && <p className="m-0 px-[26px] pt-6 text-sm text-[var(--fg-muted)]">{strings.emptyEditor}</p>
              )}
            </section>
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
            onCancel={handleCancel}
            onSave={() => void handleSave()}
          />
            </>
          )}
        </main>
      </div>
      <InsertDialog request={dialog} onSubmit={submitDialog} onClose={closeDialog} />
      <ConfirmDialog request={workspace.confirm} onChoose={workspace.resolveConfirm} />
      <Toast message={toast?.message ?? null} kind={toast?.kind ?? "success"} />
    </div>
  );
}
