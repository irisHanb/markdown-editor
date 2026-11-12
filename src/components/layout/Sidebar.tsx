"use client";

import { ChevronDown, ChevronRight, FileText, FolderPlus, MoreHorizontal } from "lucide-react";
import { type KeyboardEvent, type Ref, useEffect, useRef, useState } from "react";
import { strings } from "@/content/strings";
import { type NameCheck, nextUntitled, validateName } from "@/lib/workspace/names";
import type { Doc, Folder } from "@/lib/workspace/repository";

type Kind = "folder" | "doc";

type Props = {
  ref?: Ref<HTMLElement>;
  folders: Folder[];
  docs: Doc[];
  currentId: string | null;
  onCreateFolder: (name: string) => Promise<void>;
  onToggleFolder: (id: string) => void;
  onOpenDocument: (id: string) => void;
  onCreateDocument: (folderId: string, title: string) => void;
  onRename: (kind: Kind, id: string, name: string) => Promise<void>;
  onDelete: (kind: Kind, id: string) => Promise<boolean>;
};

type Editing =
  | { mode: "newFolder" }
  | { mode: "newDoc"; folderId: string }
  | { mode: "rename"; kind: Kind; id: string }
  | null;

type Item = { kind: Kind; id: string; name: string; level: 1 | 2; folderId: string; expanded?: boolean };

const errorText: Record<Exclude<NameCheck, { ok: true }>["reason"], string> = {
  empty: strings.nameEmpty,
  tooLong: strings.nameTooLong,
  slash: strings.nameSlash,
  duplicate: strings.nameDuplicate,
};

const focusRing = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]";

/** 행 자리 이름 입력. Enter 확정, Esc·포커스 이탈 취소 (FR-013). */
function NameInput(props: {
  initial: string;
  siblings: string[];
  self?: string;
  indent: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(props.initial);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const errorId = useRef(`name-error-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div style={{ paddingLeft: props.indent }} className="py-1 pr-2">
      <input
        ref={ref}
        value={value}
        maxLength={100}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") props.onCancel();
          if (e.key === "Enter") {
            const check = validateName(value, props.siblings, props.self);
            if (check.ok) props.onSubmit(check.name);
            else if (check.reason === "empty" && props.self === undefined) props.onCancel();
            else setError(errorText[check.reason]);
          }
        }}
        onBlur={props.onCancel}
        className="h-7 w-full rounded-md border border-[var(--accent)] bg-white px-2 text-[13px] text-[var(--fg)] outline-none"
      />
      {error && (
        <p id={errorId} className="m-0 mt-1 text-xs text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}

/** [⋯] 메뉴 — ↑↓ 이동, Enter 실행, Esc 닫기 (contracts/ui.md) */
function RowMenu(props: { label: string; items: { label: string; run: () => void }[]; onClose: () => void }) {
  const ref = useRef<HTMLUListElement>(null);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;
  // 열릴 때 1회만 첫 항목에 포커스 (부모 렌더마다 다시 포커스하지 않음)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onCloseRef.current();
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") buttons[(i + 1) % buttons.length]?.focus();
    else if (e.key === "ArrowUp") buttons[(i - 1 + buttons.length) % buttons.length]?.focus();
    else if (e.key === "Escape") props.onClose();
    else return;
    e.preventDefault();
  };

  return (
    <ul
      ref={ref}
      role="menu"
      aria-label={props.label}
      onKeyDown={onKeyDown}
      className="absolute top-full right-1 z-20 m-0 min-w-[130px] list-none rounded-md border border-[var(--border)] bg-white p-1"
    >
      {props.items.map((item) => (
        <li key={item.label} role="none">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onClose();
              item.run();
            }}
            className={`block w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-[13px] text-[var(--fg)] hover:bg-[#f1f3f9] focus:bg-[#f1f3f9] ${focusRing}`}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

// 폴더 > 문서 트리 (specs/004-folder-storage contracts/ui.md, WAI-ARIA Tree View 패턴).
export function Sidebar(props: Props) {
  const { folders, docs, currentId } = props;
  const [editing, setEditing] = useState<Editing>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const treeRef = useRef<HTMLUListElement>(null);

  const items: Item[] = folders.flatMap((f) => [
    { kind: "folder" as const, id: f.id, name: f.name, level: 1 as const, folderId: f.id, expanded: !f.collapsed },
    ...(f.collapsed
      ? []
      : docs
          .filter((d) => d.folderId === f.id)
          .map((d) => ({ kind: "doc" as const, id: d.id, name: d.title, level: 2 as const, folderId: f.id }))),
  ]);
  const keyOf = (it: Item) => `${it.kind}:${it.id}`;
  const activeKey =
    focusKey && items.some((it) => keyOf(it) === focusKey)
      ? focusKey
      : currentId
        ? `doc:${currentId}`
        : items[0] && keyOf(items[0]);

  const focusItem = (key: string | undefined) => {
    if (!key) return;
    setFocusKey(key);
    requestAnimationFrame(() => treeRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`)?.focus());
  };

  const siblingsOf = (kind: Kind, folderId: string) =>
    kind === "folder" ? folders.map((f) => f.name) : docs.filter((d) => d.folderId === folderId).map((d) => d.title);

  const activate = (it: Item) => (it.kind === "folder" ? props.onToggleFolder(it.id) : props.onOpenDocument(it.id));

  const removeItem = async (it: Item) => {
    const index = items.findIndex((x) => keyOf(x) === keyOf(it));
    if (await props.onDelete(it.kind, it.id)) {
      const neighbor = items[index + 1] ?? items[index - 1];
      if (neighbor && keyOf(neighbor) !== keyOf(it)) focusItem(keyOf(neighbor));
    }
  };

  // FR-011 키보드
  const onTreeKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const index = items.findIndex((it) => keyOf(it) === activeKey);
    const it = items[index];
    if (!it) return;
    const folderIndex = items.findIndex((x) => x.kind === "folder" && x.id === it.folderId);
    switch (e.key) {
      case "ArrowDown":
        focusItem(items[index + 1] && keyOf(items[index + 1]));
        break;
      case "ArrowUp":
        focusItem(items[index - 1] && keyOf(items[index - 1]));
        break;
      case "Home":
        focusItem(keyOf(items[0]));
        break;
      case "End":
        focusItem(keyOf(items[items.length - 1]));
        break;
      case "ArrowRight":
        if (it.kind === "folder" && !it.expanded) props.onToggleFolder(it.id);
        else if (it.kind === "folder" && items[index + 1]?.level === 2) focusItem(keyOf(items[index + 1]));
        break;
      case "ArrowLeft":
        if (it.kind === "folder" && it.expanded) props.onToggleFolder(it.id);
        else if (it.kind === "doc") focusItem(keyOf(items[folderIndex]));
        break;
      case "Enter":
        activate(it);
        break;
      case "F2":
        setEditing({ mode: "rename", kind: it.kind, id: it.id });
        break;
      case "Delete":
        void removeItem(it);
        break;
      case "ContextMenu":
        setMenuFor(keyOf(it));
        break;
      case "F10":
        if (!e.shiftKey) return;
        setMenuFor(keyOf(it));
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const nameInput = (key: string, init: Omit<Parameters<typeof NameInput>[0], "onCancel">) => (
    <NameInput
      key={key}
      {...init}
      onCancel={() => {
        setEditing(null);
        focusItem(activeKey ?? undefined);
      }}
    />
  );

  return (
    <aside
      ref={props.ref}
      aria-label={strings.sidebarLabel}
      className="flex flex-none flex-col overflow-y-auto bg-[var(--editor-bg)]"
      style={{ width: "max(180px, min(var(--sidebar-w), calc(100vw - 480px)))" }}
    >
      <div className="flex flex-none items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-[11px] font-bold tracking-[0.09em] text-[var(--fg-muted)]">{strings.foldersHeader}</span>
        <button
          type="button"
          aria-label={strings.newFolder}
          title={strings.newFolder}
          onClick={() => setEditing({ mode: "newFolder" })}
          className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#4a5568] hover:bg-[#f1f3f9] ${focusRing}`}
        >
          <FolderPlus size={16} aria-hidden="true" />
        </button>
      </div>

      {folders.length === 0 && editing?.mode !== "newFolder" && (
        <p className="m-0 px-4 pt-2 text-[12.5px] text-[var(--fg-muted)]">{strings.sidebarEmpty}</p>
      )}

      <ul ref={treeRef} role="tree" aria-label={strings.treeLabel} onKeyDown={onTreeKeyDown} className="m-0 list-none p-0 pb-4">
        {items.map((it) => {
          const key = keyOf(it);
          const indent = it.level === 1 ? 8 : 28;
          if (editing?.mode === "rename" && editing.id === it.id && editing.kind === it.kind) {
            return (
              <li key={key} role="none">
                {nameInput(key, {
                  initial: it.name,
                  siblings: siblingsOf(it.kind, it.folderId),
                  self: it.name,
                  indent,
                  onSubmit: async (name) => {
                    setEditing(null);
                    await props.onRename(it.kind, it.id, name);
                    focusItem(key);
                  },
                })}
              </li>
            );
          }
          const selected = it.kind === "doc" && it.id === currentId;
          const menuItems =
            it.kind === "folder"
              ? [
                  { label: strings.newDocument, run: () => setEditing({ mode: "newDoc", folderId: it.id }) },
                  { label: strings.rename, run: () => setEditing({ mode: "rename", kind: it.kind, id: it.id }) },
                  { label: strings.delete, run: () => void removeItem(it) },
                ]
              : [
                  { label: strings.rename, run: () => setEditing({ mode: "rename", kind: it.kind, id: it.id }) },
                  { label: strings.delete, run: () => void removeItem(it) },
                ];
          const showNewDoc = editing?.mode === "newDoc" && editing.folderId === it.id && it.kind === "folder";
          const lastDocOfFolder = it.kind === "doc" && items[items.indexOf(it) + 1]?.folderId !== it.folderId;
          return (
            <li key={key} role="none">
              <div className="group relative flex items-center">
                <div
                  role="treeitem"
                  data-key={key}
                  aria-level={it.level}
                  aria-expanded={it.kind === "folder" ? it.expanded : undefined}
                  aria-selected={it.kind === "doc" ? selected : undefined}
                  tabIndex={key === activeKey ? 0 : -1}
                  onFocus={() => setFocusKey(key)}
                  onClick={() => {
                    setFocusKey(key);
                    activate(it);
                  }}
                  style={{ paddingLeft: indent }}
                  className={`flex h-[30px] min-w-0 flex-1 cursor-pointer items-center gap-1.5 pr-8 text-[13px] ${focusRing} ${
                    selected ? "bg-[#e8edfb] font-semibold text-[var(--accent)]" : "text-[var(--fg)] hover:bg-[#f1f3f9]"
                  }`}
                >
                  {it.kind === "folder" ? (
                    it.expanded ? (
                      <ChevronDown size={14} aria-hidden="true" className="flex-none" />
                    ) : (
                      <ChevronRight size={14} aria-hidden="true" className="flex-none" />
                    )
                  ) : (
                    <FileText size={14} aria-hidden="true" className="flex-none text-[var(--fg-muted)]" />
                  )}
                  <span className="truncate">{it.name}</span>
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-haspopup="menu"
                  aria-expanded={menuFor === key}
                  aria-label={`‘${it.name}’ 메뉴`}
                  onClick={() => setMenuFor(menuFor === key ? null : key)}
                  className={`absolute right-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#4a5568] hover:bg-[#e3e8f0] ${
                    menuFor === key || key === focusKey ? "visible" : "invisible group-hover:visible"
                  } ${focusRing}`}
                >
                  <MoreHorizontal size={14} aria-hidden="true" />
                </button>
                {menuFor === key && (
                  <RowMenu
                    label={`‘${it.name}’ 메뉴`}
                    items={menuItems}
                    onClose={() => {
                      setMenuFor(null);
                      focusItem(key);
                    }}
                  />
                )}
              </div>
              {showNewDoc &&
                !items.some((x) => x.level === 2 && x.folderId === it.id) &&
                nameInput(`new:${it.id}`, {
                  initial: nextUntitled(siblingsOf("doc", it.id)),
                  siblings: siblingsOf("doc", it.id),
                  indent: 28,
                  onSubmit: (title) => {
                    setEditing(null);
                    props.onCreateDocument(it.id, title);
                  },
                })}
              {lastDocOfFolder &&
                editing?.mode === "newDoc" &&
                editing.folderId === it.folderId &&
                nameInput(`new:${it.folderId}`, {
                  initial: nextUntitled(siblingsOf("doc", it.folderId)),
                  siblings: siblingsOf("doc", it.folderId),
                  indent: 28,
                  onSubmit: (title) => {
                    setEditing(null);
                    props.onCreateDocument(it.folderId, title);
                  },
                })}
            </li>
          );
        })}
        {editing?.mode === "newFolder" && (
          <li role="none">
            {nameInput("new-folder", {
              initial: strings.defaultFolderName,
              siblings: folders.map((f) => f.name),
              indent: 8,
              onSubmit: async (name) => {
                setEditing(null);
                await props.onCreateFolder(name);
              },
            })}
          </li>
        )}
      </ul>
    </aside>
  );
}
