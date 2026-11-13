// 개발 모드 전용 디버깅 도구 — react-grab (UI 요소에 마우스를 올리고 ⌘C/Ctrl+C로 컴포넌트·소스 위치 복사).
// Next.js가 앱이 상호작용 가능해지기 전에 이 파일을 실행하므로 React 렌더보다 먼저 올라온다.
// production 빌드에서는 NODE_ENV가 "production"으로 치환돼 이 import가 번들에서 빠진다(빌드 결과 out/에 react-grab 없음).
if (process.env.NODE_ENV === "development") {
  void import("react-grab");
}
