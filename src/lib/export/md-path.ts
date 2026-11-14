// 연결 폴더 안 .md 파일 경로 (specs/008-md-file-export FR-003·FR-005).
// 앱 이름 규칙(names.ts)이 이미 `/`·`\`를 막으므로 여기서는 운영체제 금지 글자만 바꾼다.

export type MdPath = { dir: string; file: string; display: string };

const FORBIDDEN = /[<>:"|?*\u0000-\u001f]/g;

function segment(name: string): string {
  const s = name.replace(FORBIDDEN, "_").replace(/[ .]+$/, "");
  return s === "" || s === "." || s === ".." ? "_" : s;
}

/** <제목>.md — 다운로드 파일 이름 (FR-009) */
export const mdFileName = (title: string) => `${segment(title)}.md`;

/** <앱 폴더 이름>/<제목>.md */
export function mdPath(folderName: string, title: string): MdPath {
  const dir = segment(folderName);
  const file = mdFileName(title);
  return { dir, file, display: `${dir}/${file}` };
}
