// 상태바 문자 수·줄 수 (FR-008, research R7).
const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

/** 눈에 보이는 글자(grapheme) 수. 공백·줄바꿈 포함, 이모지·결합 문자는 1자. */
export function countChars(text: string): number {
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}

/** 줄 수 = 줄바꿈 수 + 1. */
export function countLines(text: string): number {
  return text.split("\n").length;
}

/** ko-KR 천 단위 쉼표. */
export function formatCount(n: number): string {
  return n.toLocaleString("ko-KR");
}
