# syntax=docker/dockerfile:1
###############################################################################
# Groqbot — single production image.
#
# The backend serves BOTH the JSON API and the built React SPA, so the whole app
# runs from one container on one origin (no CORS, one URL).
#
# Vite inlines VITE_* variables into the static bundle at BUILD time, so those
# are passed as build args (the compose file feeds them from the shared .env).
# Backend secrets/config are injected at RUN time as environment variables and
# are never baked into the image.
###############################################################################

# ----------------------------------------------------------------------------
# Stage 1 — build the frontend (Vite -> static assets)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend

# Install deps first so this layer caches unless the manifests change.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Build-time public config. Vite only exposes VITE_-prefixed vars to the client.
# VITE_API_URL is intentionally optional: blank = same-origin "/api" calls.
ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""
ARG VITE_APP_ENV="production"
ARG VITE_LLM_PROVIDER
ARG VITE_DEFAULT_MODEL
ARG VITE_AVAILABLE_MODELS
ARG VITE_MODEL_LABELS=""
ARG VITE_CLERK_PUBLISHABLE_KEY
# Promote each build arg to an env var (quoted -> values with spaces, e.g.
# MODEL_LABELS, survive). Vite reads VITE_* from process.env during the build.
ENV VITE_API_URL="$VITE_API_URL" \
    VITE_SOCKET_URL="$VITE_SOCKET_URL" \
    VITE_APP_ENV="$VITE_APP_ENV" \
    VITE_LLM_PROVIDER="$VITE_LLM_PROVIDER" \
    VITE_DEFAULT_MODEL="$VITE_DEFAULT_MODEL" \
    VITE_AVAILABLE_MODELS="$VITE_AVAILABLE_MODELS" \
    VITE_MODEL_LABELS="$VITE_MODEL_LABELS" \
    VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY"

COPY frontend/ ./
RUN npm run build          # -> /app/frontend/dist

# ----------------------------------------------------------------------------
# Stage 2 — install backend production dependencies only
# ----------------------------------------------------------------------------
FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ----------------------------------------------------------------------------
# Stage 3 — minimal runtime image
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini = PID 1 that forwards signals (clean SIGTERM -> graceful shutdown) and
# reaps zombies. wget (busybox) is already present for the healthcheck.
RUN apk add --no-cache tini

# Backend production deps + source.
COPY --chown=node:node backend/package.json /app/backend/package.json
COPY --chown=node:node --from=backend-deps /app/backend/node_modules /app/backend/node_modules
COPY --chown=node:node backend/src /app/backend/src

# Built SPA, at the path the backend serves from (../../frontend/dist).
COPY --chown=node:node --from=frontend /app/frontend/dist /app/frontend/dist

USER node

# Documentation only — the real port comes from the PORT env var at runtime.
EXPOSE 5002

# Liveness check against the app's own health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5002}/api/health" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/src/index.js"]
