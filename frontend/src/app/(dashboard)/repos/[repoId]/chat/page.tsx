"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send, Zap, MessageSquare, GitCommitHorizontal, ExternalLink, ChevronRight } from "lucide-react";
import { chatApi, reposApi } from "@/lib/api";
import type { ChatMessage, Repository } from "@/types";
import { timeAgo, shortSha } from "@/lib/utils";
import Link from "next/link";

const SUGGESTED_QUESTIONS = [
  "What was the most impactful change in this repository?",
  "Which commits affected authentication?",
  "When was the database schema last modified?",
  "What are the highest risk changes?",
  "Summarize recent changes to the API layer",
];

export default function ChatPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const [r, history] = await Promise.all([
        reposApi.get(repoId),
        chatApi.history(repoId),
      ]);
      setRepo(r);
      setMessages([...history.items].reverse());
      setInitializing(false);
    })();
  }, [repoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(question?: string) {
    const q = question || input.trim();
    if (!q || loading) return;

    setInput("");
    setLoading(true);

    // Optimistic message
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      question: q,
      answer: "",
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await chatApi.ask(repoId, q);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? response : m)));
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { ...m, answer: "Sorry, something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/repos/${repoId}`} className="hover:text-foreground transition-colors">
            {repo?.name}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Ask RepoMind</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Repository Q&A</h1>
        <p className="text-sm text-muted-foreground">
          Ask anything about {repo?.full_name} in natural language
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ask about your repository
            </h3>
            <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
              RepoMind searches through all commits and pull requests to answer your questions
              with context from actual changes.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3 animate-fade-in">
            {/* Question */}
            <div className="flex justify-end">
              <div className="max-w-xl bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-4 py-3 text-sm">
                {msg.question}
              </div>
            </div>

            {/* Answer */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                {msg.answer ? (
                  <div className="bg-card border border-border rounded-xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {msg.answer}
                    </p>

                    {/* Sources */}
                    {msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Sources ({msg.sources.length})
                        </p>
                        <div className="space-y-1.5">
                          {msg.sources.slice(0, 4).map((src, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs"
                            >
                              {src.type === "commit" ? (
                                <GitCommitHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              )}
                              <span className="font-mono text-muted-foreground">
                                {src.sha ? shortSha(src.sha) : `PR`}
                              </span>
                              <span className="text-foreground truncate flex-1">{src.title}</span>
                              {src.relevance_score && (
                                <span className="text-muted-foreground shrink-0">
                                  {Math.round(src.relevance_score * 100)}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                      <span className="text-xs">Searching repository knowledge base...</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5 pl-1">
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-8 py-4 border-t border-border">
        <div className="relative flex items-end gap-3 bg-card border border-border rounded-xl p-3 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${repo?.name}...`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-40 leading-relaxed"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
