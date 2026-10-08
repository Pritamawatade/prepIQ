"use client";
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRef, useState, useEffect, useMemo } from 'react';
import {
  ArrowUp,
  Check,
  Copy,
  FileText,
  History,
  Loader2,
  PanelLeft,
  Plus,
  Search,
  Share2,
  ThumbsDown,
  ThumbsUp,
  X,
  Clock,
  Code,
} from 'lucide-react';
import { DataChart } from '@/components/ui/data-chart';
import { extractNumericalData, shouldGenerateChart } from '@/lib/chart-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import React from "react"

type ChatMessage = {
  role: 'user' | 'assistant' | 'separator';
  content: string;
  sources?: Array<{ file: string; page: number | null }>;
  liked?: boolean;
  disliked?: boolean;
  timestamp?: string;
  userQuery?: string;
};

type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
};

/* ── Premium minimal SVG set (single-weight line art, theme-aware) ── */

function DocMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--primary)" />
      <path
        d="M13 11.5h8.5c4.4 0 7.5 2.9 7.5 7.3s-3.1 7.4-7.6 7.4H13V11.5Z"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="17.5" y1="15.5" x2="17.5" y2="22.5" stroke="var(--glow)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyRoomArt({ className = "h-36 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label="Documents waiting to be searched" className={className}>
      {/* back document */}
      <g opacity="0.55">
        <rect x="52" y="18" width="96" height="118" rx="10" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
        <line x1="68" y1="42" x2="132" y2="42" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
        <line x1="68" y1="58" x2="120" y2="58" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
        <line x1="68" y1="74" x2="126" y2="74" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* front document */}
      <rect x="76" y="30" width="96" height="118" rx="10" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      <line x1="92" y1="54" x2="156" y2="54" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      <line x1="92" y1="70" x2="144" y2="70" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
      <line x1="92" y1="86" x2="150" y2="86" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
      {/* citation tag */}
      <g>
        <rect x="92" y="102" width="86" height="22" rx="7" fill="none" stroke="var(--glow)" strokeWidth="2" strokeDasharray="5 4" />
        <line x1="102" y1="113" x2="150" y2="113" stroke="var(--glow)" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* magnifier with slow-rotating dashed ring — the one minimal animation */}
      <g>
        <circle cx="182" cy="52" r="26" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
        <circle cx="182" cy="52" r="31" fill="none" stroke="var(--glow)" strokeWidth="1.6" strokeDasharray="4 6" strokeLinecap="round" className="animate-spin-slower" />
        <circle cx="182" cy="52" r="11" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
        <line x1="190" y1="60" x2="200" y2="70" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function QueryPage() {
  const { isSignedIn } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!isSignedIn) return;
      try {
        const res = await fetch('/api/chat-history');
        if (res.ok) {
          const data = await res.json();
          setHistoryItems(data.history || []);
          const urlParams = new URLSearchParams(window.location.search);
          const sharedChatId = urlParams.get('chat');
          if (sharedChatId) {
            const sharedChat = data.history.find((item: HistoryItem) => item.id === sharedChatId);
            if (sharedChat) {
              setSelectedHistoryId(sharedChat.id);
              setMessages([
                { role: 'user', content: sharedChat.question, timestamp: sharedChat.created_at },
                { role: 'assistant', content: sharedChat.answer, timestamp: sharedChat.created_at, userQuery: sharedChat.question }
              ]);
              setShowSuggestions(false);
              window.history.replaceState({}, '', '/query');
              return;
            }
          }
          if (data.history && data.history.length > 0) {
            const firstItem = data.history[0];
            setSelectedHistoryId(firstItem.id);
            setMessages([
              { role: 'user', content: firstItem.question, timestamp: firstItem.created_at },
              { role: 'assistant', content: firstItem.answer, timestamp: firstItem.created_at, userQuery: firstItem.question }
            ]);
            setShowSuggestions(false);
          } else {
            generateSmartSuggestions([]);
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setLoading(false);
      }
    };
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const generateSmartSuggestions = (items: HistoryItem[]) => {
    const defaults = [
      "Summarize the key findings across my documents",
      "What are the revenue figures by quarter?",
      "List every action item with its owner",
      "How do the two latest reports differ?",
    ];
    if (items.length > 0) {
      setSuggestions([
        "Tell me more about the previous answer",
        "What evidence supports that conclusion?",
        ...defaults.slice(0, 2),
      ]);
    } else {
      setSuggestions(defaults);
    }
  };

  useEffect(() => {
    if (messages.length === 0 && !loading) {
      generateSmartSuggestions(historyItems);
      setShowSuggestions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const filteredHistory = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return historyItems;
    return historyItems.filter((h) => h.question.toLowerCase().includes(q));
  }, [historyItems, historyFilter]);

  const historyGroups = useMemo(() => {
    const groups: { [key: string]: HistoryItem[] } = {};
    const now = new Date();
    filteredHistory.forEach(item => {
      const date = new Date(item.created_at);
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      let key: string;
      if (diffInDays <= 0) key = 'Today';
      else if (diffInDays === 1) key = 'Yesterday';
      else if (diffInDays < 7) key = 'This week';
      else key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      (groups[key] ||= []).push(item);
    });
    return groups;
  }, [filteredHistory]);

  const sendMessage = async (customQuestion?: string) => {
    const question = (customQuestion || input).trim();
    if (!question || sending) return;
    setSending(true);
    setShowSuggestions(false);
    if (messages.length > 0 && !messages.some(m => m.role === 'separator')) {
      setMessages((prev) => [...prev, { role: 'separator', content: 'New questions' }]);
    }
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    if (!customQuestion) setInput('');
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const answer: string = data.answer || '';
      const sources: Array<{ file: string; page: number | null }> = Array.isArray(data.sources) ? data.sources : [];
      setMessages((prev) => [...prev, { role: 'assistant', content: answer, sources, userQuery: question }]);
      const historyRes = await fetch('/api/chat-history');
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistoryItems(historyData.history || []);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Please try again." }]);
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

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyCode = async (code: string, index: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleShareChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/query?chat=${chatId}`);
      setCopiedShareId(chatId);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch (err) {
      console.error('Failed to copy share link: ', err);
    }
  };

  const formatMessageContent = (content: string, messageIndex: number, userQuery?: string) => {
    const parts: React.ReactElement[] = [];
    let currentIndex = 0;
    let partKey = 0;
    const shouldChart = shouldGenerateChart(content, userQuery);
    const chartData = shouldChart ? extractNumericalData(content) : null;
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > currentIndex) {
        parts.push(<div key={`text-${partKey++}`}>{formatInlineMarkdown(content.slice(currentIndex, match.index))}</div>);
      }
      const language = match[1] || 'text';
      const code = match[2].trim();
      const codeId = `${messageIndex}-${partKey}`;
      parts.push(
        <div key={`code-${partKey++}`} className="group my-4">
          <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/60 px-4 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Code className="size-3.5" />{language}
            </span>
            <Button variant="ghost" size="sm" onClick={() => handleCopyCode(code, codeId)} className="h-7 px-2 text-xs">
              {copiedCodeIndex === codeId ? <><Check className="mr-1 size-3" />Copied</> : <><Copy className="mr-1 size-3" />Copy</>}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-b-lg border border-border bg-muted/30 p-4">
            <code className="font-mono text-xs leading-6">{code}</code>
          </pre>
        </div>
      );
      currentIndex = match.index + match[0].length;
    }
    if (currentIndex < content.length) {
      parts.push(<div key={`text-${partKey++}`}>{formatInlineMarkdown(content.slice(currentIndex))}</div>);
    }
    if (chartData) {
      parts.push(<DataChart key={`chart-${partKey++}`} data={chartData.data} title={chartData.title} type={chartData.type} />);
    }
    return <div>{parts}</div>;
  };

  const formatInlineMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      if (line.startsWith('### ')) return <h3 key={lineIndex} className="mb-2 mt-4 text-base font-semibold">{formatInlineElements(line.slice(4))}</h3>;
      if (line.startsWith('## ')) return <h2 key={lineIndex} className="mb-2 mt-4 text-lg font-semibold">{formatInlineElements(line.slice(3))}</h2>;
      if (line.startsWith('# ')) return <h1 key={lineIndex} className="mb-2 mt-4 text-xl font-semibold">{formatInlineElements(line.slice(2))}</h1>;
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <li key={lineIndex} className="my-1 ml-5 list-disc">{formatInlineElements(line.trim().slice(2))}</li>;
      }
      const numberedMatch = line.match(/^\d+\.\s/);
      if (numberedMatch) return <li key={lineIndex} className="my-1 ml-5 list-decimal">{formatInlineElements(line.slice(numberedMatch[0].length))}</li>;
      if (line.trim() === '---' || line.trim() === '***') return <hr key={lineIndex} className="my-4 border-border" />;
      if (line.trim()) return <p key={lineIndex} className="my-2 leading-7">{formatInlineElements(line)}</p>;
      return <br key={lineIndex} />;
    });
  };

  const formatInlineElements = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];
    let remaining = text;
    let key = 0;
    const patterns = [
      { regex: /\*\*\*(.+?)\*\*\*/g, render: (m: string) => <strong key={key++} className="font-semibold italic">{m}</strong> },
      { regex: /\*\*(.+?)\*\*/g, render: (m: string) => <strong key={key++} className="font-semibold">{m}</strong> },
      { regex: /`([^`]+)`/g, render: (m: string) => <code key={key++} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{m}</code> },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (m: string, t: string, url: string) => <a key={key++} href={url} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">{t}</a> },
    ];
    while (remaining.length > 0) {
      let earliest: { index: number; length: number; element: React.ReactElement } | null = null;
      for (const pattern of patterns) {
        const match = new RegExp(pattern.regex).exec(remaining);
        if (match && (earliest === null || match.index < earliest.index)) {
          earliest = { index: match.index, length: match[0].length, element: pattern.render(match[1], match[1], match[2]) };
        }
      }
      if (earliest) {
        if (earliest.index > 0) parts.push(remaining.slice(0, earliest.index));
        parts.push(earliest.element);
        remaining = remaining.slice(earliest.index + earliest.length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    return <>{parts}</>;
  };

  const loadHistoryConversation = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);
    setMessages([
      { role: 'user', content: item.question, timestamp: item.created_at },
      { role: 'assistant', content: item.answer, timestamp: item.created_at, userQuery: item.question }
    ]);
    setShowSuggestions(false);
    setShowHistory(false);
  };

  const newConversation = () => {
    setMessages([]);
    setSelectedHistoryId(null);
    setShowSuggestions(true);
    setShowHistory(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffH = (Date.now() - date.getTime()) / 3_600_000;
    if (diffH < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffH < 168) return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <DocMark className="mx-auto size-12" />
            <h1 className="font-display mt-5 text-2xl font-semibold">Sign in to open the reading room</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your shelf, history, and citations live under your account.</p>
            <Button asChild className="mt-6 w-full"><Link href="/">Back to home</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4.25rem)] overflow-hidden bg-background">
      {showHistory && (
        <button
          aria-label="Close history"
          onClick={() => setShowHistory(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:z-0 lg:translate-x-0 ${showHistory ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <DocMark className="size-8" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">Conversations</h2>
            <p className="text-xs text-muted-foreground">{historyItems.length} saved</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="lg:hidden" aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="border-b border-border p-3">
          <Button onClick={newConversation} className="h-10 w-full justify-start gap-2">
            <Plus className="size-4" /> New conversation
          </Button>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              placeholder="Filter conversations"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-3">
            {Object.entries(historyGroups).map(([group, items]) => (
              <div key={group}>
                <h3 className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = selectedHistoryId === item.id;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => loadHistoryConversation(item)}
                        onKeyDown={(e) => e.key === 'Enter' && loadHistoryConversation(item)}
                        className={`group cursor-pointer rounded-lg border-l-[3px] px-3 py-2.5 transition-colors ${
                          active ? 'border-[var(--glow)] bg-secondary' : 'border-transparent hover:bg-muted/60'
                        }`}
                      >
                        <p className="line-clamp-2 text-sm font-medium leading-5">{item.question}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3" />{formatTimestamp(item.created_at)}
                          </span>
                          <button
                            onClick={(e) => handleShareChat(item.id, e)}
                            aria-label="Copy share link"
                            className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
                          >
                            {copiedShareId === item.id ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredHistory.length === 0 && !loading && (
              <div className="px-2 py-10 text-center">
                <History className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">{historyFilter ? 'No matches' : 'No conversations yet'}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {historyFilter ? 'Try a different filter.' : 'Ask your first question and it will appear here.'}
                </p>
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} aria-label="Toggle history">
            <PanelLeft className="size-4" />
          </Button>
          <DocMark className="size-8" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-[1.05rem] font-semibold leading-tight">Reading room</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">Answers keep their file and page</p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={newConversation} className="gap-2">
              <Plus className="size-4" /><span className="hidden sm:inline">New chat</span>
            </Button>
          )}
        </header>

        <div className="relative flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
              {loading && (
                <div className="flex flex-col items-center py-20 text-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">Opening your shelf…</p>
                </div>
              )}

              {!loading && messages.length === 0 && (
                <div className="py-6 text-center md:py-10">
                  <EmptyRoomArt className="mx-auto h-36 w-auto" />
                  <h2 className="font-display mt-6 text-2xl font-semibold md:text-[1.7rem]">What shall we look up?</h2>
                  <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-7 text-muted-foreground">
                    Ask across everything you shelved. Each answer arrives with the exact file and page it came from.
                  </p>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          disabled={sending}
                          className="rounded-xl border border-border bg-card p-4 text-sm leading-6 transition-colors hover:border-ring hover:bg-muted/40 disabled:opacity-50"
                        >
                          <span className="mb-2 flex size-7 items-center justify-center rounded-lg bg-secondary">
                            <FileText className="size-3.5 text-primary" />
                          </span>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-7">
                {messages.map((m, idx) => {
                  if (m.role === 'separator') {
                    return (
                      <div key={idx} className="flex items-center gap-4 py-1">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium text-muted-foreground">{m.content}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    );
                  }
                  const isUser = m.role === 'user';
                  return (
                    <div key={idx} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className="w-full max-w-[100%] sm:max-w-[88%]">
                        {!isUser && (
                          <div className="mb-2 flex items-center gap-2.5">
                            <DocMark className="size-7" />
                            <span className="text-xs font-semibold">DocWise</span>
                            {m.timestamp && <span className="text-xs text-muted-foreground">{formatTimestamp(m.timestamp)}</span>}
                          </div>
                        )}
                        <div className={`rounded-2xl border px-4 py-3.5 text-[0.95rem] md:px-5 ${isUser ? 'ml-auto w-fit max-w-full border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
                          <div className="break-words">
                            {m.role === 'assistant' ? formatMessageContent(m.content, idx, m.userQuery) : m.content}
                          </div>
                          {!isUser && m.sources && m.sources.length > 0 && (
                            <div className="mt-4 border-t border-border pt-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources</p>
                              <div className="flex flex-wrap gap-2">
                                {m.sources.map((s, i) => (
                                  <span key={i} className="source-stamp">
                                    <FileText className="size-3.5" style={{ color: "var(--glow)" }} />
                                    {s.file}{s.page ? ` · p. ${s.page}` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {!isUser && (
                          <div className="mt-2 flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm" aria-label="Mark helpful"
                              onClick={() => setMessages(prev => prev.map((msg, i) => i === idx ? { ...msg, liked: !msg.liked, disliked: false } : msg))}
                              className={`h-9 w-9 p-0 ${m.liked ? 'text-primary' : 'text-muted-foreground'}`}
                            ><ThumbsUp className="size-4" /></Button>
                            <Button
                              variant="ghost" size="sm" aria-label="Mark unhelpful"
                              onClick={() => setMessages(prev => prev.map((msg, i) => i === idx ? { ...msg, disliked: !msg.disliked, liked: false } : msg))}
                              className={`h-9 w-9 p-0 ${m.disliked ? 'text-destructive' : 'text-muted-foreground'}`}
                            ><ThumbsDown className="size-4" /></Button>
                            <Button
                              variant="ghost" size="sm" aria-label="Copy answer"
                              onClick={() => handleCopy(m.content, idx)}
                              className="h-9 w-9 p-0 text-muted-foreground"
                            >{copiedIndex === idx ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="w-full sm:max-w-[88%]">
                      <div className="mb-2 flex items-center gap-2.5">
                        <DocMark className="size-7" />
                        <span className="text-xs font-semibold">DocWise</span>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
                        <span className="flex gap-1.5" aria-hidden>
                          <span className="typing-dot inline-block size-2 rounded-full bg-primary" />
                          <span className="typing-dot inline-block size-2 rounded-full bg-primary" />
                          <span className="typing-dot inline-block size-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-sm text-muted-foreground">Reading your documents…</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3 md:py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 pl-4 shadow-sm transition-colors focus-within:border-ring">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your documents…"
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-0 text-[0.95rem] focus-visible:ring-0"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                aria-label="Send question"
                className="h-11 w-11 shrink-0 rounded-xl p-0"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-5" />}
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Enter to send · Shift + Enter for a new line · Answers cite file and page</p>
          </div>
        </div>
      </div>
    </div>
  );
}
