// The full pipeline: guardrails → rewrite/HyDE → hybrid+RRF → rerank → agent →
// structured answer → output guardrails → evaluation. One function, full trace.
// LEARNING.md → "How the pipeline fits together".

import { ragConfig } from './config';
import { groqJson } from './groq';
import { expandQuery } from './query-rewrite';
import { hybridRetrieve } from './retrieve';
import { rerank } from './rerank';
import { runAgent } from './agent';
import { guardInput, redactPII, checkGrounding } from './guardrails';
import { answerSystemPrompt, evidenceBlock, NO_EVIDENCE_MESSAGE } from './prompts';
import { lexicalMetrics, judgeAnswer, RetrievalMetrics } from './evaluate';

export interface Citation {
  file: string;
  page: number | null;
  quote: string;
}

export interface StructuredAnswer {
  answer: string;
  citations: Citation[];
  confidence: number;
  followups: string[];
}

export interface PipelineTrace {
  stages: { name: string; ms: number; note: string }[];
  standaloneQuery: string;
  variants: string[];
  candidateCount: number;
  degraded: string[]; // which stages fell back
}

export interface PipelineResult {
  structured: StructuredAnswer;
  sources: { file: string; page: number | null }[];
  trace: PipelineTrace;
  metrics: RetrievalMetrics;
}

function emptyAnswer(reason: string): StructuredAnswer {
  return { answer: reason, citations: [], confidence: 0, followups: [] };
}

export async function answerQuestion(
  userId: string,
  question: string,
  history: { role: string; content: string }[] = [],
): Promise<PipelineResult> {
  const stages: PipelineTrace['stages'] = [];
  const degraded: string[] = [];
  const timed = async <T>(name: string, fn: () => Promise<T>, note = ''): Promise<T> => {
    const t0 = Date.now();
    try {
      const out = await fn();
      stages.push({ name, ms: Date.now() - t0, note });
      return out;
    } catch (err) {
      stages.push({ name, ms: Date.now() - t0, note: `FAILED: ${(err as Error).message}` });
      throw err;
    }
  };

  // 1. Input guardrail (fails closed).
  const gate = guardInput(question);
  if (!gate.ok) {
    return {
      structured: emptyAnswer(`Request blocked: ${gate.reason}`),
      sources: [],
      trace: { stages, standaloneQuery: question, variants: [], candidateCount: 0, degraded: ['input-guardrail'] },
      metrics: { lexical: { contextCoverage: 0, topChunkOverlap: 0 }, degraded: false },
    };
  }

  // 2. Query rewriting + HyDE.
  const { expanded, degraded: rewriteDegraded } = await timed('rewrite+hyde', () =>
    expandQuery(question, history),
  );
  if (rewriteDegraded) degraded.push('rewrite+hyde');
  const queries = [...expanded.variants, expanded.hyde];

  // 3. Hybrid retrieval + RRF.
  const { chunks: fused, degraded: retDegraded } = await timed(
    'hybrid-retrieve+rrf',
    () => hybridRetrieve(userId, queries),
    `${queries.length} query variants`,
  );
  if (retDegraded) degraded.push('embeddings(hash-fallback)');

  if (fused.length === 0) {
    return {
      structured: emptyAnswer(NO_EVIDENCE_MESSAGE),
      sources: [],
      trace: { stages, standaloneQuery: expanded.standalone, variants: expanded.variants, candidateCount: 0, degraded },
      metrics: { lexical: { contextCoverage: 0, topChunkOverlap: 0 }, degraded: false },
    };
  }

  // 4. Rerank to top-K.
  const { chunks: reranked, degraded: rerankDegraded } = await timed('rerank', () =>
    rerank(expanded.standalone, fused),
  );
  if (rerankDegraded) degraded.push('rerank');
  const topK = reranked.slice(0, ragConfig.finalTopK);

  // 5. Agent loop (bounded tool use over the evidence).
  const agent = await timed('agent', () => runAgent(userId, expanded.standalone, topK), `${topK.length} seed chunks`);
  if (agent.degraded) degraded.push('agent');
  const evidence = agent.evidence.slice(0, ragConfig.finalTopK);

  // 6. Structured answer (JSON-only contract → validated here).
  const structured = await timed('answer', async () => {
    const raw = await groqJson<StructuredAnswer>(
      [
        { role: 'system', content: answerSystemPrompt() },
        {
          role: 'user',
          content: `Question: ${expanded.standalone}\n\nContext:\n${evidenceBlock(evidence)}\n\n${agent.draft ? `Agent draft insight: ${agent.draft.slice(0, 800)}\n\n` : ''}Answer now as JSON.`,
        },
      ],
      { model: ragConfig.smartModel, maxTokens: 1500 },
    );
    if (typeof raw.answer !== 'string' || !Array.isArray(raw.citations)) {
      throw new Error('Answer model broke the JSON contract.');
    }
    return {
      answer: raw.answer,
      citations: raw.citations.slice(0, 8).map((c) => ({
        file: String(c.file || 'Unknown'),
        page: typeof c.page === 'number' ? c.page : null,
        quote: String(c.quote || '').slice(0, 300),
      })),
      confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.5))),
      followups: (raw.followups || []).map(String).slice(0, 3),
    } as StructuredAnswer;
  });

  // 7. Output guardrails: redact PII + grounding check (never silently fail).
  const { text: clean, redactions } = redactPII(structured.answer);
  structured.answer = clean;
  const grounding = checkGrounding(structured.answer, structured.citations, evidence);
  if (!grounding.grounded) {
    structured.confidence = Math.min(structured.confidence, 0.4);
    degraded.push(`grounding(${grounding.notes.join(' | ').slice(0, 160)})`);
  }
  if (redactions) degraded.push(`pii-redactions:${redactions}`);

  // 8. Evaluation (lexical always; judge best-effort).
  const lexical = lexicalMetrics(expanded.standalone, evidence);
  const judge = await judgeAnswer(expanded.standalone, structured.answer, evidence);

  return {
    structured,
    sources: structured.citations.map((c) => ({ file: c.file, page: c.page })),
    trace: {
      stages,
      standaloneQuery: expanded.standalone,
      variants: expanded.variants,
      candidateCount: fused.length,
      degraded,
    },
    metrics: { lexical, judge, degraded: !judge },
  };
}
