// Semantic chunking: heading-aware, sentence-respecting, table-preserving.
// Old code indexed whole PDF pages (or whole CSV rows) as one vector  high noise,
// low relevance. This splitter keeps one idea per chunk so cosine similarity means
// something. LEARNING.md → "Semantic chunking".

import { ragConfig } from './config';

export interface SemanticChunk {
  text: string;
  headingPath: string; // e.g. "3. Security > 3.1 Encryption"
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  tokenEstimate: number;
}

const HEADING_RE = /^(#{1,4}\s+.+|(?:\d+(?:\.\d+)*[\.\)]\s+.+)|([A-Z][A-Z0-9 ,&'’:\-()]{8,80})$)/;

export function estimateTokens(s: string): number {
  return Math.max(1, Math.ceil(s.length / 4));
}

function splitSentences(paragraph: string): string[] {
  // Keeps abbreviations and decimals mostly intact; good enough for chunking.
  const parts = paragraph.match(/[^.!?\n]+[.!?]+["'”)]?(\s+|$)|[^.!?\n]+(\n|$)/g);
  if (!parts) return [paragraph];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function isTableRow(line: string): boolean {
  return /\|.*\|/.test(line) || /^\s*[-*]\s+.+:\s+.+/.test(line) || /,.*,.*,/.test(line);
}

/** Split raw text into semantic chunks. Pure function  easy to unit test. */
export function semanticChunk(
  rawText: string,
  opts: { targetTokens?: number; overlapTokens?: number; minTokens?: number } = {},
): SemanticChunk[] {
  const target = opts.targetTokens ?? ragConfig.chunkTargetTokens;
  const overlap = opts.overlapTokens ?? ragConfig.chunkOverlapTokens;
  const min = opts.minTokens ?? ragConfig.chunkMinTokens;

  const lines = rawText.split('\n');
  const sections: { heading: string; body: string[] }[] = [];
  let current = { heading: '', body: [] as string[] };
  const headingStack: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      current.body.push('');
      continue;
    }
    if (HEADING_RE.test(trimmed) && trimmed.length < 120) {
      if (current.body.join(' ').trim()) sections.push(current);
      const level = (trimmed.match(/^#+/)?.[0].length ?? 1) - 1;
      headingStack.length = Math.min(headingStack.length, level);
      headingStack.push(trimmed.replace(/^#+\s*/, '').slice(0, 100));
      current = { heading: headingStack.join(' > '), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.join(' ').trim() || current.heading) sections.push(current);
  if (sections.length === 0) sections.push({ heading: '', body: lines });

  const chunks: SemanticChunk[] = [];
  let charCursor = 0;

  for (const sec of sections) {
    // Keep table-ish runs together  splitting a table across chunks kills recall.
    const units: string[] = [];
    let tableBuf: string[] = [];
    const flushTable = () => {
      if (tableBuf.length) {
        units.push(tableBuf.join('\n'));
        tableBuf = [];
      }
    };
    for (const para of sec.body.join('\n').split(/\n{2,}/)) {
      const p = para.trim();
      if (!p) continue;
      if (p.split('\n').every(isTableRow) && estimateTokens(p) < target) {
        tableBuf.push(p);
      } else {
        flushTable();
        if (estimateTokens(p) <= target) units.push(p);
        else units.push(...splitSentences(p.replace(/\n/g, ' ')));
      }
    }
    flushTable();

    let buf = '';
    let bufTokens = 0;
    const pushBuf = () => {
      const text = buf.trim();
      if (text && estimateTokens(text) >= min) {
        chunks.push({
          text,
          headingPath: sec.heading,
          chunkIndex: chunks.length,
          charStart: charCursor,
          charEnd: charCursor + text.length,
          tokenEstimate: estimateTokens(text),
        });
        charCursor += text.length + 1;
      }
      // Overlap: carry the tail sentences forward so context survives boundaries.
      const sentences = splitSentences(text);
      let tail = '';
      for (let i = sentences.length - 1; i >= 0 && estimateTokens(tail) < overlap; i--) {
        tail = sentences[i] + ' ' + tail;
      }
      buf = tail.trim();
      bufTokens = estimateTokens(buf);
    };

    for (const u of units) {
      const t = estimateTokens(u);
      if (bufTokens + t > target && bufTokens > 0) pushBuf();
      buf = buf ? buf + '\n\n' + u : u;
      bufTokens = estimateTokens(buf);
    }
    if (buf.trim()) {
      const text = buf.trim();
      chunks.push({
        text,
        headingPath: sec.heading,
        chunkIndex: chunks.length,
        charStart: charCursor,
        charEnd: charCursor + text.length,
        tokenEstimate: estimateTokens(text),
      });
      charCursor += text.length + 1;
    }
  }
  return chunks.filter((c) => c.text.trim().length > 0);
}
