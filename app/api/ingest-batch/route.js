// app/api/ingest-batch/route.js — multi-file ingest via the shared semantic pipeline.
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
  const { metadataIds } = body || {};

  if (!Array.isArray(metadataIds) || metadataIds.length === 0 || metadataIds.length > 10 || metadataIds.some((id) => typeof id !== 'string' || !id)) {
    return new Response(JSON.stringify({ error: 'metadataIds must contain 1–10 non-empty strings' }), { status: 400 });
  }

  const results = [];
  const errors = [];
  let totalDocuments = 0;

  for (const metadataId of metadataIds) {
    try {
      const outcome = await ingestMetadataId(metadataId, userId);
      results.push({
        metadataId,
        fileName: outcome.fileName,
        documentsCount: outcome.chunks,
        success: true,
      });
      totalDocuments += outcome.chunks;
    } catch (error) {
      console.error(`Error processing metadata ID ${metadataId}:`, error);
      errors.push(`Processing failed for metadata ID ${metadataId}: ${error.message}`);
    }
  }

  console.log(`Batch indexing completed. Processed ${results.length} files, ${totalDocuments} total chunks`);

  return new Response(
    JSON.stringify({
      success: true,
      processedFiles: results.length,
      totalFiles: metadataIds.length,
      totalDocuments,
      results,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { status: 200 },
  );
}
