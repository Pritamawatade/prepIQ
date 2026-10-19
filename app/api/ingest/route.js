// app/api/ingest/route.js  single-file ingest via the shared semantic pipeline.
import { auth } from '@clerk/nextjs/server';
import { ingestMetadataId } from '@/lib/rag/ingest';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }
  const { metadataId } = body || {};
  if (typeof metadataId !== 'string' || !metadataId) {
    return new Response(JSON.stringify({ error: 'metadataId required' }), { status: 400 });
  }
  try {
    const outcome = await ingestMetadataId(metadataId, userId);
    console.log('indexing done', outcome);
    return new Response(
      JSON.stringify({ success: true, documentsCount: outcome.chunks, fileName: outcome.fileName }),
      { status: 200 },
    );
  } catch (err) {
    console.error('Ingest route error:', err);
    const status = /metadata not found/i.test(err.message) ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message }), { status });
  }
}
