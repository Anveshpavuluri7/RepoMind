"use client";

import { useEffect, useState } from "react";
import { GitBranch, Plus, Star, Lock, Globe, RefreshCw, Trash2 } from "lucide-react";
import { reposApi } from "@/lib/api";
import type { Repository } from "@/types";
import { timeAgo, languageColor } from "@/lib/utils";
import Link from "next/link";

export default function ReposPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connecting, setConnecting] = useState<number | null>(null);

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    setLoading(true);
    try {
      setRepos(await reposApi.list());
    } finally {
      setLoading(false);
    }
  }

  async function openConnectModal() {
    setShowConnectModal(true);
    const gh = await reposApi.listGitHub();
    const connectedIds = new Set(repos.map((r) => r.github_repo_id));
    setGithubRepos(gh.filter((r) => !connectedIds.has(r.github_repo_id)));
  }

  async function connectRepo(ghRepoId: number, fullName: string) {
    setConnecting(ghRepoId);
    try {
      const newRepo = await reposApi.connect(ghRepoId, fullName);
      setRepos((prev) => [newRepo, ...prev]);
      setShowConnectModal(false);
    } finally {
      setConnecting(null);
    }
  }

  async function disconnectRepo(id: string) {
    if (!confirm("Disconnect this repository? All AI analysis data will be deleted.")) return;
    await reposApi.disconnect(id);
    setRepos((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect GitHub repositories for AI analysis
          </p>
        </div>
        <button
          onClick={openConnectModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect Repository
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : repos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No repositories connected</h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Connect your first GitHub repository to start getting AI-powered insights about your
            codebase.
          </p>
          <button
            onClick={openConnectModal}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Connect Your First Repository
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/repos/${repo.id}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {repo.full_name}
                  </Link>
                  {repo.is_private ? (
                    <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-sm text-muted-foreground truncate mb-2">{repo.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: languageColor(repo.language) }}
                      />
                      {repo.language}
                    </span>
                  )}
                  <span>Branch: {repo.default_branch}</span>
                  <span>
                    {repo.last_synced_at
                      ? `Synced ${timeAgo(repo.last_synced_at)}`
                      : "Not synced"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => reposApi.sync(repo.id)}
                  title="Sync now"
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => disconnectRepo(repo.id)}
                  title="Disconnect"
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link
                  href={`/repos/${repo.id}`}
                  className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Connect Repository</h2>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {githubRepos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading your GitHub repositories...
                </div>
              ) : (
                githubRepos.map((r) => (
                  <button
                    key={r.github_repo_id}
                    onClick={() => connectRepo(r.github_repo_id, r.full_name)}
                    disabled={connecting === r.github_repo_id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent text-left transition-all disabled:opacity-60"
                  >
                    <GitBranch className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.full_name}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                      )}
                    </div>
                    {r.is_private ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : null}
                    {connecting === r.github_repo_id && (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
