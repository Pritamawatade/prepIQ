// Reranking: Groq LLM scores each candidate 0-10 for "does this answer the question".
// RRF gets relevance-ordering right ~cheaply; the LLM judge fixes the top order where
// precision matters most. Scale-up swap: Cohere Rerank / Voyage Rerank (one API call).
// LEARNING.md → "Reranking".

import { groqJson } from './groq';
import { ragConfig } from './config';
import type { FusedChunk } from './retrieve';

export interface RerankedChunk extends FusedChunk {
  relevance: number; // 0-10
}

export async function rerank(
  question: string,
  chunks: FusedChunk[],
  topN = ragConfig.rerankTopN,
): Promise<{ chunks: RerankedChunk[]; degraded: boolean }> {
  const shortlist = chunks.slice(0, Math.max(topN, ragConfig.finalTopK));
  if (shortlist.length === 0) return { chunks: [], degraded: false };

  try {
    const pack = shortlist
      .map((c, i) => `[${i}] (${c.payload?.fileName || 'doc'}): ${c.text.slice(0, 900)}`)
      .join('\n\n');
    const res = await groqJson<{ scores: { id: number; relevance: number }[] }>(
      [
        {
          role: 'user',
          content: `Question: ${question}\n\nScore each passage 0-10 for how directly it helps answer the question (10 = contains the answer, 0 = unrelated). Reply as JSON {"scores":[{"id":0,"relevance":8}]}.\n\nPassages:\n${pack}`,
        },
      ],
      { model: ragConfig.fastModel, maxTokens: 800 },
    );
    const byId = new Map(res.scores.map((s) => [s.id, s.relevance]));
    const ranked: RerankedChunk[] = shortlist.map((c, i) => ({
      ...c,
      relevance: Math.max(0, Math.min(10, Number(byId.get(i) ?? 5))),
    }));
    ranked.sort((a, b) => b.relevance - a.relevance || b.rrfScore - a.rrfScore);
    return { chunks: ranked, degraded: false };
  } catch (err) {
    console.warn('[rag/rerank] Groq unavailable, keeping RRF order:', (err as Error).message);
    return {
      chunks: shortlist.map((c) => ({ ...c, relevance: 5 })),
      degraded: true,
    };
  }
}
