export interface User {
  id: string;
  github_id: number;
  github_login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Repository {
  id: string;
  github_repo_id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  is_private: boolean;
  default_branch: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface RepositoryStats {
  total_commits: number;
  total_prs: number;
  total_branches: number;
  analyzed_commits: number;
}

export interface CommitAIAnalysis {
  summary: string | null;
  what_changed: string | null;
  why_changed: string | null;
  impact: string | null;
  risk_level: "low" | "medium" | "high" | "critical" | null;
  related_files: string[] | null;
  analyzed_at: string | null;
}

export interface Commit {
  id: string;
  repo_id: string;
  sha: string;
  author_name: string | null;
  author_email: string | null;
  author_login: string | null;
  message: string | null;
  committed_at: string | null;
  branch: string | null;
  files_changed: number;
  additions: number;
  deletions: number;
  ai_analysis: CommitAIAnalysis | null;
  is_embedded: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type TimelineEventType = "commit" | "pull_request" | "branch";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  author: string | null;
  branch: string | null;
  ai_summary: string | null;
  risk_level: string | null;
  sha: string | null;
  pr_number: number | null;
  files_changed: number | null;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  total: number;
}

export interface ChatSource {
  type: string;
  id: string;
  sha: string | null;
  title: string;
  relevance_score: number | null;
}

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  created_at: string;
}

export interface ChatHistoryResponse {
  items: ChatMessage[];
  total: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
