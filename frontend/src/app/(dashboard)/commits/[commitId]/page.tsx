"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitCommitHorizontal,
  ArrowLeft,
  User,
  Calendar,
  FileCode,
  Plus,
  Minus,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { commitsApi } from "@/lib/api";
import type { Commit } from "@/types";
import { timeAgo, shortSha, riskColor } from "@/lib/utils";

function RiskIcon({ level }: { level: string }) {
  if (level === "high" || level === "critical")
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  if (level === "medium")
    return <Info className="w-4 h-4 text-yellow-400" />;
  return <CheckCircle className="w-4 h-4 text-green-400" />;
}

export default function CommitDetailPage() {
  const { commitId } = useParams<{ commitId: string }>();
  const router = useRouter();
  const [commit, setCommit] = useState<Commit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    commitsApi.get(commitId).then(setCommit).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [commitId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !commit) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Commit not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary text-sm hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const analysis = commit.ai_analysis;

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <GitCommitHorizontal className="w-5 h-5 text-primary" />
          <code className="font-mono text-lg font-bold text-foreground">{shortSha(commit.sha)}</code>
          {analysis?.risk_level && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${riskColor(analysis.risk_level)}`}>
              <RiskIcon level={analysis.risk_level} />
              {analysis.risk_level} risk
            </span>
          )}
        </div>
        <p className="text-xl font-semibold text-foreground mb-4">
          {commit.message?.split("\n")[0] || "No message"}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {commit.author_login || commit.author_name}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {timeAgo(commit.committed_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <FileCode className="w-4 h-4" />
            {commit.files_changed} file{commit.files_changed !== 1 ? "s" : ""} changed
          </span>
          <span className="flex items-center gap-1.5 text-green-400">
            <Plus className="w-4 h-4" />
            {commit.additions} additions
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <Minus className="w-4 h-4" />
            {commit.deletions} deletions
          </span>
        </div>
      </div>

      {/* AI Analysis */}
      {analysis ? (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              AI Analysis
            </h2>
          </div>

          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Summary</p>
            <p className="text-foreground">{analysis.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {analysis.what_changed && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  What Changed
                </p>
                <p className="text-sm text-foreground">{analysis.what_changed}</p>
              </div>
            )}
            {analysis.why_changed && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Why It Changed
                </p>
                <p className="text-sm text-foreground">{analysis.why_changed}</p>
              </div>
            )}
            {analysis.impact && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Impact
                </p>
                <p className="text-sm text-foreground">{analysis.impact}</p>
              </div>
            )}
            {analysis.related_files && analysis.related_files.length > 0 && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Files Affected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.related_files.map((f) => (
                    <code key={f} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {f}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-border bg-card mb-8 text-center">
          <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            This commit hasn't been analyzed yet. Click <strong>Analyze History</strong> on the repository page to run AI analysis.
          </p>
        </div>
      )}

      {/* Full commit message if multiline */}
      {commit.message && commit.message.includes("\n") && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Full Commit Message
          </p>
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{commit.message}</pre>
        </div>
      )}
    </div>
  );
}
