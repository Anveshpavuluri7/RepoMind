"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, GitCommitHorizontal, Plus, RefreshCw, Zap } from "lucide-react";
import { reposApi, timelineApi } from "@/lib/api";
import type { Repository, TimelineEvent } from "@/types";
import { timeAgo, riskColor, shortSha, languageColor } from "@/lib/utils";

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const repoList = await reposApi.list();
        setRepos(repoList);
        // Load timeline from first 3 repos
        const events: TimelineEvent[] = [];
        for (const repo of repoList.slice(0, 3)) {
          const tl = await timelineApi.get(repo.id, 10);
          events.push(...tl.events);
        }
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentEvents(events.slice(0, 15));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {repos.length} repositories connected
          </p>
        </div>
        <Link
          href="/repos"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect Repository
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Repositories */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Your Repositories
          </h2>
          {repos.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No repositories connected</p>
              <p className="text-muted-foreground text-sm mb-6">
                Connect a GitHub repository to start getting AI insights
              </p>
              <Link
                href="/repos"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Connect Repository
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/repos/${repo.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                        {repo.full_name}
                      </p>
                      {repo.is_private && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {repo.language && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: languageColor(repo.language) }}
                          />
                          {repo.language}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {repo.last_synced_at
                          ? `Synced ${timeAgo(repo.last_synced_at)}`
                          : "Not synced yet"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center">
                <GitCommitHorizontal className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentEvents.map((event) => (
                  <div key={event.id} className="p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {event.type === "commit" ? (
                          <GitCommitHorizontal className="w-4 h-4 text-primary" />
                        ) : (
                          <GitBranch className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {event.title}
                        </p>
                        {event.ai_summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {event.ai_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {event.sha && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {shortSha(event.sha)}
                            </span>
                          )}
                          {event.risk_level && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border ${riskColor(event.risk_level)}`}
                            >
                              {event.risk_level}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {timeAgo(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
