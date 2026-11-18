// .md 파일 경로 규칙 (specs/008-md-file-export FR-003·FR-005)
import { describe, expect, it } from "vitest";
import { mdFileName, mdPath } from "@/lib/export/md-path";

describe("mdPath", () => {
  it("<앱 폴더>/<제목>.md", () => {
    expect(mdPath("회의", "주간 회의")).toEqual({ dir: "회의", file: "주간 회의.md", display: "회의/주간 회의.md" });
  });

  it("운영체제 금지 글자와 제어 문자는 _", () => {
    expect(mdPath('a<b>c', 'x:y"z|w?v*u\u0001').file).toBe("x_y_z_w_v_u_.md");
    expect(mdPath("a<b>c", "t").dir).toBe("a_b_c");
  });

  it("끝 공백·마침표 제거", () => {
    expect(mdPath("폴더. ", "제목..").display).toBe("폴더/제목.md");
  });

  it("비거나 . .. 이면 _", () => {
    expect(mdPath("..", ".").display).toBe("_/_.md");
  });
});

// 008 FR-009 — 다운로드 파일 이름
describe("mdFileName", () => {
  it("<제목>.md, 금지 글자는 _", () => {
    expect(mdFileName("주간 회의")).toBe("주간 회의.md");
    expect(mdFileName("a:b")).toBe("a_b.md");
  });
});
