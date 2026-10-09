// Guardrails: input validation + prompt-injection screen, output PII redaction +
// citation grounding check. Every stage fails closed (blocks or flags, never silently
// passes). LEARNING.md → "Guardrails".

import { ragConfig } from './config';

export interface GuardResult {
  ok: boolean;
  reason?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

/** Input gate: length, emptiness, known injection patterns. */
export function guardInput(question: string): GuardResult {
  const q = (question || '').trim();
  if (!q) return { ok: false, reason: 'Question is empty.' };
  if (q.length > ragConfig.maxQuestionChars) {
    return { ok: false, reason: `Question exceeds ${ragConfig.maxQuestionChars} characters.` };
  }
  for (const re of ragConfig.blockPatterns) {
    if (re.test(q)) {
      return { ok: false, reason: 'Request looks like a prompt-injection attempt and was blocked.' };
    }
  }
  // Tool-use framing that tries to hijack the agent ("tool: delete...") gets blocked.
  if (/^\s*(tool|function|system)\s*:/i.test(q)) {
    return { ok: false, reason: 'Tool/system framing is not accepted in questions.' };
  }
  return { ok: true };
}

/** Output gate: redact PII that may have leaked from documents into the answer. */
export function redactPII(text: string): { text: string; redactions: number } {
  let redactions = 0;
  const out = text
    .replace(EMAIL_RE, () => ((redactions += 1), '[redacted-email]'))
    .replace(CARD_RE, (m) =>
      m.replace(/\d/g, '').length >= 0 && /\d{4}.*\d{4}/.test(m)
        ? ((redactions += 1), '[redacted-card]')
        : m,
    )
    .replace(PHONE_RE, (m) =>
      (m.match(/\d/g) || []).length >= 8 ? ((redactions += 1), '[redacted-phone]') : m,
    );
  return { text: out, redactions };
}

/** Grounding check: every cited file must appear in the retrieved set, and the answer's
 *  key sentences should share vocabulary with the evidence (cheap hallucination tripwire). */
export function checkGrounding(
  answer: string,
  citations: { file: string }[],
  evidence: { text: string; payload?: Record<string, any> }[],
): { grounded: boolean; notes: string[] } {
  const notes: string[] = [];
  const files = new Set(
    evidence.map((e) => (e.payload?.fileName as string) || '').filter(Boolean),
  );
  for (const c of citations) {
    const base = (c.file || '').split('/').pop() || c.file;
    const match = [...files].some((f) => f.includes(base) || base.includes(f.split('/').pop() || ''));
    if (!match && files.size > 0) notes.push(`Citation "${c.file}" not found in retrieved files.`);
  }
  // Lexical overlap tripwire on content sentences (skip boilerplate like "I couldn't find").
  const sentences = answer.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 30);
  const evidenceTokens = new Set(
    evidence.flatMap((e) => (e.text.toLowerCase().match(/[a-z0-9]{3,}/g) || [])),
  );
  let weak = 0;
  for (const s of sentences.slice(0, 8)) {
    const toks = s.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
    if (!toks.length) continue;
    const hit = toks.filter((t) => evidenceTokens.has(t)).length / toks.length;
    if (hit < 0.15 && !/couldn'?t find|no .*found|not in the/i.test(s)) weak++;
  }
  if (weak >= 2) notes.push(`${weak} answer sentences share little vocabulary with the evidence — verify for hallucination.`);
  return { grounded: notes.length === 0, notes };
}
