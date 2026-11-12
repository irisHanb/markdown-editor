"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE } from "@/content/sample";
import { strings } from "@/content/strings";
import { bootstrap } from "@/lib/workspace/bootstrap";
import { createIdbRepository } from "@/lib/workspace/idb-repository";
import { createMemoryRepository } from "@/lib/workspace/memory-repository";
import { byName, pickNextDocument } from "@/lib/workspace/names";
import type { Doc, Folder, Repository } from "@/lib/workspace/repository";
import { planSwitch, runSwitch, type SwitchChoice } from "@/lib/workspace/switch";

export type ConfirmAction = { label: string; kind: "primary" | "danger" | "default"; value: string };
export type ConfirmRequest = { title: string; message: string; actions: ConfirmAction[] };

/** 문서 전환 전에 화면이 알려 주는 편집기 상태 */
export type EditorGuard = { isDirty: () => boolean; saveCurrent: () => Promise<{ ok: boolean }> };

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const cancelAction: ConfirmAction = { label: strings.cancel, kind: "default", value: "cancel" };

// 저장소 상태·동작 (specs/004-folder-storage plan "주요 흐름", research R5).
export function useWorkspace() {
  const repoRef = useRef<Repository | null>(null);
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [current, setCurrent] = useState<Doc | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((value: string) => void) | null>(null);

  const refresh = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return;
    const [f, d] = await Promise.all([repo.listFolders(), repo.listDocuments()]);
    setFolders(f.sort(byName((x) => x.name)));
    setDocs(d.sort(byName((x) => x.title)));
  }, []);

  const open = useCallback(async (id: string | null) => {
    const repo = repoRef.current;
    if (!repo) return;
    const doc = id ? await repo.getDocument(id) : undefined;
    setCurrent(doc ?? null);
    await repo.setMeta("lastDocId", doc?.id ?? null);
  }, []);

  // 시작: IndexedDB → 실패하면 메모리(저장본은 지우지 않음) + 안내 (analyze U1)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let repo: Repository;
      let first: string | null;
      try {
        repo = await createIdbRepository();
        first = await bootstrap(repo, getStorage(), SAMPLE, { removeLegacy: true });
      } catch {
        repo = createMemoryRepository();
        first = await bootstrap(repo, getStorage(), SAMPLE, { removeLegacy: false });
        if (!cancelled) setStorageUnavailable(true);
      }
      if (cancelled) return;
      repoRef.current = repo;
      await refresh();
      await open(first);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, refresh]);

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

  /** 저장하지 않은 변경이 있으면 확인 후 진행 (FR-010). 진행했으면 true. */
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

  const save = useCallback(
    async (content: string): Promise<{ ok: boolean }> => {
      const repo = repoRef.current;
      if (!repo || !current) return { ok: false };
      try {
        await repo.saveContent(current.id, content);
        setCurrent({ ...current, content, updatedAt: Date.now() });
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    [current, refresh],
  );

  const requestOpen = useCallback(
    (id: string, editor: EditorGuard) => (id === current?.id ? Promise.resolve(true) : guard(editor, () => open(id))),
    [current, guard, open],
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

  const createDocument = useCallback(
    (folderId: string, title: string, editor: EditorGuard) =>
      guard(editor, async () => {
        const repo = repoRef.current;
        if (!repo) return;
        const f = folders.find((x) => x.id === folderId);
        if (f?.collapsed) await repo.setCollapsed(folderId, false);
        const d = await repo.createDocument(folderId, title);
        await refresh();
        await open(d.id);
      }),
    [folders, guard, open, refresh],
  );

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

  /** 확인 후 삭제. 열린 문서가 지워지면 다음 문서를 연다 (FR-014, FR-015, US3-2). */
  const remove = useCallback(
    async (kind: "folder" | "doc", id: string) => {
      const repo = repoRef.current;
      if (!repo) return false;
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
      if (choice !== "delete") return false;

      const currentGone = current && (kind === "doc" ? current.id === id : current.folderId === id);
      let next: string | null = null;
      if (currentGone) {
        next =
          kind === "doc"
            ? pickNextDocument(docs, folders, id)
            : pickNextDocument(
                docs.filter((d) => d.folderId !== id),
                folders.filter((f) => f.id !== id),
                "",
              );
      }
      if (kind === "folder") await repo.deleteFolder(id);
      else await repo.deleteDocument(id);
      await refresh();
      if (currentGone) await open(next);
      return true;
    },
    [ask, current, docs, folders, open, refresh],
  );

  return {
    ready,
    storageUnavailable,
    folders,
    docs,
    current,
    confirm,
    resolveConfirm,
    save,
    requestOpen,
    createFolder,
    toggleFolder,
    createDocument,
    rename,
    remove,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
