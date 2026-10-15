// Direct Qdrant access (no LangChain wrapper): explicit collections, HNSW tuning,
// payload indexes. One collection per user → hard data isolation.
// LEARNING.md → "Vector store (Qdrant)".

import { QdrantClient } from '@qdrant/js-client-rest';
import { ragConfig, collectionForUser } from './config';

let client: QdrantClient | null = null;

export function qdrant(): QdrantClient {
  if (!client) {
    client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      // Minor-version skew (e.g. server 1.13 vs client 1.19) is fine for the
      // query/upsert APIs we use; don't hard-crash verification on it.
      checkCompatibility: false,
    });
  }
  return client;
}

export interface StoredChunk {
  id: string | number;
  text: string;
  score: number;
  payload: Record<string, any>;
}

export async function ensureUserCollection(userId: string, embeddingsDegraded = false): Promise<string> {
  const name = collectionForUser(userId, embeddingsDegraded);
  const c = qdrant();
  const exists = await c.getCollections().then(
    (r) => r.collections.some((x) => x.name === name),
    () => false,
  );
  if (!exists) {
    await c.createCollection(name, {
      vectors: { size: ragConfig.embeddingDim, distance: 'Cosine' },
      hnsw_config: { m: 16, ef_construct: 128 },
      optimizers_config: { indexing_threshold: 10_000 },
    });
    // Payload indexes make filtered search (per-file, per-type) fast at scale.
    await c.createPayloadIndex(name, { field_name: 'fileName', field_schema: 'keyword' }).catch(() => {});
    await c.createPayloadIndex(name, { field_name: 'fileType', field_schema: 'keyword' }).catch(() => {});
  }
  return name;
}

export async function upsertChunks(
  userId: string,
  items: { vector: number[]; payload: Record<string, any> }[],
  embeddingsDegraded = false,
): Promise<void> {
  const name = await ensureUserCollection(userId, embeddingsDegraded);
  const BATCH = 64;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH).map((it) => ({
      // Qdrant point IDs must be unsigned integers or UUIDs.
      id: crypto.randomUUID(),
      vector: it.vector,
      payload: it.payload,
    }));
    await qdrant().upsert(name, { wait: true, points: batch });
  }
}

export async function denseSearch(
  userId: string,
  vector: number[],
  limit: number,
  filter?: Record<string, any>,
  embeddingsDegraded = false,
): Promise<StoredChunk[]> {
  const name = await ensureUserCollection(userId, embeddingsDegraded);
  const must: any[] = [];
  if (filter?.fileName) must.push({ key: 'fileName', match: { value: filter.fileName } });
  const res = await qdrant().query(name, {
    query: vector,
    limit,
    with_payload: true,
    filter: must.length ? { must } : undefined,
    params: { hnsw_ef: 128 },
  });
  const points = (res as any).points ?? res ?? [];
  return points.map((p: any) => ({
    id: p.id,
    text: (p.payload?.text as string) || '',
    score: p.score ?? 0,
    payload: (p.payload as Record<string, any>) || {},
  }));
}
