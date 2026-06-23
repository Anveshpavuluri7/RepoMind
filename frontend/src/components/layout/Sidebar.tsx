"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  LayoutDashboard,
  GitCommitHorizontal,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/repos", icon: GitBranch, label: "Repositories" },
];

interface SidebarProps {
  repoId?: string;
  repoName?: string;
}

export function Sidebar({ repoId, repoName }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const repoNav = repoId
    ? [
        { href: `/repos/${repoId}`, icon: GitBranch, label: "Overview" },
        {
          href: `/repos/${repoId}/timeline`,
          icon: GitCommitHorizontal,
          label: "Timeline",
        },
        {
          href: `/repos/${repoId}/chat`,
          icon: MessageSquare,
          label: "Ask RepoMind",
        },
      ]
    : [];

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">RepoMind</span>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}

        {/* Repo-specific nav */}
        {repoId && repoName && (
          <div className="pt-4">
            <div className="flex items-center gap-1.5 px-3 pb-2">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {repoName}
              </span>
            </div>
            {repoNav.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: user + settings */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            {user.avatar_url && (
              <Image
                src={user.avatar_url}
                alt={user.github_login}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user.name || user.github_login}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{user.github_login}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
