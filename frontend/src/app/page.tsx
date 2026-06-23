import Link from "next/link";
import { GitBranch, Zap, Search, MessageSquare, ArrowRight, GitCommitHorizontal } from "lucide-react";
import { authApi } from "@/lib/api";

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.18),transparent)]" />

      {/* Nav */}
      <nav className="relative z-10 px-8 py-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/30">
            <GitBranch className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-lg tracking-tight">RepoMind</span>
        </div>
        <a
          href={authApi.loginUrl}
          className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-all"
        >
          <GithubIcon />
          Sign in with GitHub
        </a>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-8 pt-28 pb-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/25 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wider mb-8">
          <Zap className="w-3 h-3" />
          Powered by Claude Opus AI
        </div>
        <h1 className="text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
          Your codebase,{" "}
          <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
            finally understood
          </span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
          RepoMind reads every commit, explains what changed and why, and lets you
          ask questions about your repository in plain English.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={authApi.loginUrl}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 text-sm"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </a>
          <Link
            href="#features"
            className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-border/70 transition-all text-sm"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* App preview mockup */}
      <section className="relative z-10 px-8 pb-28 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-border/70 bg-card/60 shadow-2xl shadow-black/40 backdrop-blur-sm overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-muted/20">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              anvesh / repomind
            </span>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-4">
            {/* Commit analysis */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Commit Intelligence
              </p>
              <div className="bg-background/80 rounded-xl border border-border/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GitCommitHorizontal className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground">a3f9c12</span>
                  <span className="ml-auto shrink-0 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                    Low risk
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Add JWT authentication middleware
                </p>
                <div className="space-y-1.5 text-xs">
                  <p>
                    <span className="text-primary font-medium">Why — </span>
                    <span className="text-muted-foreground">Centralize token validation, eliminate duplicated auth logic across 12 endpoints</span>
                  </p>
                  <p>
                    <span className="text-blue-400 font-medium">Impact — </span>
                    <span className="text-muted-foreground">All protected routes now validated at the middleware layer</span>
                  </p>
                </div>
              </div>

              <div className="bg-background/50 rounded-xl border border-border/40 p-4 space-y-2 opacity-55">
                <div className="flex items-center gap-2">
                  <GitCommitHorizontal className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground">b7e2d08</span>
                  <span className="ml-auto shrink-0 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-medium">
                    Medium risk
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Refactor database connection pooling
                </p>
              </div>
            </div>

            {/* Q&A */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Repository Q&amp;A
              </p>
              <div className="bg-background/80 rounded-xl border border-border/60 p-4 flex flex-col gap-3">
                <div className="flex justify-end">
                  <div className="bg-primary/15 border border-primary/20 text-foreground text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[82%] leading-relaxed">
                    When was Redis caching introduced and why?
                  </div>
                </div>
                <div className="flex">
                  <div className="bg-muted/60 text-foreground text-xs px-3 py-2.5 rounded-xl rounded-tl-sm max-w-[92%] leading-relaxed">
                    Redis was added in{" "}
                    <span className="font-mono text-primary">d4a1f93</span> on Jan 14.
                    The team hit memory limits under load — Redis gave them persistence
                    and horizontal scaling without rewriting the cache interface.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-primary/15 border border-primary/20 text-foreground text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[82%] leading-relaxed">
                    Which files changed the most last month?
                  </div>
                </div>
                <div className="flex opacity-60">
                  <div className="bg-muted/60 text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[92%]">
                    Analyzing commit history...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-8 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
            Built for teams who move fast
          </h2>
          <p className="text-muted-foreground text-lg">
            Every push, automatically understood
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              icon: <Zap className="w-5 h-5" />,
              title: "Commit Intelligence",
              desc: "Every commit is automatically analyzed — summary, impact, risk score, and the reasoning behind the change. No manual notes required.",
            },
            {
              icon: <GitBranch className="w-5 h-5" />,
              title: "Visual Timeline",
              desc: "Watch your repo evolve with an interactive timeline of commits, PRs, and branch activity. Filterable by author, risk, and date.",
            },
            {
              icon: <MessageSquare className="w-5 h-5" />,
              title: "Repository Q&A",
              desc: 'Ask in plain English. "Why was auth refactored?" "When was Redis added?" Answers are grounded in your actual commit history.',
            },
            {
              icon: <Search className="w-5 h-5" />,
              title: "Semantic Search",
              desc: "All analysis is stored as vector embeddings so you can semantically search across years of commit history in milliseconds.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 px-8 py-24 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-4">
            Start understanding your repo today
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Connect a GitHub repository and get AI-powered insights in minutes. Free to get started.
          </p>
          <a
            href={authApi.loginUrl}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 text-sm"
          >
            <GithubIcon />
            Continue with GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 px-8 py-5 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5" />
          <span className="font-semibold text-foreground">RepoMind</span>
        </div>
        <p>AI-powered repository intelligence</p>
      </footer>
    </div>
  );
}
