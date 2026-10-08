"use client";
import { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ file: string; page: number | null }>;
};

export default function ClientChat({ initialQuestion, initialAnswer }: { initialQuestion?: string | null; initialAnswer?: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const seed: ChatMessage[] = [];
    if (initialQuestion) seed.push({ role: 'user', content: initialQuestion });
    if (initialAnswer) seed.push({ role: 'assistant', content: initialAnswer });
    return seed;
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const answer: string = data.answer || '';
      const sources: Array<{ file: string; page: number | null }> = Array.isArray(data.sources) ? data.sources : [];
      setMessages((prev) => [...prev, { role: 'assistant', content: answer, sources }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-muted-foreground">This conversation is empty. Ask the first question.</div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`w-full flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border text-card-foreground rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                  <div className="font-medium mb-1">Sources</div>
                  <ul className="list-disc ml-5">
                    {m.sources.map((s, i) => (
                      <li key={i}>
                        {s.file}
                        {s.page ? ` (p. ${s.page})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="w-full flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-sm text-card-foreground">
              <span className="opacity-70">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 z-10 bg-background/90 pb-4 backdrop-blur">
        <div className="rounded-xl border border-border bg-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your question…"
            rows={1}
            className="w-full resize-none bg-transparent p-2 text-sm focus-visible:ring-0"
          />
          <div className="flex justify-end">
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
