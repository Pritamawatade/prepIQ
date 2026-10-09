// Hybrid retrieval: dense (Qdrant cosine) × multi-query + HyDE, fused with
// BM25 keyword scores via RRF. LEARNING.md → "Hybrid + RRF".

import { embedTexts } from './embeddings';
import { denseSearch, StoredChunk } from './qdrant';
import { buildBm25, scoreBm25 } from './bm25';
import { reciprocalRankFusion } from './rrf';
import { ragConfig } from './config';

export interface FusedChunk extends StoredChunk {
  rrfScore: number;
  bm25: number;
  fromQueries: string[];
}

export async function hybridRetrieve(
  userId: string,
  queries: string[],
  opts: { limitPerQuery?: number } = {},
): Promise<{ chunks: FusedChunk[]; degraded: boolean }> {
  const limit = opts.limitPerQuery ?? ragConfig.densePerQuery;
  const { vectors, degraded } = await embedTexts(queries);

  // 1. Dense search per query variant (parallel).
  const perQuery = await Promise.all(
    vectors.map((v, i) =>
      denseSearch(userId, v, limit, undefined, degraded).then(
        (chunks) => ({ i, chunks }),
        (err) => {
          console.error(`[rag/retrieve] dense search failed for variant ${i}:`, err.message);
          return { i, chunks: [] as StoredChunk[] };
        },
      ),
    ),
  );

  // 2. Pool + dedupe.
  const pool = new Map<string | number, StoredChunk & { fromQueries: string[] }>();
  perQuery.forEach(({ i, chunks }) => {
    for (const c of chunks) {
      const hit = pool.get(c.id);
      if (hit) hit.fromQueries.push(queries[i]);
      else pool.set(c.id, { ...c, fromQueries: [queries[i]] });
    }
  });
  const docs = [...pool.values()];
  if (docs.length === 0) return { chunks: [], degraded };

  // 3. BM25 over the pool (keyword signal).
  const index = buildBm25(docs.map((d) => d.text));
  const bm25ByDoc = docs.map((_, i) => {
    const scores = queries.map((q) => scoreBm25(index, q)[i]);
    return Math.max(...scores);
  });

  // 4. RRF over: each dense ranking + the BM25 ranking.
  const denseLists = perQuery.map(({ chunks }) => chunks.map((c) => c.id));
  const bm25Order = docs
    .map((d, i) => ({ id: d.id, s: bm25ByDoc[i] }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.id);
  const fused = reciprocalRankFusion([...denseLists, bm25Order]);

  const fusedMap = new Map(fused.map((f) => [f.id, f.score]));
  const ranked: FusedChunk[] = docs
    .map((d, i) => ({
      ...d,
      bm25: bm25ByDoc[i],
      rrfScore: fusedMap.get(d.id) ?? 0,
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);

  return { chunks: ranked, degraded };
}
