/// <reference types="vite/client" />

// =============================================================================
// Typed contract for the frontend's build-time environment.
//
// Vite inlines every VITE_-prefixed variable into the bundle at BUILD time and
// exposes them on `import.meta.env`. This file documents and type-checks the
// exact set the app reads (see frontend/src/config/index.js — the ONLY module
// that touches import.meta.env). Anything not prefixed with VITE_ is a backend
// secret and is intentionally NOT declared here, so it can never leak to the
// browser.
//
// On Render (native build) these are injected into the build environment and
// Vite picks them up from process.env; locally they come from the repo-root
// .env (Vite reads it via `envDir`). Values shown are illustrative.
// =============================================================================

interface ImportMetaEnv {
  /** Deployment label surfaced in the UI. Required. e.g. "production" */
  readonly VITE_APP_ENV: string;

  /** Active LLM provider name shown in the UI. Required. e.g. "groq" */
  readonly VITE_LLM_PROVIDER: string;

  /** Default model id, pre-selected in the picker. Required. Must be one of VITE_AVAILABLE_MODELS. */
  readonly VITE_DEFAULT_MODEL: string;

  /** Comma-separated allow-list of selectable model ids. Required. */
  readonly VITE_AVAILABLE_MODELS: string;

  /** Clerk publishable (browser) key. Read automatically by <ClerkProvider>. Required for auth UI. e.g. "pk_test_..." */
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;

  /**
   * Base URL of the backend API. Optional — leave BLANK for the combined
   * single-origin deploy (the backend serves the SPA), so requests hit a
   * relative "/api/…" path. Set only when the API lives on a different origin.
   */
  readonly VITE_API_URL?: string;

  /** Optional websocket/SSE base URL. Defaults to "" (reuse the API origin). */
  readonly VITE_SOCKET_URL?: string;

  /** Optional human-friendly model labels: "id:Label,id2:Label2". */
  readonly VITE_MODEL_LABELS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
