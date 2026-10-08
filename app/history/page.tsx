"use client";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, ArrowRight, Trash, Loader2 } from 'lucide-react';
import { ExportButton } from '@/components/exportbutton';

export default function HistoryPage() {
  const { isSignedIn, user } = useUser();
  const [data, setData] = useState<Array<{ id: string; question: string; answer: string; created_at: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/chat-history');
        if (response.ok) {
          const result = await response.json();
          setData(result.history || []);
        } else {
          setError('Failed to load history');
        }
      } catch (err) {
        setError('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isSignedIn]);

  const deleteChat = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/chat-history/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setData(prev => prev ? prev.filter(item => item.id !== id) : []);
      } else {
        console.error('Failed to delete chat');
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    } finally {
      setDeleting(null);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="page-width min-h-[calc(100dvh-4rem)] py-12">
        <p className="section-label">Notes</p>
        <h1 className="page-heading mt-3">Past readings</h1>
        <p className="mt-3 text-muted-foreground">Please sign in to view your notes.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-width min-h-[calc(100dvh-4rem)] py-12">
        <p className="section-label">Notes</p>
        <h1 className="page-heading mt-3">Past readings</h1>
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-width min-h-[calc(100dvh-4rem)] max-w-4xl py-12">
        <p className="section-label">Notes</p>
        <h1 className="page-heading mt-3">Past readings</h1>
        <div className="mt-6 rounded-lg border bg-background">
          <div className="p-6">
            <p className="text-sm text-red-600">Failed to load history.</p>
            <div className="mt-4">
              <Link href="/query">
                <Button variant="default">
                  Try asking a question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-width min-h-[calc(100dvh-4rem)] max-w-4xl py-12">
      <p className="section-label">Notes</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="page-heading">Past readings</h1>
        {data && data.length > 0 && (
          <ExportButton data={data} />
        )}
      </div>

      {!data || data.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-background">
          <div className="p-8 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">No conversations yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your recent conversations will appear here.
            </p>
            <div className="mt-5">
              <Link href="/query">
                <Button>
                  Start your first chat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {data.map((row) => (
            <li key={row.id} className="group rounded-xl border bg-background transition-colors hover:bg-accent/40">
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Conversation</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">

                    <Button
                      onClick={() => deleteChat(row.id)}
                      disabled={deleting === row.id}
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label={`Delete conversation: ${row.question}`}
                    >
                      {deleting === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-semibold leading-6 line-clamp-2">
                  {row.question}
                </h3>

                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {row.answer}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/query`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    Open chat
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
