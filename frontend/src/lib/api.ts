import type {
  User,
  Repository,
  RepositoryStats,
  Commit,
  PaginatedResponse,
  TimelineResponse,
  ChatMessage,
  ChatHistoryResponse,
} from "@/types";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`;

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const authApi = {
  me: () => apiFetch<User>("/auth/me"),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  loginUrl: `${API_BASE}/auth/github`,
};

// Repositories
export const reposApi = {
  list: () => apiFetch<Repository[]>("/repos"),
  get: (id: string) => apiFetch<Repository>(`/repos/${id}`),
  getStats: (id: string) => apiFetch<RepositoryStats>(`/repos/${id}/stats`),
  listGitHub: () => apiFetch<any[]>("/repos/github/available"),
  connect: (github_repo_id: number, full_name: string) =>
    apiFetch<Repository>("/repos", {
      method: "POST",
      body: JSON.stringify({ github_repo_id, full_name }),
    }),
  sync: (id: string) => apiFetch<void>(`/repos/${id}/sync`, { method: "POST" }),
  analyzeHistory: (id: string) =>
    apiFetch<{ message: string; total: number }>(`/repos/${id}/analyze-history`, { method: "POST" }),
  disconnect: (id: string) =>
    apiFetch<void>(`/repos/${id}`, { method: "DELETE" }),
};

// Commits
export const commitsApi = {
  list: (repoId: string, page = 1, pageSize = 20) =>
    apiFetch<PaginatedResponse<Commit>>(
      `/repos/${repoId}/commits?page=${page}&page_size=${pageSize}`
    ),
  get: (commitId: string) => apiFetch<Commit>(`/commits/${commitId}`),
  analyze: (commitId: string) =>
    apiFetch<void>(`/commits/${commitId}/analyze`, { method: "POST" }),
};

// Timeline
export const timelineApi = {
  get: (repoId: string, limit = 50) =>
    apiFetch<TimelineResponse>(`/repos/${repoId}/timeline?limit=${limit}`),
};

// Chat
export const chatApi = {
  ask: (repoId: string, question: string) =>
    apiFetch<ChatMessage>(`/repos/${repoId}/chat`, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
  history: (repoId: string, page = 1) =>
    apiFetch<ChatHistoryResponse>(`/repos/${repoId}/chat/history?page=${page}`),
};
