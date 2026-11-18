const pad = (n: number) => String(n).padStart(2, "0");

/** epoch ms → "YYYY-MM-DD HH:mm" (실행 환경 시간대) — 대시보드 수정 시각 (M6 FR-007) */
export function formatDateTime(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
