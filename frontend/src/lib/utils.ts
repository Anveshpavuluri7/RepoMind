import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | null): string {
  if (!date) return "Unknown";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | null): string {
  if (!date) return "Unknown";
  return format(new Date(date), "MMM d, yyyy");
}

export function shortSha(sha: string | null): string {
  if (!sha) return "";
  return sha.slice(0, 7);
}

export function riskColor(risk: string | null): string {
  switch (risk) {
    case "critical": return "text-red-500 bg-red-500/10 border-red-500/20";
    case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    case "medium": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "low": return "text-green-500 bg-green-500/10 border-green-500/20";
    default: return "text-muted-foreground bg-muted border-border";
  }
}

export function languageColor(lang: string | null): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    PHP: "#4F5D95",
  };
  return lang ? (colors[lang] ?? "#8b949e") : "#8b949e";
}
