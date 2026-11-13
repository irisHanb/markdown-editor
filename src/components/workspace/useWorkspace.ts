"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE } from "@/content/sample";
import { strings } from "@/content/strings";
import type { Route } from "@/lib/route/route";
import { bootstrap } from "@/lib/workspace/bootstrap";
import { createIdbRepository } from "@/lib/workspace/idb-repository";
import { createMemoryRepository } from "@/lib/workspace/memory-repository";
import { byName, pickNextDocument } from "@/lib/workspace/names";
import type { Doc, Folder, Repository } from "@/lib/workspace/repository";
import { type DocumentForm, planSave, type SavePlan, UNTITLED } from "@/lib/workspace/save-plan";
import { planSwitch, runSwitch, type SwitchChoice } from "@/lib/workspace/switch";

export type ConfirmAction = { label: string; kind: "primary" | "danger" | "default"; value: string };
export type ConfirmRequest = { title: string; message: string; actions: ConfirmAction[] };

/** 문서 전환 전에 화면이 알려 주는 편집기 상태 */
export type EditorGuard = { isDirty: () => boolean; saveCurrent: () => Promise<{ ok: boolean }> };

/** 저장 전 새 문서 (specs/005-document-flow data-model.md) */
export type Draft = { kind: "draft"; key: number; title: string; folderId: string | null };

export type View = "loading" | "doc" | "new" | "dashboard" | "notFound";

export type SaveOutcome =
  | { ok: true; createdId?: string; renamedTo?: string }
  | { ok: false; reason: Extract<SavePlan, { kind: "error" }>["reason"] | "storage" };

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const cancelAction: ConfirmAction = { label: strings.cancel, kind: "default", value: "cancel" };

// 저장소 상태·화면 이동 (M3 plan "주요 흐름" + M6 research R1–R4).
export function useWorkspace() {
  const repoRef = useRef<Repository | null>(null);
  const draftSeq = useRef(0);
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [view, setView] = useState<View>("loading");
  const [current, setCurrent] = useState<Doc | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** 편집기 key — 초안이 저장돼 문서가 돼도 바뀌지 않아 커서·실행 취소 기록이 유지된다 */
  const [editorKey, setEditorKey] = useState("");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((value: string) => void) | null>(null);

  const refresh = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return { folders: [], docs: [] };
    const [f, d] = await Promise.all([repo.listFolders(), repo.listDocuments()]);
    const sortedF = f.sort(byName((x) => x.name));
    const sortedD = d.sort(byName((x) => x.title));
    setFolders(sortedF);
    setDocs(sortedD);
    return { folders: sortedF, docs: sortedD };
  }, []);

  /** 문서 열기. 없으면 notFound. */
  const openDoc = useCallback(async (id: string) => {
    const repo = repoRef.current;
    if (!repo) return;
    const doc = await repo.getDocument(id);
    setDraft(null);
    setCurrent(doc ?? null);
    setView(doc ? "doc" : "notFound");
    setEditorKey(doc ? doc.id : "");
    if (doc) await repo.setMeta("lastDocId", doc.id);
  }, []);

  const openDraft = useCallback(() => {
    const key = ++draftSeq.current;
    setCurrent(null);
    setDraft({ kind: "draft", key, title: UNTITLED, folderId: null });
    setView("new");
    setEditorKey(`draft-${key}`);
  }, []);

  const openDashboard = useCallback(() => {
    setCurrent(null);
    setDraft(null);
    setView("dashboard");
    setEditorKey("");
  }, []);

  /** 주소 없이 열었을 때: 마지막 문서 → 트리 첫 문서 → 대시보드 (FR-012) */
  const homeRoute = useCallback(async (): Promise<Route> => {
    const repo = repoRef.current;
    if (!repo) return { view: "dashboard" };
    const last = await repo.getMeta("lastDocId");
    if (last && (await repo.getDocument(last))) return { view: "doc", id: last };
    const { folders: f, docs: d } = await refresh();
    for (const folder of f) {
      const first = d.find((x) => x.folderId === folder.id);
      if (first) return { view: "doc", id: first.id };
    }
    return { view: "dashboard" };
  }, [refresh]);

  // 시작: IndexedDB → 실패하면 메모리(저장본은 지우지 않음) + 안내 (M3 analyze U1)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let repo: Repository;
      try {
        repo = await createIdbRepository();
        await bootstrap(repo, getStorage(), SAMPLE, { removeLegacy: true });
      } catch {
        repo = createMemoryRepository();
        await bootstrap(repo, getStorage(), SAMPLE, { removeLegacy: false });
        if (!cancelled) setStorageUnavailable(true);
      }
      if (cancelled) return;
      repoRef.current = repo;
      await refresh();
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /** 확인 창을 띄우고 선택값을 돌려준다. Esc·배경 클릭은 "cancel". */
  const ask = useCallback(
    (request: ConfirmRequest) =>
      new Promise<string>((resolve) => {
        resolverRef.current = resolve;
        setConfirm(request);
      }),
    [],
  );

  const resolveConfirm = useCallback((value: string) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setConfirm(null);
  }, []);

  /** 저장하지 않은 변경이 있으면 확인 후 진행 (M3 FR-010). 진행했으면 true. */
  const guard = useCallback(
    async (editor: EditorGuard, proceed: () => Promise<void>) => {
      const dirty = editor.isDirty();
      const choice = dirty
        ? ((await ask({
            title: strings.unsavedTitle,
            message: strings.unsavedMessage,
            actions: [
              cancelAction,
              { label: strings.discardAndGo, kind: "default", value: "discard" },
              { label: strings.saveAndGo, kind: "primary", value: "save" },
            ],
          })) as SwitchChoice)
        : null;
      return runSwitch(planSwitch(dirty, choice), { save: editor.saveCurrent, open: proceed });
    },
    [ask],
  );

  /**
   * 주소가 바뀌었을 때 화면을 맞춘다 (FR-013–FR-016). false면 이동 취소 — 호출부가 이전 주소로 되돌린다.
   * replace가 있으면 호출부가 그 주소로 기록을 교체한다(home 처리).
   */
  const openRoute = useCallback(
    async (route: Route, editor: EditorGuard, opts: { skipGuard?: boolean } = {}) => {
      const same =
        (route.view === "doc" && view === "doc" && current?.id === route.id) ||
        (route.view === "dashboard" && view === "dashboard");
      if (same) return { ok: true as const };
      const target = route.view === "home" ? await homeRoute() : route;
      const proceed = async () => {
        if (target.view === "doc") await openDoc(target.id);
        else if (target.view === "new") openDraft();
        else openDashboard();
      };
      const ok = opts.skipGuard ? (await proceed(), true) : await guard(editor, proceed);
      return ok ? { ok: true as const, replace: route.view === "home" ? target : undefined } : { ok: false as const };
    },
    [current, guard, homeRoute, openDashboard, openDoc, openDraft, view],
  );

  /** [저장] — 초안 만들기·본문 갱신·제목 변경·옮기기 (FR-003–FR-006, planSave) */
  const saveForm = useCallback(
    async (form: DocumentForm, content: string): Promise<SaveOutcome> => {
      const repo = repoRef.current;
      if (!repo) return { ok: false, reason: "storage" };
      const target = view === "new" ? ({ kind: "draft" } as const) : current ? ({ kind: "doc", doc: current } as const) : null;
      if (!target) return { ok: false, reason: "storage" };
      const plan = planSave(target, form, content, docs);
      if (plan.kind === "error") return { ok: false, reason: plan.reason };
      try {
        if (plan.kind === "create") {
          const f = folders.find((x) => x.id === plan.folderId);
          if (f?.collapsed) await repo.setCollapsed(f.id, false);
          const doc = await repo.createDocument(plan.folderId, plan.title, content);
          await repo.setMeta("lastDocId", doc.id);
          setDraft(null);
          setCurrent(doc);
          setView("doc"); // editorKey는 그대로 — 편집기를 다시 만들지 않는다
          await refresh();
          return { ok: true, createdId: doc.id, renamedTo: plan.renamed ? plan.title : undefined };
        }
        if (!current) return { ok: false, reason: "storage" };
        await repo.updateDocument(current.id, plan.patch);
        if (plan.patch.folderId) {
          const f = folders.find((x) => x.id === plan.patch.folderId);
          if (f?.collapsed) await repo.setCollapsed(f.id, false);
        }
        setCurrent({ ...current, ...plan.patch, updatedAt: Date.now() });
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, reason: "storage" };
      }
    },
    [current, docs, folders, refresh, view],
  );

  const createFolder = useCallback(
    async (name: string) => {
      await repoRef.current?.createFolder(name);
      await refresh();
    },
    [refresh],
  );

  const toggleFolder = useCallback(
    async (id: string) => {
      const f = folders.find((x) => x.id === id);
      if (!f) return;
      await repoRef.current?.setCollapsed(id, !f.collapsed);
      await refresh();
    },
    [folders, refresh],
  );

  /** 사이드바 [새 문서] (M3 FR-016). 확인은 호출부가 confirmLeave로 먼저 거친다. 만든 문서 id 반환. */
  const createDocument = useCallback(
    async (folderId: string, title: string) => {
      const repo = repoRef.current;
      if (!repo) return null;
      const f = folders.find((x) => x.id === folderId);
      if (f?.collapsed) await repo.setCollapsed(folderId, false);
      const d = await repo.createDocument(folderId, title);
      await refresh();
      return d.id;
    },
    [folders, refresh],
  );

  /** 저장하지 않은 변경 확인만 (이동 전에 다른 작업이 끼는 경우) */
  const confirmLeave = useCallback((editor: EditorGuard) => guard(editor, async () => {}), [guard]);

  const rename = useCallback(
    async (kind: "folder" | "doc", id: string, name: string) => {
      const repo = repoRef.current;
      if (!repo) return;
      if (kind === "folder") await repo.renameFolder(id, name);
      else await repo.renameDocument(id, name);
      if (kind === "doc" && current?.id === id) setCurrent({ ...current, title: name });
      await refresh();
    },
    [current, refresh],
  );

  /**
   * 확인 후 삭제 (M3 FR-014, FR-015). 열린 문서가 지워지면 다음 문서(없으면 대시보드)를 연다.
   * 반환: 삭제했으면 { removed: true, next? } — next가 있으면 호출부가 그 주소로 기록을 교체한다.
   */
  const remove = useCallback(
    async (kind: "folder" | "doc", id: string): Promise<{ removed: boolean; next?: Route }> => {
      const repo = repoRef.current;
      if (!repo) return { removed: false };
      const name = kind === "folder" ? folders.find((f) => f.id === id)?.name : docs.find((d) => d.id === id)?.title;
      const inFolder = kind === "folder" ? docs.filter((d) => d.folderId === id).length : 0;
      const message =
        kind === "folder" && inFolder > 0
          ? `안의 문서 ${inFolder}개도 함께 삭제되며 ${strings.irreversible}`
          : strings.irreversible;
      const choice = await ask({
        title: `'${name}' ${kind === "folder" ? "폴더" : "문서"}를 삭제할까요?`,
        message,
        actions: [cancelAction, { label: strings.delete, kind: "danger", value: "delete" }],
      });
      if (choice !== "delete") return { removed: false };

      const currentGone = current && (kind === "doc" ? current.id === id : current.folderId === id);
      const nextId = !currentGone
        ? null
        : kind === "doc"
          ? pickNextDocument(docs, folders, id)
          : pickNextDocument(
              docs.filter((d) => d.folderId !== id),
              folders.filter((f) => f.id !== id),
              "",
            );
      if (kind === "folder") await repo.deleteFolder(id);
      else await repo.deleteDocument(id);
      await refresh();
      if (!currentGone) return { removed: true };
      if (nextId) {
        await openDoc(nextId);
        return { removed: true, next: { view: "doc", id: nextId } };
      }
      await repo.setMeta("lastDocId", null);
      openDashboard();
      return { removed: true, next: { view: "dashboard" } };
    },
    [ask, current, docs, folders, openDashboard, openDoc, refresh],
  );

  return {
    ready,
    storageUnavailable,
    folders,
    docs,
    view,
    current,
    draft,
    editorKey,
    confirm,
    resolveConfirm,
    openRoute,
    saveForm,
    confirmLeave,
    createFolder,
    toggleFolder,
    createDocument,
    rename,
    remove,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
