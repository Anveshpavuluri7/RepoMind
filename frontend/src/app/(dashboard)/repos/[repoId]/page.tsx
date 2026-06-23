"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  GitCommitHorizontal,
  MessageSquare,
  RefreshCw,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import { reposApi, commitsApi, timelineApi } from "@/lib/api";
import type { Repository, RepositoryStats, Commit, TimelineEvent } from "@/types";
import { timeAgo, shortSha, riskColor } from "@/lib/utils";

export default function RepoOverviewPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [stats, setStats] = useState<RepositoryStats | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeTotal, setAnalyzeTotal] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [repoData, statsData, commitsData, timelineData] = await Promise.all([
        reposApi.get(repoId),
        reposApi.getStats(repoId),
        commitsApi.list(repoId, 1, 5),
        timelineApi.get(repoId, 20),
      ]);
      setRepo(repoData);
      setStats(statsData);
      setCommits(commitsData.items);
      setEvents(timelineData.events);
      setLoading(false);
    })();
  }, [repoId]);

  async function handleSync() {
    setSyncing(true);
    await reposApi.sync(repoId);
    setTimeout(() => setSyncing(false), 2000);
  }

  async function handleAnalyzeHistory() {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const { total } = await reposApi.analyzeHistory(repoId);
      setAnalyzeTotal(total);
      if (total === 0) { setAnalyzing(false); return; }

      // Poll stats every 4s until all commits are analyzed
      const poll = setInterval(async () => {
        try {
          const fresh = await reposApi.getStats(repoId);
          setStats(fresh);
          if (fresh.analyzed_commits >= fresh.total_commits) {
            clearInterval(poll);
            setAnalyzing(false);
            setAnalyzeTotal(null);
          }
        } catch { clearInterval(poll); setAnalyzing(false); }
      }, 4000);
    } catch {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!repo) return null;

  const analysisRate = stats
    ? stats.total_commits > 0
      ? Math.round((stats.analyzed_commits / stats.total_commits) * 100)
      : 0
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{repo.name}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{repo.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || analyzing}
            className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
          <button
            onClick={handleAnalyzeHistory}
            disabled={analyzing || syncing || (stats?.analyzed_commits === stats?.total_commits && (stats?.total_commits ?? 0) > 0)}
            className="flex items-center gap-2 border border-primary/40 text-primary bg-primary/5 px-4 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${analyzing ? "animate-pulse" : ""}`} />
            {analyzing
              ? analyzeTotal
                ? `Analyzing ${stats?.analyzed_commits ?? 0}/${analyzeTotal}`
                : "Starting..."
              : stats?.analyzed_commits === stats?.total_commits && (stats?.total_commits ?? 0) > 0
              ? "Fully Analyzed"
              : "Analyze History"}
          </button>
          <Link
            href={`/repos/${repoId}/chat`}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Ask RepoMind
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Commits", value: stats?.total_commits ?? 0, icon: GitCommitHorizontal },
          { label: "Pull Requests", value: stats?.total_prs ?? 0, icon: GitBranch },
          { label: "Branches", value: stats?.total_branches ?? 0, icon: GitBranch },
          { label: "AI Analyzed", value: `${analysisRate}%`, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Commits */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Commits
            </h2>
            <Link
              href={`/repos/${repoId}/timeline`}
              className="text-xs text-primary hover:underline"
            >
              View timeline →
            </Link>
          </div>
          <div className="space-y-2">
            {commits.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <GitCommitHorizontal className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No commits yet. Try syncing.</p>
              </div>
            ) : (
              commits.map((commit) => (
                <Link
                  key={commit.id}
                  href={`/commits/${commit.id}`}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
                >
                  <div className="mt-0.5">
                    <GitCommitHorizontal className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {commit.message?.split("\n")[0] || "No message"}
                    </p>
                    {commit.ai_analysis?.summary && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {commit.ai_analysis.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {shortSha(commit.sha)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {commit.author_login || commit.author_name}
                      </span>
                      {commit.ai_analysis?.risk_level && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${riskColor(commit.ai_analysis.risk_level)}`}
                        >
                          {commit.ai_analysis.risk_level}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {timeAgo(commit.committed_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {[
              {
                href: `/repos/${repoId}/timeline`,
                icon: Clock,
                title: "View Timeline",
                desc: "Explore the full commit and PR history",
              },
              {
                href: `/repos/${repoId}/chat`,
                icon: MessageSquare,
                title: "Ask a Question",
                desc: "Query your repo history in natural language",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Repo Info */}
          <div className="p-4 rounded-xl border border-border bg-card mt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Repository Info
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Default branch</dt>
                <dd className="font-mono text-foreground text-xs">{repo.default_branch}</dd>
              </div>
              {repo.language && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="text-foreground text-xs">{repo.language}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Visibility</dt>
                <dd className="text-foreground text-xs">
                  {repo.is_private ? "Private" : "Public"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last synced</dt>
                <dd className="text-foreground text-xs">
                  {repo.last_synced_at ? timeAgo(repo.last_synced_at) : "Never"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
