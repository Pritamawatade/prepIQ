// Agentic loop with tool calling: the LLM can search again with refined queries
// and pull wider context around a chunk before answering. Bounded (maxSteps) and
// evidence-constrained (tools only read retrieved chunks — no web, no shell).
// LEARNING.md → "AI agents + tool calling".

import { groqChat } from './groq';
import { ragConfig } from './config';
import { hybridRetrieve, FusedChunk } from './retrieve';
import { answerSystemPrompt, evidenceBlock } from './prompts';

export interface AgentStep {
  thought: string;
  tool: string;
  args: Record<string, any>;
  resultSummary: string;
}

interface AgentState {
  steps: AgentStep[];
  extraChunks: FusedChunk[];
}

const TOOLS_DOC = `Available tools (call exactly one per turn with JSON {"tool": "...", "args": {...}}):
- search_docs {"query": "..."} — run another hybrid retrieval pass with a refined query.
- finish {"draft": "..."} — stop and use this draft as the basis for the final answer.
Reply with the tool JSON only, no other text.`;

async function agentTurn(
  question: string,
  evidence: FusedChunk[],
  state: AgentState,
  model: string,
): Promise<{ tool: string; args: Record<string, any> }> {
  const history = state.steps
    .map((s, i) => `Step ${i + 1}: thought="${s.thought}" tool=${s.tool} result="${s.resultSummary}"`)
    .join('\n');
  const raw = await groqChat(
    [
      {
        role: 'system',
        content: `You are a careful research agent answering ONLY from the evidence. Current evidence:\n${evidenceBlock([...evidence, ...state.extraChunks].slice(0, 10))}\n\n${TOOLS_DOC}`,
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nPrior steps:\n${history || '(none)'}\n\nDecide the single next tool call. If evidence suffices, call finish.`,
      },
    ],
    { model, temperature: 0.1, maxTokens: 400 },
  );
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as { tool: string; args: Record<string, any> };
  if (!['search_docs', 'finish'].includes(parsed.tool)) {
    throw new Error(`Unknown tool: ${parsed.tool}`);
  }
  return parsed;
}

/** Run the bounded agent loop. Always returns evidence + a draft, even on LLM failure. */
export async function runAgent(
  userId: string,
  question: string,
  seedEvidence: FusedChunk[],
): Promise<{ evidence: FusedChunk[]; draft: string; steps: AgentStep[]; degraded: boolean }> {
  const state: AgentState = { steps: [], extraChunks: [] };
  let degraded = false;

  for (let step = 0; step < ragConfig.agentMaxSteps; step++) {
    let call: { tool: string; args: Record<string, any> };
    try {
      call = await agentTurn(question, seedEvidence, state, ragConfig.smartModel);
    } catch (err) {
      console.warn('[rag/agent] turn failed, stopping loop:', (err as Error).message);
      degraded = true;
      break;
    }

    if (call.tool === 'finish') {
      state.steps.push({
        thought: 'Evidence sufficient.',
        tool: 'finish',
        args: call.args,
        resultSummary: 'Loop complete.',
      });
      return {
        evidence: [...seedEvidence, ...state.extraChunks],
        draft: String(call.args.draft || ''),
        steps: state.steps,
        degraded,
      };
    }

    if (call.tool === 'search_docs') {
      const q = String(call.args.query || question);
      try {
        const { chunks } = await hybridRetrieve(userId, [q]);
        const fresh = chunks.filter(
          (c) => ![...seedEvidence, ...state.extraChunks].some((e) => e.id === c.id),
        ).slice(0, 4);
        state.extraChunks.push(...fresh);
        state.steps.push({
          thought: `Refine search with: ${q}`,
          tool: 'search_docs',
          args: call.args,
          resultSummary: `${fresh.length} new chunks.`,
        });
      } catch (err) {
        degraded = true;
        state.steps.push({
          thought: `Refine search with: ${q}`,
          tool: 'search_docs',
          args: call.args,
          resultSummary: `failed: ${(err as Error).message}`,
        });
      }
      continue;
    }

  }

  return { evidence: [...seedEvidence, ...state.extraChunks], draft: '', steps: state.steps, degraded };
}

export { answerSystemPrompt };
