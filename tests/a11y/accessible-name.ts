// 서버 렌더 마크업에서 접근 가능한 이름·영역을 검사하는 테스트 전용 유틸 (specs/006-polish-a11y research R9).
// ponytail: 이름 계산은 aria-label → aria-labelledby → 감싼 <label> → 텍스트 4단계만 본다. title·alt 등은 이 앱에서 이름 출처로 쓰지 않는다.
import { parse } from "parse5";

type Node = {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Node[];
  parentNode?: Node | null;
};

const attr = (n: Node, name: string) => n.attrs?.find((a) => a.name === name)?.value;

function walk(n: Node, out: Node[] = []): Node[] {
  if (n.tagName) out.push(n);
  for (const c of n.childNodes ?? []) walk(c, out);
  // <template> 등은 이 앱에 없다
  return out;
}

function text(n: Node): string {
  if (n.nodeName === "#text") return n.value ?? "";
  if (n.tagName && attr(n, "aria-hidden") === "true") return "";
  return (n.childNodes ?? []).map(text).join("");
}

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function isInteractive(n: Node): boolean {
  switch (n.tagName) {
    case "button":
    case "select":
    case "textarea":
      return true;
    case "a":
      return attr(n, "href") !== undefined;
    case "input":
      return attr(n, "type") !== "hidden";
    default:
      return attr(n, "role") === "treeitem";
  }
}

function nameOf(n: Node, byId: Map<string, Node>): string {
  const label = clean(attr(n, "aria-label"));
  if (label) return label;
  const ids = attr(n, "aria-labelledby");
  if (ids) {
    const t = clean(ids.split(/\s+/).map((id) => (byId.has(id) ? text(byId.get(id)!) : "")).join(" "));
    if (t) return t;
  }
  for (let p = n.parentNode; p; p = p.parentNode) {
    if (p.tagName === "label") {
      const t = clean(text(p));
      if (t) return t;
    }
  }
  // 입력 칸 자신의 값·옵션 글자는 이름이 아니다
  if (n.tagName === "input" || n.tagName === "select" || n.tagName === "textarea") return "";
  return clean(text(n));
}

function elements(html: string) {
  const all = walk(parse(html) as unknown as Node);
  const byId = new Map<string, Node>();
  for (const n of all) {
    const id = attr(n, "id");
    if (id) byId.set(id, n);
  }
  return { all, byId };
}

const summary = (n: Node) => `${n.tagName}.${(attr(n, "class") ?? "").slice(0, 20)}`;

/** 이름 없는 상호작용 요소의 요약 목록 */
export function unnamedElements(html: string): string[] {
  const { all, byId } = elements(html);
  return all.filter((n) => isInteractive(n) && !nameOf(n, byId)).map(summary);
}

/** 랜드마크·이름 있는 section의 "태그:이름" 목록 */
export function regions(html: string): string[] {
  const { all, byId } = elements(html);
  return all
    .filter((n) => ["main", "nav", "aside", "header"].includes(n.tagName!) || (n.tagName === "section" && attr(n, "aria-label")))
    .map((n) => `${n.tagName}:${clean(attr(n, "aria-label")) || (attr(n, "aria-labelledby") ? nameOf(n, byId) : "")}`);
}

/** 문서 순서상 첫 상호작용 요소의 이름 */
export function firstInteractiveText(html: string): string {
  const { all, byId } = elements(html);
  const first = all.find(isInteractive);
  return first ? nameOf(first, byId) : "";
}
