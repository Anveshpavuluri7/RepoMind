"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GitCommitHorizontal, GitBranch, ChevronRight, Zap } from "lucide-react";
import { timelineApi, reposApi } from "@/lib/api";
import type { TimelineEvent, Repository } from "@/types";
import { timeAgo, shortSha, riskColor, formatDate } from "@/lib/utils";

export default function TimelinePage() {
  const { repoId } = useParams<{ repoId: string }>();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    (async () => {
      const [tl, r] = await Promise.all([timelineApi.get(repoId, 100), reposApi.get(repoId)]);
      setEvents(tl.events);
      setRepo(r);
      setLoading(false);
    })();
  }, [repoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/repos" className="hover:text-foreground transition-colors">
            Repositories
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/repos/${repoId}`} className="hover:text-foreground transition-colors">
            {repo?.name}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Timeline</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Repository Timeline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {events.length} events — click any node to see details
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Timeline */}
        <div className="relative">
          {events.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GitCommitHorizontal className="w-12 h-12 mx-auto mb-3" />
              <p>No timeline events yet. Sync the repository first.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary to-primary/10" />

              <div className="space-y-1">
                {events.map((event, i) => (
                  <button
                    key={event.id}
                    onClick={() => setSelected(event)}
                    className={`relative w-full flex items-start gap-4 pl-10 pr-4 py-3 rounded-xl text-left transition-all hover:bg-accent group ${
                      selected?.id === event.id ? "bg-primary/5 border border-primary/20" : ""
                    }`}
                  >
                    {/* Node dot */}
                    <div
                      className={`absolute left-2 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selected?.id === event.id
                          ? "border-primary bg-primary"
                          : "border-border bg-card group-hover:border-primary/60"
                      }`}
                    >
                      {event.type === "commit" ? (
                        <GitCommitHorizontal className="w-2.5 h-2.5 text-primary-foreground" />
                      ) : (
                        <GitBranch className="w-2.5 h-2.5 text-primary-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {event.title}
                        </p>
                        {event.risk_level && (
                          <span
                            className={`shrink-0 text-xs px-1.5 py-0.5 rounded border ${riskColor(event.risk_level)}`}
                          >
                            {event.risk_level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {event.sha && (
                          <span className="font-mono">{shortSha(event.sha)}</span>
                        )}
                        {event.author && <span>{event.author}</span>}
                        <span className="ml-auto">{timeAgo(event.timestamp)}</span>
                      </div>
                      {event.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.ai_summary}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="sticky top-8">
          {selected ? (
            <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                {selected.type === "commit" ? (
                  <GitCommitHorizontal className="w-5 h-5 text-primary" />
                ) : (
                  <GitBranch className="w-5 h-5 text-blue-400" />
                )}
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {selected.type.replace("_", " ")}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">{selected.title}</h3>

              {selected.sha && (
                <p className="font-mono text-sm text-muted-foreground mb-4">
                  {selected.sha}
                </p>
              )}

              <dl className="grid grid-cols-2 gap-3 text-sm mb-6">
                {selected.author && (
                  <>
                    <dt className="text-muted-foreground">Author</dt>
                    <dd className="text-foreground">{selected.author}</dd>
                  </>
                )}
                {selected.branch && (
                  <>
                    <dt className="text-muted-foreground">Branch</dt>
                    <dd className="font-mono text-foreground text-xs">{selected.branch}</dd>
                  </>
                )}
                {selected.files_changed !== null && (
                  <>
                    <dt className="text-muted-foreground">Files changed</dt>
                    <dd className="text-foreground">{selected.files_changed}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-foreground">{formatDate(selected.timestamp)}</dd>
                {selected.risk_level && (
                  <>
                    <dt className="text-muted-foreground">Risk</dt>
                    <dd>
                      <span className={`text-xs px-2 py-1 rounded border ${riskColor(selected.risk_level)}`}>
                        {selected.risk_level}
                      </span>
                    </dd>
                  </>
                )}
              </dl>

              {selected.ai_summary && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">AI Summary</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{selected.ai_summary}</p>
                </div>
              )}

              {selected.type === "commit" && selected.sha && (
                <Link
                  href={`/commits/${selected.id}`}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
                >
                  View full commit details
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <GitCommitHorizontal className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Click any timeline event to see details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
