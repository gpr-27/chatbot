# ⚡ Groqbot

A premium, lightning-fast AI chat app powered by **Groq's LPU inference engine**.
Full-stack MERN (MongoDB · Express · React · Node) with token-by-token streaming,
a polished multi-theme UI, markdown + syntax-highlighted code, model switching,
and persistent chat history.

> Migrated from Gemini → **Groq**, with a complete frontend rebuild.

---

## ✨ Features

- **Real-time streaming** — responses stream in token-by-token over SSE.
- **Multiple Groq models** — switch between Llama 3.3 70B, Llama 3.1 8B,
  GPT-OSS 120B and Gemma 2 9B on the fly (selection is remembered).
- **Rich markdown** — headings, lists, tables, blockquotes, inline code, and
  syntax-highlighted code blocks with one-click copy.
- **Conversation management** — auto-generated titles, search, inline rename,
  delete, and clear-all (with confirmation dialogs).
- **Regenerate & stop** — re-roll the last answer or halt generation mid-stream.
- **Light / dark themes** — warm "velocity" aesthetic, remembered across sessions.
- **Secure auth** — managed by [Clerk](https://clerk.com): the frontend wraps
  the app in `<ClerkProvider>`, and the backend verifies requests with
  `clerkMiddleware()` / `getAuth`. (Custom JWT auth has been removed.)
- **Responsive** — collapsible sidebar on desktop, drawer on mobile.
- **Graceful fallback** — works (with canned replies) even without an API key.

## 🧱 Tech Stack

| Layer    | Tech                                                              |
|----------|-------------------------------------------------------------------|
| Frontend | React 19, Vite 7, react-markdown, rehype-highlight, lucide-react  |
| Backend  | Node, Express, Mongoose, groq-sdk, Clerk (@clerk/express)         |
| Database | MongoDB (local or Atlas)                                          |
| AI       | Groq (default model: `llama-3.3-70b-versatile`)                   |

## 🚀 Getting Started

```bash
# 1. Install everything + build the frontend
npm run build

# 2. Configure the backend and frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
#   → set GROQ_API_KEY (https://console.groq.com/keys)
#   → set MONGODB_URI
#   → set Clerk keys from https://dashboard.clerk.com/~/api-keys:
#       backend  CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
#       frontend VITE_CLERK_PUBLISHABLE_KEY
#     (the .env files currently hold placeholders — auth fails until replaced)

# 3. Run in development (backend :5001 + frontend :5173)
npm run dev:both
```

Open **http://localhost:5173**.

## ⚙️ Environment Variables

Everything is configured via env vars — **nothing is hardcoded**. Copy each
`.env.example` to `.env` and fill in the values. See
[`backend/setup.md`](backend/setup.md) for per-variable notes.

**Backend (`backend/.env`)** — required: `NODE_ENV`, `PORT`, `CLIENT_URL`,
`MONGODB_URI`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `LOG_LEVEL`,
`LLM_PROVIDER`, `GROQ_API_KEY`, `DEFAULT_MODEL`, `AVAILABLE_MODELS`; optional:
`TITLE_MODEL`, `MODEL_LABELS`. (`JWT_SECRET` is no longer used.)

**Frontend (`frontend/.env`)** — required: `VITE_APP_ENV`,
`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_LLM_PROVIDER`, `VITE_DEFAULT_MODEL`,
`VITE_AVAILABLE_MODELS`; optional: `VITE_API_URL`, `VITE_SOCKET_URL`,
`VITE_MODEL_LABELS`. All `VITE_*` vars are injected at **build time**. Leave
`VITE_API_URL` blank when the backend serves the SPA (the combined Docker image /
single-URL deploy) so the browser calls a relative `/api`; set it only when the
API lives on a different origin.

Get all Clerk keys from the [Clerk dashboard](https://dashboard.clerk.com/~/api-keys).
The committed `.env` files only contain **placeholders** — the backend won't
authenticate and the frontend `<ClerkProvider>` will error until you paste your
real keys.

### Production

**Bare metal / Node:**

```bash
npm run build      # builds frontend/dist
npm start          # NODE_ENV=production serves the API + built UI on :5001
```

**Docker (recommended — one image, one URL):**

A single multi-stage image builds the SPA and runs the API that serves it, so the
whole app is reachable on one origin (no CORS). All config comes from the shared
root `.env`: `VITE_*` are read as build args, backend vars are injected at runtime.

```bash
docker compose up --build        # build + run
# then open http://localhost:5002   (or whatever PORT is in .env)
```

`docker compose` forces `NODE_ENV=production` and runs as a non-root user with a
`/api/health` healthcheck and graceful (SIGTERM) shutdown. For a real deploy, set
`CLIENT_URL` to your public URL and keep `VITE_API_URL` blank (same origin). The
image can run anywhere — Render, Railway, Fly.io, Cloud Run, a VM, etc. See
[`.env.example`](.env.example) for the production variable notes.

> The build context excludes `.env` (see `.dockerignore`), so secrets are never
> baked into the image — only the public `VITE_*` build args are.

## 🔌 API

See [`backend/setup.md`](backend/setup.md) for the full endpoint reference.
Highlights:

- `POST /api/chat/message/stream` — stream a reply (SSE: `meta` → `token`… → `done`)
- `GET  /api/chat/models` — available Groq models + live status
- `PATCH /api/chat/session/:id` — rename a conversation

## 📁 Structure

```
backend/
  src/
    lib/groq.js          # Groq service: streaming, titles, fallback, model allow-list
    controllers/         # auth + chat (incl. SSE streaming, regenerate)
    routes/ models/ middleware/
frontend/
  src/
    components/          # AuthScreen, ChatApp, Sidebar, ChatView, Composer, …
    context/             # Theme + Toast providers
    lib/api.js           # API client + SSE stream parser
    index.css            # design system (tokens, theme, markdown)
    styles/              # shared + chat stylesheets
```

## 🔐 Security note

`backend/.env` and `frontend/.env` are git-ignored — keep real secrets there.
The committed `*.env.example` files must only ever contain placeholders.
