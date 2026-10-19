// scripts/rag-verify.ts  end-to-end RAG verification for nodejs.pdf.
// Usage: bun scripts/rag-verify.ts
// Steps: parse PDF → semantic chunk → embed (local MiniLM) → upsert to Qdrant
//        → hybrid retrieve + full pipeline answerQuestion on 3 test questions.
// Asserts: chunks>0, retrieval hits>0, answers grounded (no "couldn't find" for in-doc Qs).
import 'dotenv/config';
import fs from 'fs';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { semanticChunk } from '../lib/rag/semantic-chunker';
import { embedTexts } from '../lib/rag/embeddings';
import { upsertChunks, qdrant } from '../lib/rag/qdrant';
import { collectionForUser } from '../lib/rag/config';
import { hybridRetrieve } from '../lib/rag/retrieve';
import { answerQuestion } from '../lib/rag/pipeline';

const TEST_USER = process.env.RAG_TEST_USER || 'test-nodejs-user';
const PDF_PATH = './nodejs.pdf';

const QUESTIONS = [
  'How do I run a Node.js script from the terminal?',
  'How do I import a core module like fs in Node.js?',
  'How do you create an Express web server that listens on port 3000?',
];

async function main() {
  console.log(`[verify] Qdrant: ${process.env.QDRANT_URL || 'http://localhost:6333'}`);
  const health = await qdrant().getCollections();
  console.log(`[verify] Qdrant OK, collections: ${health.collections.map((c) => c.name).join(',') || '(none)'}`);

  if (!fs.existsSync(PDF_PATH)) throw new Error(`PDF not found at ${PDF_PATH}`);

  console.log(`[verify] Loading ${PDF_PATH} ...`);
  const docs = await new PDFLoader(PDF_PATH).load();
  console.log(`[verify] Pages loaded: ${docs.length}`);
  const nonEmpty = docs.filter((d) => d.pageContent.trim().length > 0).length;
  console.log(`[verify] Non-empty pages: ${nonEmpty}`);
  if (nonEmpty === 0) throw new Error('PDF has no extractable text');

  const allChunks = docs.flatMap((d: any) =>
    semanticChunk(d.pageContent, {}).map((c) => ({
      ...c,
      page: d.metadata?.loc?.pageNumber ?? d.metadata?.page ?? null,
    })),
  );
  console.log(`[verify] Semantic chunks: ${allChunks.length}`);
  if (allChunks.length === 0) throw new Error('Chunker produced 0 chunks');

  console.log('[verify] Embedding chunks (local MiniLM, first run downloads model)...');
  const { vectors, degraded } = await embedTexts(allChunks.map((c) => c.text));
  console.log(`[verify] Vectors: ${vectors.length}x${vectors[0]?.length}, degraded=${degraded}`);
  if (vectors[0]?.length !== 384) throw new Error(`Expected 384-dim vectors, got ${vectors[0]?.length}`);

  console.log(`[verify] Upserting to collection ${collectionForUser(TEST_USER, degraded)} ...`);
  await upsertChunks(
    TEST_USER,
    allChunks.map((c: any, i: number) => ({
      vector: vectors[i],
      payload: {
        text: c.text,
        fileName: 'nodejs.pdf',
        path: PDF_PATH,
        userId: TEST_USER,
        pageNumber: c.page,
        page: c.page,
        fileType: '.pdf',
        headingPath: c.headingPath,
        chunkIndex: c.chunkIndex,
        embeddingsDegraded: degraded,
      },
    })),
    degraded,
  );
  console.log('[verify] Upsert done.');

  // Retrieval sanity per question (fast, no LLM needed)
  let failures = 0;
  for (const q of QUESTIONS) {
    const { chunks, degraded: rd } = await hybridRetrieve(TEST_USER, [q]);
    // hybridRetrieve embeds the query itself; if ingest used hash fallback but query
    // doesn't (or vice versa) the collection name differs  retry on the other one.
    let hitChunks = chunks;
    if (hitChunks.length === 0) {
      const other = await hybridRetrieve(TEST_USER, [q], {}).catch(() => null);
      void other;
    }
    console.log(`[verify] Q: "${q}" → ${hitChunks.length} fused chunks (degraded=${rd})`);
    if (hitChunks.length === 0) {
      // Try the alternate degraded collection explicitly
      const { denseSearch } = await import('../lib/rag/qdrant');
      const { embedQuery } = await import('../lib/rag/embeddings');
      const { vector, degraded: qd } = await embedQuery(q);
      const alt = await denseSearch(TEST_USER, vector, 5, undefined, !degraded).catch(() => []);
      console.log(`[verify]   alt-collection probe: ${alt.length} hits (queryDegraded=${qd})`);
      if (alt.length === 0) {
        console.error(`[verify] FAIL: no retrieval hits for "${q}"`);
        failures++;
      }
    } else {
      console.log(`[verify]   top hit: ${hitChunks[0].text.slice(0, 160).replace(/\n/g, ' ')}...`);
    }
  }

  // Full pipeline (includes Groq LLM; degrades gracefully if Groq down)
  for (const q of QUESTIONS) {
    console.log(`\n[verify] Pipeline answering: "${q}"`);
    const res = await answerQuestion(TEST_USER, q, []);
    console.log(`[verify]   answer (${res.structured.answer.length} chars): ${res.structured.answer.slice(0, 300).replace(/\n/g, ' ')}...`);
    console.log(`[verify]   citations=${res.structured.citations.length} confidence=${res.structured.confidence} degraded=[${res.trace.degraded.join(',')}]`);
    console.log(`[verify]   stages: ${res.trace.stages.map((s) => `${s.name}:${s.ms}ms`).join(' ')}`);
    const noEvidence = res.structured.answer.includes("couldn't find a definitive answer");
    if (noEvidence) {
      console.error(`[verify] FAIL: pipeline found no evidence for in-doc question "${q}"`);
      failures++;
    }
    if (res.structured.citations.length === 0) {
      console.error(`[verify] FAIL: zero citations for "${q}"`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n[verify] RESULT: FAIL (${failures} failures)`);
    process.exit(1);
  }
  console.log('\n[verify] RESULT: PASS  RAG is working on nodejs.pdf');
}

main().catch((e) => {
  console.error('[verify] FATAL:', e);
  process.exit(1);
});
