"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRoute, parseRoute, type Route } from "@/lib/route/route";

/**
 * URL 해시 = 화면 주소 (specs/005-document-flow research R1).
 * onChange는 해시가 바뀔 때마다(클릭·뒤로/앞으로) 이전 주소와 함께 불린다.
 */
export function useHashRoute(onChange: (next: Route, prev: Route) => void) {
  const [route, setRoute] = useState<Route>({ view: "home" });
  const routeRef = useRef(route);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const initial = parseRoute(window.location.hash);
    routeRef.current = initial;
    setRoute(initial);
    const handler = () => {
      const prev = routeRef.current;
      const next = parseRoute(window.location.hash);
      routeRef.current = next;
      setRoute(next);
      onChangeRef.current(next, prev);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  /** push: 기록 추가(hashchange 발생). replace: 기록 교체(hashchange 없음 — 상태만 갱신) */
  const navigate = useCallback((next: Route, opts: { replace?: boolean } = {}) => {
    const hash = formatRoute(next);
    if (opts.replace) {
      window.history.replaceState(window.history.state, "", hash || window.location.pathname);
      routeRef.current = next;
      setRoute(next);
    } else if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, []);

  return { route, navigate, initialRoute: () => routeRef.current };
}
