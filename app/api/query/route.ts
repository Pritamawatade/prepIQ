import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { answerQuestion } from '@/lib/rag/pipeline';

// POST /api/query { question } → { answer, sources, structured, trace, metrics }
// Full pipeline: guardrails → rewrite/HyDE → hybrid+RRF → rerank → agent →
// structured answer → output guardrails → evaluation. See LEARNING.md.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { question, history } = await req.json();
    if (!question) return NextResponse.json({ error: 'Question required' }, { status: 400 });

    const result = await answerQuestion(userId, question, history || []);

    // Best-effort history log (never fail the answer on logging).
    supabaseServer
      .from('query_history')
      .insert({
        user_id: userId,
        question,
        answer: result.structured.answer,
      })
      .then(({ error }) => {
        if (error) console.error('Error saving query history:', error);
      });

    return NextResponse.json({
      answer: result.structured.answer,
      sources: result.sources,
      structured: result.structured,
      trace: result.trace,
      metrics: result.metrics,
    });
  } catch (err: any) {
    console.error('Query route error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: err.message },
      { status: 500 },
    );
  }
}
