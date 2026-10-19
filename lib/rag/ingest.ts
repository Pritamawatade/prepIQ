// Shared ingest: download → load → semantic-chunk → embed → upsert.
// Used by both /api/ingest and /api/ingest-batch. LEARNING.md → "Ingest path".

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import type { Document } from '@langchain/core/documents';
import { supabaseServer } from '@/lib/supabaseServer';
import { semanticChunk } from './semantic-chunker';
import { embedTexts } from './embeddings';
import { upsertChunks } from './qdrant';

export interface IngestOutcome {
  metadataId: string;
  fileName: string;
  chunks: number;
}

export async function ingestMetadataId(metadataId: string, userId: string): Promise<IngestOutcome> {
  const { data: meta, error: metaErr } = await supabaseServer
    .from('documents_metadata')
    .select('*')
    .eq('id', metadataId)
    .eq('user_id', userId)
    .single();
  if (metaErr || !meta) throw new Error(`Metadata not found: ${metadataId}`);

  const { data: fileBlob, error: downloadErr } = await supabaseServer.storage
    .from('documents')
    .download(meta.path);
  if (downloadErr || !fileBlob) {
    throw new Error(`Download failed for ${meta.file_name}: ${downloadErr?.message}`);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingest-'));
  const safeBase = path.basename(meta.file_name);
  const localFile = path.join(tmpDir, safeBase);
  await fs.writeFile(localFile, Buffer.from(await fileBlob.arrayBuffer()));

  try {
    const ext = path.extname(safeBase).toLowerCase();
    let docs: Document[];
    if (ext === '.pdf') docs = await new PDFLoader(localFile).load();
    else if (ext === '.docx') docs = await new DocxLoader(localFile).load();
    else if (ext === '.csv') docs = await new CSVLoader(localFile).load();
    else if (ext === '.txt' || ext === '.md') {
      // Plain text needs no loader  read directly.
      const text = await fs.readFile(localFile, 'utf-8');
      docs = [{ pageContent: text, metadata: {} } as Document];
    } else throw new Error(`Unsupported file type: ${ext}`);
    // Per-page texts → semantic chunks (heading-aware, table-preserving).
    const allChunks = docs.flatMap((d: Document) =>
      semanticChunk(d.pageContent, {}).map((c) => ({
        ...c,
        page: (d.metadata as any)?.loc?.pageNumber ?? (d.metadata as any)?.page ?? null,
      })),
    );
    if (allChunks.length === 0) throw new Error('No extractable text found.');

    const { vectors, degraded } = await embedTexts(allChunks.map((c: { text: string }) => c.text));
    await upsertChunks(
      meta.user_id,
      allChunks.map((c: { text: string; page: unknown; headingPath: string; chunkIndex: number }, i: number) => ({
        vector: vectors[i],
        payload: {
          text: c.text,
          fileName: meta.file_name,
          path: meta.path,
          userId: meta.user_id,
          pageNumber: c.page,
          page: c.page,
          fileType: ext,
          headingPath: c.headingPath,
          chunkIndex: c.chunkIndex,
          embeddingsDegraded: degraded,
        },
      })),
      degraded,
    );
    return { metadataId, fileName: meta.file_name, chunks: allChunks.length };
  } finally {
    await fs.rm(localFile, { force: true }).catch(() => {});
    await fs.rmdir(tmpDir).catch(() => {});
  }
}
