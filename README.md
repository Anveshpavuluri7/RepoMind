# RepoMind

**AI-powered Git repository intelligence platform.** RepoMind connects to your GitHub repositories and uses Claude AI to analyze every commit — explaining what changed, why it changed, the impact, and the risk level. Ask questions about your codebase history in plain English and get precise, cited answers.

---

## Features

- **GitHub OAuth** — Sign in with GitHub, connect any of your repositories in one click
- **Commit Sync** — Import full commit history with branch and author metadata
- **AI Analysis** — Claude Opus analyzes each commit: summary, what changed, why it changed, impact, and risk level (low / medium / high / critical)
- **Repository Q&A** — Ask anything about your repo history in natural language; answers are grounded in your actual commits via RAG
- **Timeline View** — Chronological feed of commits and PRs with AI summaries and risk badges
- **Commit Detail** — Deep-dive page per commit showing the full AI breakdown and affected files
- **Vector Search** — Semantic search over commit history via ChromaDB + HuggingFace embeddings
- **Dark UI** — Responsive dark-themed dashboard built with Next.js and Tailwind CSS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11, SQLAlchemy (async), Alembic |
| AI | Claude Opus (`claude-opus-4-8`) via LangChain Anthropic |
| Embeddings | HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (local, no API key) |
| Vector Store | ChromaDB |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | GitHub OAuth 2.0 + JWT (httponly cookies) |
| Infrastructure | Docker Compose |

---

## Project Structure

```
RepoMind/
├── backend/
│   ├── app/
│   │   ├── ai/               # Claude analysis, embeddings, RAG chain, vector store
│   │   ├── api/              # FastAPI route handlers
│   │   ├── core/             # DB engine, security, exceptions
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Business logic (sync, commit analysis, chat)
│   ├── alembic/              # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── (dashboard)/  # Authenticated layout
│   │   │   │   ├── repos/    # Repository list + detail + timeline + chat
│   │   │   │   └── commits/  # Commit detail pages
│   │   ├── lib/              # API client, utilities
│   │   ├── store/            # Auth state
│   │   └── types/            # TypeScript interfaces
│   └── Dockerfile
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop
- An [Anthropic API key](https://console.anthropic.com/)
- A GitHub OAuth App

### 1. Create a GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**:

| Field | Value |
|---|---|
| Application name | RepoMind (local) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:8000/api/auth/callback` |

Copy the **Client ID** and generate a **Client Secret**.

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```env
SECRET_KEY=your-random-secret-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_WEBHOOK_SECRET=any-random-string
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8
```

### 3. Configure the Frontend

```bash
cd frontend
cp .env.example .env.local
```

`.env.local` only needs:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Start Infrastructure (Docker)

```bash
docker compose up -d postgres redis chromadb
```

### 5. Run Database Migrations

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 6. Start the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 7. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. **Sign in** with GitHub
2. **Connect a repository** — click Repositories → Add Repository
3. **Sync** — click Sync to import commit history
4. **Analyze History** — click Analyze History to run Claude AI on all commits (runs in the background; progress shown live)
5. **Ask RepoMind** — once analyzed, ask questions like:
   - *"What changed in the authentication system last month?"*
   - *"Which commits introduced the highest risk changes?"*
   - *"Who has been working on the database layer?"*
6. **View Timeline** — browse commits chronologically with AI summaries and risk badges
7. **Commit Detail** — click any commit to see the full AI breakdown

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `APP_ENV` | `development` or `production` |
| `SECRET_KEY` | Random secret for session signing |
| `DEBUG` | `true` / `false` — enables SQL echo and debug logs |
| `DATABASE_URL` | PostgreSQL async connection string |
| `DATABASE_URL_SYNC` | PostgreSQL sync connection string (Alembic) |
| `REDIS_URL` | Redis connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_WEBHOOK_SECRET` | Secret for validating webhook payloads |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_MODEL` | Model ID (default: `claude-opus-4-8`) |
| `CHROMA_HOST` | ChromaDB host (default: `localhost`) |
| `CHROMA_PORT` | ChromaDB port (default: `8001`) |
| `FRONTEND_URL` | Frontend origin for CORS (default: `http://localhost:3000`) |
| `JWT_SECRET_KEY` | Secret for JWT signing |
| `JWT_EXPIRE_MINUTES` | JWT expiry in minutes (default: `10080` = 7 days) |

---

## How AI Analysis Works

```
GitHub Commit
      │
      ▼
fetch_commit_detail()       ← GitHub API: fetches full diff + file stats
      │
      ▼
analyze_commit()            ← Claude Opus: returns JSON with summary,
      │                        what_changed, why_changed, impact, risk_level
      ▼
build_commit_document()     ← Formats commit + AI fields into a text document
      │
      ▼
upsert_commit_embedding()   ← HuggingFace encodes the document → ChromaDB stores it
```

When you ask a question:

```
User Question
      │
      ▼
similarity_search()         ← HuggingFace encodes question → ChromaDB finds top-8 commits
      │  (falls back to recent DB commits if ChromaDB unavailable)
      ▼
answer_repository_question() ← Claude Opus answers grounded in retrieved commit context
      │
      ▼
Answer + Sources (commit SHAs)
```

---

## License

MIT
