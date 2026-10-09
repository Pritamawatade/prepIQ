// Single Groq entrypoint: chat + strict-JSON helpers with model fallback.
// LEARNING.md → "Groq / LLM layer".

import Groq from 'groq-sdk';
import { ragConfig } from './config';

let client: Groq | null = null;

export function groq(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Add it to .env (see .sample.env).');
  }
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`Groq timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t!);
  }
}

/** Plain chat completion. Falls back fast→smart or smart→fast once on error. */
export async function groqChat(
  messages: ChatMsg[],
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const primary = opts.model || ragConfig.smartModel;
  const fallback =
    primary === ragConfig.smartModel ? ragConfig.fastModel : ragConfig.smartModel;
  try {
    const res = await withTimeout(
      groq().chat.completions.create({
        model: primary,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 1024,
        messages,
      }),
      ragConfig.groqTimeoutMs,
    );
    return res.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    // One retry on the other model, then surface the error.
    const res = await withTimeout(
      groq().chat.completions.create({
        model: fallback,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 1024,
        messages,
      }),
      ragConfig.groqTimeoutMs,
    );
    return res.choices?.[0]?.message?.content?.trim() || '';
  }
}

/** Chat completion forced into JSON. Strips code fences; throws on unparseable output. */
export async function groqJson<T>(
  messages: ChatMsg[],
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<T> {
  const text = await groqChat(
    [
      {
        role: 'system',
        content:
          'You output ONLY valid JSON. No markdown fences, no commentary, no trailing text.',
      },
      ...messages,
    ],
    { ...opts, temperature: opts.temperature ?? 0.1 },
  );
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}
