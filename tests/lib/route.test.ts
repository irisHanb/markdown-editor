import { describe, expect, it } from "vitest";
import { formatRoute, parseRoute, type Route, sameRoute } from "@/lib/route/route";

describe("parseRoute (research R1)", () => {
  it.each([
    ["#/doc/abc", { view: "doc", id: "abc" }],
    ["#/doc/a%20b", { view: "doc", id: "a b" }],
    ["#/new", { view: "new" }],
    ["#/dashboard", { view: "dashboard" }],
  ] as const)("%s", (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it.each(["", "#", "#/", "#/xyz", "#/doc/", "#/doc/%E0%A4%A"])("%j → home", (hash) => {
    expect(parseRoute(hash)).toEqual({ view: "home" });
  });
});

describe("formatRoute", () => {
  it.each([
    [{ view: "doc", id: "a b" }, "#/doc/a%20b"],
    [{ view: "new" }, "#/new"],
    [{ view: "dashboard" }, "#/dashboard"],
    [{ view: "home" }, ""],
  ] as [Route, string][])("%j → %j, parse 왕복", (route, hash) => {
    expect(formatRoute(route)).toBe(hash);
    expect(parseRoute(formatRoute(route))).toEqual(route);
  });
});

describe("sameRoute", () => {
  it("같은 문서 id면 true, 다른 id·종류면 false", () => {
    expect(sameRoute({ view: "doc", id: "a" }, { view: "doc", id: "a" })).toBe(true);
    expect(sameRoute({ view: "doc", id: "a" }, { view: "doc", id: "b" })).toBe(false);
    expect(sameRoute({ view: "new" }, { view: "dashboard" })).toBe(false);
    expect(sameRoute({ view: "dashboard" }, { view: "dashboard" })).toBe(true);
  });
});
