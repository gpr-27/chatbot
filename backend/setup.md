# Groqbot Backend Setup Guide

## 1. Environment Variables

All configuration is read from environment variables — nothing is hardcoded.
Create a `.env` file in the `backend/` directory (copy from `.env.example`).
The `.env` file is gitignored; `.env.example` (placeholders only) is committed.

### Backend (`backend/.env`)

```env
# Server
PORT=5001                      # API port
NODE_ENV=development           # development | production
LOG_LEVEL=info                 # error | warn | info | debug

# Database
MONGODB_URI=mongodb://localhost:27017/groqbot   # local or Atlas

# Clerk auth — get keys at https://dashboard.clerk.com/~/api-keys
CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_CLERK_SECRET_KEY

# Client
CLIENT_URL=http://localhost:5173   # frontend origin (CORS / cookies)

# AI / LLM
LLM_PROVIDER=groq              # active LLM provider
GROQ_API_KEY=your_groq_api_key_here   # https://console.groq.com/keys
DEFAULT_MODEL=llama-3.3-70b-versatile # default chat model
# Comma-separated model allow-list
AVAILABLE_MODELS=llama-3.3-70b-versatile,llama-3.1-8b-instant,openai/gpt-oss-120b,gemma2-9b-it
TITLE_MODEL=llama-3.1-8b-instant      # (optional) model for auto-titles
# (optional) id:Label pairs, comma-separated
MODEL_LABELS=llama-3.3-70b-versatile:Llama 3.3 70B,llama-3.1-8b-instant:Llama 3.1 8B,openai/gpt-oss-120b:GPT-OSS 120B,gemma2-9b-it:Gemma 2 9B
```

**Required:** `NODE_ENV`, `PORT`, `CLIENT_URL`, `MONGODB_URI`,
`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `LOG_LEVEL`, `LLM_PROVIDER`,
`GROQ_API_KEY`, `DEFAULT_MODEL`, `AVAILABLE_MODELS`.
**Optional:** `TITLE_MODEL`, `MODEL_LABELS`.

> **Auth is handled by [Clerk](https://clerk.com).** The backend mounts
> `clerkMiddleware()` and reads the signed-in user via `getAuth`, while the
> frontend wraps the app in `<ClerkProvider>` (using
> `VITE_CLERK_PUBLISHABLE_KEY`). `JWT_SECRET` is no longer used. The committed
> `.env`/`.env.example` files hold **placeholder** Clerk keys — paste your real
> keys from https://dashboard.clerk.com/~/api-keys or the backend won't
> authenticate requests and `<ClerkProvider>` will throw at startup.

> Without `GROQ_API_KEY` the server still runs and the chat works in a
> **basic fallback mode** (canned replies). Add the key to get real,
> streaming Groq responses.

### Frontend (`frontend/.env`)

All frontend vars are prefixed with `VITE_` and injected at build time.

```env
# API
VITE_API_URL=http://localhost:5001   # backend base URL (deployed origin in prod)
VITE_SOCKET_URL=                     # (optional) SSE/socket base; blank = reuse API URL

# App
VITE_APP_ENV=development             # development | production

# Auth (Clerk) — https://dashboard.clerk.com/~/api-keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_CLERK_PUBLISHABLE_KEY

# AI / LLM
VITE_LLM_PROVIDER=groq               # mirrors backend provider
VITE_DEFAULT_MODEL=llama-3.3-70b-versatile
VITE_AVAILABLE_MODELS=llama-3.3-70b-versatile,llama-3.1-8b-instant,openai/gpt-oss-120b,gemma2-9b-it
# (optional) id:Label pairs, comma-separated
VITE_MODEL_LABELS=llama-3.3-70b-versatile:Llama 3.3 70B,llama-3.1-8b-instant:Llama 3.1 8B,openai/gpt-oss-120b:GPT-OSS 120B,gemma2-9b-it:Gemma 2 9B
```

**Required:** `VITE_API_URL`, `VITE_APP_ENV`, `VITE_CLERK_PUBLISHABLE_KEY`,
`VITE_LLM_PROVIDER`, `VITE_DEFAULT_MODEL`, `VITE_AVAILABLE_MODELS`.
**Optional:** `VITE_SOCKET_URL`, `VITE_MODEL_LABELS`.

## 2. Prerequisites

- Node.js v18+ (developed on Node 25)
- MongoDB running locally or a MongoDB Atlas cluster
- A free Groq API key
- A Clerk application (free) — for the publishable + secret keys
  (https://dashboard.clerk.com/~/api-keys)

## 3. Install & Run

```bash
# from the repo root
npm run build        # installs root + backend + frontend deps and builds the UI

# development (backend + frontend together with hot reload)
npm run dev:both

# or individually
npm run dev          # backend on http://localhost:5001
npm run frontend     # frontend on http://localhost:5173
```

### Production with Docker

A single multi-stage image (`Dockerfile` at the repo root) builds the SPA and
runs the API that serves it — the whole app is reachable on **one origin/port**,
so there is no CORS to configure and only one URL to expose.

```bash
# from the repo root — reads the shared .env for build args + runtime config
docker compose up --build

# then open http://localhost:5002   (or whatever PORT is set to)
```

Notes:

- `VITE_*` values are inlined into the bundle at **build time** (passed as build
  args); backend secrets are injected at **runtime** via `env_file` and are never
  baked into the image. The build context excludes `.env` (see `.dockerignore`).
- `docker compose` forces `NODE_ENV=production`. Set `CLIENT_URL` to the public
  URL and leave `VITE_API_URL` blank (same origin) for a real deploy.
- The container runs as a non-root user, is supervised by `tini` (clean SIGTERM →
  graceful shutdown), and exposes a `/api/health` healthcheck.
- The image is portable — run it on Render, Railway, Fly.io, Cloud Run, a VM, etc.

## 4. API Overview

| Method | Endpoint                       | Purpose                              |
|--------|--------------------------------|--------------------------------------|
| POST   | `/api/auth/signup`             | Register                             |
| POST   | `/api/auth/login`              | Log in                               |
| POST   | `/api/auth/logout`             | Log out                              |
| GET    | `/api/auth/check`              | Restore session                      |
| POST   | `/api/chat/message`            | Send message (non-streaming)         |
| POST   | `/api/chat/message/stream`     | Send message, **stream** reply (SSE) |
| GET    | `/api/chat/models`             | List available Groq models           |
| GET    | `/api/chat/ai-status`          | AI provider status                   |
| GET    | `/api/chat/sessions`           | List chat sessions                   |
| GET    | `/api/chat/history/:sessionId` | Conversation history                 |
| PATCH  | `/api/chat/session/:sessionId` | Rename a conversation                |
| DELETE | `/api/chat/session/:sessionId` | Delete a conversation                |
| DELETE | `/api/chat/clear-all`          | Delete all conversations             |
| GET    | `/api/health`                  | Server health check                  |

## 5. Models

The server exposes a curated set of Groq models (see `src/lib/groq.js`).
The default is **Llama 3.3 70B Versatile**. Unknown/deprecated model ids are
automatically replaced with the default, and any API failure falls back to a
safe canned response so the UI never breaks.
