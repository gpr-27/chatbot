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

# 2. Configure the ONE shared .env (backend + frontend read the same file)
cp .env.example .env
#   → set GROQ_API_KEY (https://console.groq.com/keys)
#   → set MONGODB_URI
#   → set Clerk keys from https://dashboard.clerk.com/~/api-keys:
#       backend  CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
#       frontend VITE_CLERK_PUBLISHABLE_KEY (same value as the publishable key)
#     (.env.example holds placeholders — auth fails until replaced)

# 3. Run in development (backend :5001 + frontend :5173)
npm run dev:both
```

Open **http://localhost:5173**.

## ⚙️ Environment Variables

Everything is configured via env vars — **nothing is hardcoded**. There is ONE
shared `.env` at the repo root (the backend reads every var; Vite reads the same
file but only exposes `VITE_*` to the browser). Copy `.env.example` → `.env` and
fill in the values. See [`backend/setup.md`](backend/setup.md) for per-variable
notes. In production on Render these are defined in [`render.yaml`](render.yaml)
instead (see below).

**Backend** — required: `NODE_ENV`, `PORT`, `CLIENT_URL`, `MONGODB_URI`,
`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `LOG_LEVEL`, `LLM_PROVIDER`,
`GROQ_API_KEY`, `DEFAULT_MODEL`, `AVAILABLE_MODELS`, `GUEST_RETENTION_DAYS`;
optional: `TITLE_MODEL`, `MODEL_LABELS`.

**Frontend** — required: `VITE_APP_ENV`, `VITE_CLERK_PUBLISHABLE_KEY`,
`VITE_LLM_PROVIDER`, `VITE_DEFAULT_MODEL`, `VITE_AVAILABLE_MODELS`; optional:
`VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_MODEL_LABELS`. All `VITE_*` vars are
inlined at **build time**. Leave `VITE_API_URL` blank when the backend serves the
SPA (the combined single-origin deploy) so the browser calls a relative `/api`;
set it only when the API lives on a different origin.

Get all Clerk keys from the [Clerk dashboard](https://dashboard.clerk.com/~/api-keys).
The committed `.env` files only contain **placeholders** — the backend won't
authenticate and the frontend `<ClerkProvider>` will error until you paste your
real keys.

### Deploy to Render (one service, one URL)

The whole app ships as a single Docker image: a multi-stage build compiles the
SPA and the Node/Express backend serves both the API and that SPA, so everything
is reachable on **one origin** (no CORS, one URL). [`render.yaml`](render.yaml)
is a Blueprint that defines this as a single Docker web service.

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com): **New → Blueprint**,
   then select this repository. Render reads `render.yaml`.
3. Render prompts for every secret (the `sync: false` vars). Paste:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and
     `VITE_CLERK_PUBLISHABLE_KEY` (the last two share the publishable value)
   - `GROQ_API_KEY` — from <https://console.groq.com/keys>
   - `CLIENT_URL` — your `https://<service>.onrender.com` URL (fill in after the
     first deploy if you don't know it yet; the same-origin SPA works regardless)
4. **Apply** / **Deploy**, then open `https://<service>.onrender.com`.

How config reaches the build: Render automatically forwards every service env
var to the Docker build as an `ARG` of the same name, so the `VITE_*` values are
inlined into the bundle at build time; backend secrets are read only at runtime
and are never referenced as build args, so they are never baked into the image.
The container runs as a non-root user, is supervised by `tini` (clean SIGTERM →
graceful shutdown), and Render health-checks `/api/health`.

> The Docker build context excludes `.env` (see `.dockerignore`), so secrets are
> never copied into the image — only the public `VITE_*` build args are inlined.

**Run the same image anywhere (optional):**

```bash
# build (pass the public VITE_* values as build args), then run with backend env
docker build -t groqbot \
  --build-arg VITE_APP_ENV=production \
  --build-arg VITE_LLM_PROVIDER=groq \
  --build-arg VITE_DEFAULT_MODEL=llama-3.3-70b-versatile \
  --build-arg VITE_AVAILABLE_MODELS=llama-3.3-70b-versatile \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx .
docker run -p 10000:10000 --env-file .env -e NODE_ENV=production -e PORT=10000 groqbot
# then open http://localhost:10000
```

**Bare metal / Node (no Docker):**

```bash
npm run build      # installs deps + builds frontend/dist
npm start          # NODE_ENV=production serves the API + built UI on $PORT
```

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
    lib/llm.js           # LLM service: streaming, titles, fallback, model allow-list
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
