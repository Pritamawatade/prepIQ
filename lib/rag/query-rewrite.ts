// Query rewriting + HyDE + multi-query expansion (all via Groq fast model).
// Problem solved: users ask vague/short questions ("revenue?") that embed far from
// the document wording ("Q3 consolidated net sales grew 12% YoY"). Rewriting closes
// that vocabulary gap before retrieval. LEARNING.md → "Query rewriting" + "HyDE".

import { groqJson, groqChat } from './groq';
import { ragConfig } from './config';

export interface ExpandedQuery {
  standalone: string; // self-contained rewrite (coreference resolved)
  variants: string[]; // paraphrases for multi-query retrieval
  hyde: string; // hypothetical answer passage (HyDE)
}

/** Heuristic fallback when Groq is unreachable  pipeline keeps working. */
export function heuristicExpand(question: string): ExpandedQuery {
  const q = question.trim();
  return {
    standalone: q,
    variants: [q, `${q} key facts figures summary`, `what does the document say about ${q}`].slice(
      0,
      ragConfig.multiQueryCount,
    ),
    hyde: `The document states the following about "${q}": key facts, figures, and conclusions relevant to the question.`,
  };
}

export async function expandQuery(
  question: string,
  history: { role: string; content: string }[] = [],
): Promise<{ expanded: ExpandedQuery; degraded: boolean }> {
  try {
    const convo = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n');
    const rewritten = await groqJson<{ standalone: string; variants: string[] }>(
      [
        {
          role: 'user',
          content: `Rewrite this follow-up question as a standalone search query. Resolve pronouns from history. Then give ${ragConfig.multiQueryCount - 1} paraphrased variants using different wording (synonyms, formal/informal) to maximize retrieval recall.\n\nHistory:\n${convo || '(none)'}\n\nQuestion: ${question}`,
        },
      ],
      { model: ragConfig.fastModel, maxTokens: 300 },
    );
    // HyDE: a hypothetical answer embeds closer to real answers than the question does.
    const hyde = await groqChat(
      [
        {
          role: 'user',
          content: `Write a 4-6 sentence hypothetical answer to this question, as if from a business document. Include plausible structure (facts, numbers, conclusions) but do NOT invent citations.\n\nQuestion: ${rewritten.standalone || question}`,
        },
      ],
      { model: ragConfig.fastModel, maxTokens: 300 },
    );
    return {
      expanded: {
        standalone: rewritten.standalone || question,
        variants: [rewritten.standalone || question, ...(rewritten.variants || [])].slice(
          0,
          ragConfig.multiQueryCount,
        ),
        hyde: hyde || question,
      },
      degraded: false,
    };
  } catch (err) {
    console.warn('[rag/rewrite] Groq unavailable, heuristic fallback:', (err as Error).message);
    return { expanded: heuristicExpand(question), degraded: true };
  }
}
