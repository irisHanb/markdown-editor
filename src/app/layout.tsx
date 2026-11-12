import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { EDITOR, LAYOUT_KEY, SIDEBAR } from "@/lib/layout/layout";
import "./globals.css";

// 본문 Pretendard, 에디터·코드 JetBrains Mono (헌장 기술 제약, research R9). 둘 다 빌드에 포함돼 런타임 외부 요청 없음.
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-sans",
  weight: "45 920",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Markdown Editor",
  description: "실시간 프리뷰 마크다운 에디터",
};

// 첫 화면을 그리기 전에 저장된 레이아웃을 CSS 변수로 복원한다 — 너비가 튀는 레이아웃 이동 방지
// (specs/002-sidebar-layout research R3). 범위·키는 layout.ts 상수를 주입해 규칙을 한 곳에 둔다.
const restoreLayoutScript = `try{var v=JSON.parse(localStorage.getItem(${JSON.stringify(LAYOUT_KEY)})||"null");
var s=document.documentElement.style;function c(x,a,b){return Math.min(b,Math.max(a,Math.round(x)))}
if(v&&typeof v.sidebar==="number"&&!isNaN(v.sidebar))s.setProperty("--sidebar-w",c(v.sidebar,${SIDEBAR.min},${SIDEBAR.max})+"px");
if(v&&typeof v.editor==="number"&&!isNaN(v.editor))s.setProperty("--editor-ratio",c(v.editor,${EDITOR.min},${EDITOR.max})+"%")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: restoreLayoutScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
