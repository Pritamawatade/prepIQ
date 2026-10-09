// Reciprocal Rank Fusion: score(d) = Σ 1/(k + rank). No training, no weights,
// robust to one retriever being wrong. LEARNING.md → "Hybrid + RRF".

import { ragConfig } from './config';

/** Each list is an ordered array of doc ids (best first). Returns ids sorted by fused score. */
export function reciprocalRankFusion(
  rankedLists: (string | number)[][],
  k = ragConfig.rrfK,
): { id: string | number; score: number }[] {
  const scores = new Map<string | number, number>();
  for (const list of rankedLists) {
    list.forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
