// Central tuning for the whole RAG stack. Change values here, not in routes.
// See LEARNING.md § "config" for what each knob does and the scale-up path.

export const ragConfig = {
  // --- Groq-hosted LLMs (the app calls Groq's API only) ---
  // Fast tasks: rewrite, guardrails, HyDE draft. Cheap + low latency.
  fastModel: process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b',
  // Quality tasks: rerank judge, final answer, agent reasoning.
  smartModel: process.env.GROQ_SMART_MODEL || 'openai/gpt-oss-120b',
  groqTimeoutMs: 30_000,

  // --- Embeddings: local MiniLM, 384 dims, no API key needed ---
  // Scale-up swap: Voyage / Cohere / hosted E5 (just replace lib/rag/embeddings.ts).
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  embeddingDim: 384,
  // v2 suffix: old OpenAI collections were 1536-dim and are incompatible.
  collectionSuffix: '_v2',

  // --- Semantic chunking ---
  chunkTargetTokens: 450, // ~350-500 words of dense content per chunk
  chunkOverlapTokens: 80,
  chunkMinTokens: 120,

  // --- Retrieval ---
  densePerQuery: 20, // candidates per rewritten query variant
  multiQueryCount: 3, // original + rewrites + HyDE go through RRF
  rrfK: 60, // RRF constant; 60 is the literature standard
  finalTopK: 6, // chunks passed to the answer model after rerank

  // --- Rerank / agent ---
  rerankTopN: 12, // RRF output trimmed to this before LLM rerank
  agentMaxSteps: 3,

  // --- Guardrails ---
  maxQuestionChars: 2000,
  blockPatterns: [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /system\s+prompt/i,
    /reveal\s+(your|the)\s+(system|secret|internal)/i,
    /jailbreak/i,
    /DAN\s+mode/i,
  ],
};

export function collectionForUser(userId: string, embeddingsDegraded = false): string {
  // Qdrant collection names allow [a-zA-Z0-9_-]; Clerk ids contain "_" already fine.
  // Keep hash-fallback vectors separate from MiniLM vectors: equal dimensions do not
  // make vectors from different embedding spaces comparable.
  return `${userId}${ragConfig.collectionSuffix}${embeddingsDegraded ? '_hash' : ''}`;
}
