import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/text/date";

describe("formatDateTime (FR-007)", () => {
  it("YYYY-MM-DD HH:mm, 두 자리 채우기 (지역 시각으로 만든 값)", () => {
    expect(formatDateTime(new Date(2026, 10, 2, 9, 5).getTime())).toBe("2026-11-02 09:05");
    expect(formatDateTime(new Date(2026, 0, 31, 23, 59).getTime())).toBe("2026-01-31 23:59");
  });
});
