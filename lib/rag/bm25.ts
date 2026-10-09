// BM25 (Okapi) implemented in-repo: zero deps, pure functions, testable.
// Role in the pipeline: keyword signal fused with dense vectors via RRF.
// At larger scale move this into Qdrant sparse vectors or Elasticsearch;
// the RRF layer above stays identical. LEARNING.md → "Hybrid + RRF".

const K1 = 1.5;
const B = 0.75;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || []).filter(
    (t) => t.length > 1,
  );
}

export interface Bm25Index {
  docTerms: Map<string, number>[];
  docLen: number[];
  avgLen: number;
  idf: Map<string, number>;
}

/** Build the index over the candidate pool. Cheap: pool is ~tens of chunks. */
export function buildBm25(docs: string[]): Bm25Index {
  const docTerms: Map<string, number>[] = [];
  const docLen: number[] = [];
  const df = new Map<string, number>();
  docs.forEach((d) => {
    const tf = new Map<string, number>();
    for (const t of tokenize(d)) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
    docTerms.push(tf);
    docLen.push(tokenize(d).length || 1);
  });
  const avgLen = docLen.reduce((a, b) => a + b, 0) / Math.max(1, docLen.length);
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [term, n] of df) {
    idf.set(term, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  }
  return { docTerms, docLen, avgLen: avgLen || 1, idf };
}

/** Score every doc against the query. Returns scores aligned with docs[]. */
export function scoreBm25(index: Bm25Index, query: string): number[] {
  const qTerms = tokenize(query);
  return index.docTerms.map((tf, i) => {
    let s = 0;
    const len = index.docLen[i];
    for (const t of qTerms) {
      const f = tf.get(t) ?? 0;
      if (!f) continue;
      const idf = index.idf.get(t) ?? 0;
      s += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * len) / index.avgLen)));
    }
    return s;
  });
}
