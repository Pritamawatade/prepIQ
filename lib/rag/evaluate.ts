// Retrieval evaluation: lexical metrics (always computed, no LLM needed) +
// an LLM judge for faithfulness/relevance. Returned in the API trace and logged,
// so relevance regressions are visible per query. LEARNING.md → "Retrieval evaluation".

import { groqJson } from './groq';
import { ragConfig } from './config';
import { tokenize } from './bm25';

export interface RetrievalMetrics {
  lexical: {
    contextCoverage: number; // fraction of question terms found in evidence
    topChunkOverlap: number; // Jaccard(question, best chunk)
  };
  judge?: { faithfulness: number; relevance: number; notes: string };
  degraded: boolean;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function lexicalMetrics(
  question: string,
  evidence: { text: string }[],
): RetrievalMetrics['lexical'] {
  const qTerms = new Set(tokenize(question));
  if (!qTerms.size || !evidence.length) return { contextCoverage: 0, topChunkOverlap: 0 };
  const poolTokens = new Set(
    evidence.flatMap((e) => tokenize(e.text)).slice(0, 4000),
  );
  const covered = [...qTerms].filter((t) => poolTokens.has(t)).length / qTerms.size;
  const best = Math.max(
    ...evidence.map((e) => jaccard(qTerms, new Set(tokenize(e.text)))),
  );
  return { contextCoverage: Number(covered.toFixed(3)), topChunkOverlap: Number(best.toFixed(3)) };
}

export async function judgeAnswer(
  question: string,
  answer: string,
  evidence: { text: string }[],
): Promise<RetrievalMetrics['judge']> {
  try {
    return await groqJson(
      [
        {
          role: 'user',
          content: `Rate this RAG answer 0-10 on faithfulness (claims supported by evidence) and relevance (actually answers the question). Reply {"faithfulness": n, "relevance": n, "notes": "..."}.\n\nQuestion: ${question}\n\nAnswer: ${answer.slice(0, 2000)}\n\nEvidence:\n${evidence.map((e) => e.text.slice(0, 800)).join('\n---\n').slice(0, 3000)}`,
        },
      ],
      { model: ragConfig.fastModel, maxTokens: 300 },
    );
  } catch {
    return undefined;
  }
}
