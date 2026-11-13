// 접근 가능한 이름·영역·건너뛰기 버튼 (specs/006-polish-a11y FR-007·FR-009·FR-010, SC-003, research R9).
// DOM 없이 서버 렌더 마크업을 parse5로 검사한다. 효과(useEffect) 뒤에 생기는 요소는 검사 범위 밖이다.
import { readFileSync } from "node:fs";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ConfirmDialog } from "@/components/editor/ConfirmDialog";
import { DocumentBar } from "@/components/editor/DocumentBar";
import { EditorScreen } from "@/components/editor/EditorScreen";
import { InsertDialog } from "@/components/editor/InsertDialog";
import { StatusBar } from "@/components/editor/StatusBar";
import { Toolbar } from "@/components/editor/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { strings } from "@/content/strings";
import type { Doc, Folder } from "@/lib/workspace/repository";
import { plugins } from "@/plugins";
import { firstInteractiveText, regions, unnamedElements } from "./accessible-name";

const noop = () => {};
const folders: Folder[] = [
  { id: "f1", name: "회의", parentId: null, collapsed: false, createdAt: 1 },
  { id: "f2", name: "메모", parentId: null, collapsed: false, createdAt: 2 },
];
const docs: Doc[] = [
  { id: "d1", folderId: "f1", title: "주간 회의", content: "", createdAt: 1, updatedAt: 3 },
  { id: "d2", folderId: "f1", title: "월간 회의", content: "", createdAt: 1, updatedAt: 2 },
  { id: "d3", folderId: "f2", title: "할 일", content: "", createdAt: 1, updatedAt: 1 },
];
const link = plugins.find((p) => p.id === "link")!;

const statusBar = () =>
  renderToStaticMarkup(<StatusBar path="회의 / 주간 회의" charCount={10} lineCount={2} onCancel={noop} onSave={noop} />);
const documentBar = (error: Parameters<typeof DocumentBar>[0]["error"]) =>
  renderToStaticMarkup(
    <DocumentBar
      folders={folders}
      form={{ folderId: "f1", title: "주간 회의" }}
      onChange={noop}
      error={error}
      folderRef={createRef()}
      titleRef={createRef()}
    />,
  );
const editorScreen = () => renderToStaticMarkup(<EditorScreen />);

describe("유틸 자체 확인", () => {
  it("아이콘만 있는 버튼은 이름 없음으로 검출", () => {
    expect(unnamedElements('<button><svg aria-hidden="true"></svg></button>')).toHaveLength(1);
  });
  it("aria-label·감싼 label은 이름으로 인정", () => {
    expect(unnamedElements('<button aria-label="굵게"><svg aria-hidden="true"></svg></button>')).toEqual([]);
    expect(unnamedElements("<label>폴더<select><option>회의</option></select></label>")).toEqual([]);
  });
  it("select 옵션 글자는 이름이 아님", () => {
    expect(unnamedElements("<select><option>회의</option></select>")).toHaveLength(1);
  });
});

describe("이름 없는 상호작용 요소 0개 (FR-009, SC-003)", () => {
  const cases: [string, () => string][] = [
    ["Toolbar", () => renderToStaticMarkup(<Toolbar onRun={noop} activeIds={new Set(["bold"])} titleOf={(p) => p.label} />)],
    ["StatusBar", statusBar],
    ["DocumentBar", () => documentBar(null)],
    ["DocumentBar 오류", () => documentBar({ field: "title", message: strings.nameEmpty })],
    ["Dashboard", () => renderToStaticMarkup(<Dashboard docs={docs} folders={folders} />)],
    ["Dashboard 빈 목록", () => renderToStaticMarkup(<Dashboard docs={[]} folders={folders} />)],
    [
      "Sidebar",
      () =>
        renderToStaticMarkup(
          <Sidebar
            ref={createRef()}
            folders={folders}
            docs={docs}
            currentId="d1"
            onCreateFolder={async () => {}}
            onToggleFolder={noop}
            onOpenDocument={noop}
            onCreateDocument={noop}
            onRename={async () => {}}
            onDelete={async () => true}
          />,
        ),
    ],
    [
      "InsertDialog",
      () =>
        renderToStaticMarkup(
          <InsertDialog
            request={{ plugin: link, init: link.dialog!.open({ doc: "", selectionStart: 0, selectionEnd: 0 }) }}
            onSubmit={noop}
            onClose={noop}
          />,
        ),
    ],
    [
      "ConfirmDialog",
      () =>
        renderToStaticMarkup(
          <ConfirmDialog
            request={{
              title: strings.unsavedTitle,
              message: strings.unsavedMessage,
              actions: [
                { label: "저장", kind: "primary", value: "save" },
                { label: "저장 안 함", kind: "danger", value: "discard" },
                { label: "취소", kind: "default", value: "cancel" },
              ],
            }}
            onChoose={noop}
          />,
        ),
    ],
    ["EditorScreen 첫 화면", editorScreen],
  ];
  it.each(cases)("%s", (_, render) => {
    expect(unnamedElements(render())).toEqual([]);
  });
});

describe("이름 있는 영역 (FR-010)", () => {
  it("상태 표시줄", () => {
    expect(regions(statusBar())).toContain(`section:${strings.statusBarLabel}`);
  });
  it("문서 바", () => {
    expect(regions(documentBar(null))).toContain(`section:${strings.documentInfoLabel}`);
  });
  it("앱 골격 — 편집 영역·주 이동·사이드바", () => {
    const r = regions(editorScreen());
    expect(r).toContain(`main:${strings.contentLabel}`);
    expect(r).toContain(`nav:${strings.appName}`);
    expect(r).toContain(`aside:${strings.sidebarLabel}`);
  });
  it("편집기 칸 — 서버 렌더 첫 화면(loading)에 없으므로 소스로 확인", () => {
    const src = readFileSync(new URL("../../src/components/editor/EditorScreen.tsx", import.meta.url), "utf8");
    expect(src).toContain("aria-label={strings.editorPaneLabel}");
  });
});

describe("건너뛰기 버튼 (FR-007)", () => {
  it("첫 상호작용 요소가 '본문으로 건너뛰기'", () => {
    expect(firstInteractiveText(editorScreen())).toBe(strings.skipToContent);
  });
});
