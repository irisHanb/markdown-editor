// 화면 주소 = URL 해시 (specs/005-document-flow research R1).
// 정적 export라 /editor/[docId] 동적 경로를 미리 만들 수 없다 — 문서 id는 브라우저(IndexedDB)에서 생긴다.
export type Route =
  | { view: "doc"; id: string }
  | { view: "new" }
  | { view: "dashboard" }
  | { view: "home" };

const HOME: Route = { view: "home" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "");
  if (path === "/new") return { view: "new" };
  if (path === "/dashboard") return { view: "dashboard" };
  const m = /^\/doc\/(.+)$/.exec(path);
  if (!m) return HOME;
  try {
    return { view: "doc", id: decodeURIComponent(m[1]) };
  } catch {
    return HOME;
  }
}

export function formatRoute(route: Route): string {
  switch (route.view) {
    case "doc":
      return `#/doc/${encodeURIComponent(route.id)}`;
    case "new":
      return "#/new";
    case "dashboard":
      return "#/dashboard";
    default:
      return "";
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return a.view === b.view && (a.view !== "doc" || (b.view === "doc" && a.id === b.id));
}
