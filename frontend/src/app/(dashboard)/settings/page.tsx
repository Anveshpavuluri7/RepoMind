"use client";

import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { LogOut, User, Key, Bell } from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Profile
        </h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4 mb-6">
            {user?.avatar_url && (
              <Image
                src={user.avatar_url}
                alt={user.github_login}
                width={64}
                height={64}
                className="rounded-full border-2 border-border"
              />
            )}
            <div>
              <p className="text-lg font-semibold text-foreground">
                {user?.name || user?.github_login}
              </p>
              <p className="text-sm text-muted-foreground">@{user?.github_login}</p>
              {user?.email && (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground mb-1">GitHub Login</dt>
              <dd className="font-mono text-foreground">{user?.github_login}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Member since</dt>
              <dd className="text-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Account
        </h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You will be redirected to the login page
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
