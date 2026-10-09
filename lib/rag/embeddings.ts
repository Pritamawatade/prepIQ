// Local embeddings: Xenova/all-MiniLM-L6-v2 (384-dim), zero API key, runs in-process.
// Why local? Groq serves LLMs, not embeddings — so production RAG-on-Groq pairs a
// Groq LLM with either (a) local embeddings (this file, free, private) or (b) a hosted
// embedding API (Voyage/Cohere) when you outgrow a single Node process.
// LEARNING.md → "Embeddings".

import { ragConfig } from './config';

let pipePromise: Promise<any> | null = null;
let hashFallbackWarned = false;

function getPipeline(): Promise<any> {
  if (!pipePromise) {
    const pending = (async () => {
      // Import lazily so unit tests / edge builds that never embed stay light.
      const { pipeline } = await import('@xenova/transformers');
      const pipe = await pipeline('feature-extraction', ragConfig.embeddingModel, {
        quantized: true,
      });
      return pipe;
    })();
    pipePromise = pending.catch((err) => {
      // A failed download shouldn't pin this process to hash vectors forever.
      pipePromise = null;
      throw err;
    });
  }
  return pipePromise;
}

/** Deterministic offline fallback (hashed char-trigrams) so ingest/query never hard-crash
 *  when the model can't download (e.g. no network). Quality is lower — the trace flags it. */
function hashEmbed(text: string, dim = ragConfig.embeddingDim): number[] {
  const vec = new Array<number>(dim).fill(0);
  const t = ` ${text.toLowerCase()} `;
  for (let i = 0; i < t.length - 2; i++) {
    const tri = t.slice(i, i + 3);
    let h = 2166136261;
    for (let j = 0; j < tri.length; j++) {
      h ^= tri.charCodeAt(j);
      h = Math.imul(h, 16777619);
    }
    vec[Math.abs(h) % dim] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(texts: string[]): Promise<{ vectors: number[][]; degraded: boolean }> {
  const clean = texts.map((t) => (t || '').slice(0, 8000));
  try {
    const pipe = await getPipeline();
    const vectors: number[][] = [];
    for (const t of clean) {
      const out = await pipe(t, { pooling: 'mean', normalize: true });
      vectors.push(Array.from(out.data as Float32Array));
    }
    return { vectors, degraded: false };
  } catch (err) {
    if (!hashFallbackWarned) {
      console.warn('[rag/embeddings] transformer model unavailable, using hash fallback:', (err as Error).message);
      hashFallbackWarned = true;
    }
    return { vectors: clean.map((t) => hashEmbed(t)), degraded: true };
  }
}

export async function embedQuery(text: string) {
  const { vectors, degraded } = await embedTexts([text]);
  return { vector: vectors[0], degraded };
}

/** LangChain-compatible adapter so old ingest code paths keep working if needed. */
export class LocalEmbeddings {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return (await embedTexts(texts)).vectors;
  }
  async embedQuery(text: string): Promise<number[]> {
    return (await embedQuery(text)).vector;
  }
}
