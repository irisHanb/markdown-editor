import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // perf.test.ts가 다른 파일과 CPU를 나눠 쓰면 50ms 예산 측정이 흔들린다. 전체 0.5초라 순차 실행 비용 없음.
    fileParallelism: false,
  },
});
