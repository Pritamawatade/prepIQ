// lib/indexing.js — one-shot local ingest for nodejs.pdf using the CURRENT stack:
// semantic chunking + local MiniLM embeddings (384-dim) + per-user Qdrant collection.
// (The old version used OpenAI embeddings + fromExistingCollection and no longer
// matches lib/rag/*, so it always failed.)
// Usage:
//   RAG_TEST_USER=test-nodejs-user bun lib/indexing.js
// Verifies with: bun scripts/rag-verify.ts
import 'dotenv/config';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { semanticChunk } from './rag/semantic-chunker.ts';
import { embedTexts } from './rag/embeddings.ts';
import { upsertChunks } from './rag/qdrant.ts';
import { collectionForUser } from './rag/config.ts';

const path = './nodejs.pdf';
const userId = process.env.RAG_TEST_USER || 'test-nodejs-user';

async function index() {
  const loader = new PDFLoader(path);
  const docs = await loader.load();
  console.log(`Loaded ${docs.length} pages from ${path}`);

  const allChunks = docs.flatMap((d) =>
    semanticChunk(d.pageContent, {}).map((c) => ({
      ...c,
      page: d.metadata?.loc?.pageNumber ?? d.metadata?.page ?? null,
    })),
  );
  if (allChunks.length === 0) throw new Error('No extractable text found.');
  console.log(`Chunked into ${allChunks.length} semantic chunks`);

  const { vectors, degraded } = await embedTexts(allChunks.map((c) => c.text));
  console.log(`Embedded ${vectors.length}x${vectors[0]?.length} (degraded=${degraded})`);

  await upsertChunks(
    userId,
    allChunks.map((c, i) => ({
      vector: vectors[i],
      payload: {
        text: c.text,
        fileName: 'nodejs.pdf',
        path,
        userId,
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

  console.log(
    `Indexed successfully → collection ${collectionForUser(userId, degraded)} (${allChunks.length} chunks)`,
  );
}

index().catch((e) => {
  console.error('Indexing failed:', e);
  process.exit(1);
});
