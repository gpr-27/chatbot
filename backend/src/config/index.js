// ===========================================================================
// Centralized backend configuration.
//
// This is the ONLY module in the backend that reads `process.env`. Every other
// file imports the validated `config` object from here. There are NO hardcoded
// environment-specific fallbacks (no `process.env.X || "default"`): a missing or
// invalid required variable fails startup immediately with a clear error.
// ===========================================================================

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Load the single shared .env from the REPO ROOT relative to THIS file, so the
// path is independent of the cwd the process is launched from. There is exactly
// one .env for the whole project (backend + frontend); the frontend reads the
// same file via Vite's `envDir`. config/index.js is at backend/src/config, so
// the repo root is three levels up.
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ---------------------------------------------------------------------------
// Validation primitives. Errors are collected so we can report ALL problems at
// once, then exit. Nothing here ever invents a value.
// ---------------------------------------------------------------------------
const errors = [];
const warnings = [];

const raw = (name) => {
  const v = process.env[name];
  return v === undefined || v === null ? "" : String(v).trim();
};

/** Required string. Records an error and returns "" when missing. */
function reqStr(name) {
  const v = raw(name);
  if (v === "") errors.push(`Missing ${name}`);
  return v;
}

/** Required positive integer. */
function reqInt(name) {
  const v = raw(name);
  if (v === "") {
    errors.push(`Missing ${name}`);
    return undefined;
  }
  const n = Number.parseInt(v, 10);
  if (!Number.isInteger(n) || n <= 0 || String(n) !== v) {
    errors.push(`Invalid ${name} — expected a positive integer, got "${v}"`);
    return undefined;
  }
  return n;
}

/** Required comma-separated list → trimmed, de-duped array. */
function reqList(name) {
  const v = raw(name);
  if (v === "") {
    errors.push(`Missing ${name}`);
    return [];
  }
  const items = [...new Set(v.split(",").map((s) => s.trim()).filter(Boolean))];
  if (items.length === 0) errors.push(`Invalid ${name} — no values after parsing "${v}"`);
  return items;
}

/** Required value constrained to a set of allowed values. */
function reqEnum(name, allowed) {
  const v = raw(name);
  if (v === "") {
    errors.push(`Missing ${name}`);
    return v;
  }
  if (!allowed.includes(v)) {
    errors.push(`Invalid ${name} — expected one of [${allowed.join(", ")}], got "${v}"`);
  }
  return v;
}

/** Optional string → undefined when absent (no fallback baked in). */
const optStr = (name) => raw(name) || undefined;

// ---------------------------------------------------------------------------
// Model metadata derivation.
//
// CRITICAL: no model id string is ever written in source. Display metadata is
// derived from the configured ids, with optional human labels supplied via the
// MODEL_LABELS env var ("id:Label,id2:Label2"). If a model is added/removed in
// AVAILABLE_MODELS the UI updates automatically — no code change required.
// ---------------------------------------------------------------------------
function parseLabelMap(rawLabels) {
  const map = {};
  if (!rawLabels) return map;
  for (const pair of rawLabels.split(",")) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const id = pair.slice(0, idx).trim();
    const label = pair.slice(idx + 1).trim();
    if (id && label) map[id] = label;
  }
  return map;
}

/** Title-case a model id slug into a readable display name (fallback only). */
function deriveLabel(id) {
  const slug = id.includes("/") ? id.split("/").slice(1).join("-") : id;
  return slug
    .split(/[-_/]/)
    .filter(Boolean)
    .map((tok) => (/\d/.test(tok) ? tok.toUpperCase() : tok.charAt(0).toUpperCase() + tok.slice(1)))
    .join(" ");
}

/** Pull a "<n>B" parameter-size hint out of an id (e.g. 70b → 70B), else "". */
function deriveSizeTag(id) {
  const m = id.match(/(\d+(?:\.\d+)?)\s*b(?:[-_/]|$)/i);
  return m ? `${m[1].toUpperCase()}B` : "";
}

function buildModels(ids, labelMap, providerLabel) {
  return ids.map((id) => {
    const name = labelMap[id] || deriveLabel(id);
    const tag = deriveSizeTag(id);
    const description = tag
      ? `${tag} model served via ${providerLabel}.`
      : `Model served via ${providerLabel}.`;
    return { id, name, tag, description };
  });
}

// ---------------------------------------------------------------------------
// Read every value from the environment.
// ---------------------------------------------------------------------------
const LOG_LEVELS = ["error", "warn", "info", "debug"];
const NODE_ENVS = ["development", "production", "test"];

const nodeEnv = reqEnum("NODE_ENV", NODE_ENVS);
const port = reqInt("PORT");
const clientUrl = reqStr("CLIENT_URL");
const mongoUri = reqStr("MONGODB_URI");
const clerkPublishableKey = reqStr("CLERK_PUBLISHABLE_KEY");
const clerkSecretKey = reqStr("CLERK_SECRET_KEY");
const logLevel = reqEnum("LOG_LEVEL", LOG_LEVELS);
// Days of inactivity after which an anonymous guest account is auto-deleted
// (MongoDB TTL index on Guest.lastActiveAt).
const guestRetentionDays = reqInt("GUEST_RETENTION_DAYS");

const llmProvider = reqStr("LLM_PROVIDER");
// The credential is read from a PROVIDER-DERIVED variable name so the config
// stays provider-agnostic and no provider name is hardcoded in source:
//   LLM_PROVIDER=groq   → GROQ_API_KEY
//   LLM_PROVIDER=openai → OPENAI_API_KEY
// The variable name is computed from LLM_PROVIDER at load time.
const apiKeyVar = llmProvider ? `${llmProvider.toUpperCase()}_API_KEY` : "";
const apiKey = apiKeyVar ? reqStr(apiKeyVar) : "";
const defaultModel = reqStr("DEFAULT_MODEL");
const availableModelIds = reqList("AVAILABLE_MODELS");
// Optional: model used for cheap/fast operations (title generation, key check).
// Falls back to DEFAULT_MODEL — itself an env value, never a hardcoded string.
const titleModel = optStr("TITLE_MODEL") || defaultModel;
const modelLabels = parseLabelMap(optStr("MODEL_LABELS"));

// ---------------------------------------------------------------------------
// Cross-field semantic validation.
// ---------------------------------------------------------------------------
if (defaultModel && availableModelIds.length && !availableModelIds.includes(defaultModel)) {
  errors.push(
    `DEFAULT_MODEL "${defaultModel}" is not in AVAILABLE_MODELS [${availableModelIds.join(", ")}]`
  );
}
if (titleModel && availableModelIds.length && !availableModelIds.includes(titleModel)) {
  errors.push(
    `TITLE_MODEL "${titleModel}" is not in AVAILABLE_MODELS [${availableModelIds.join(", ")}]`
  );
}
// ---------------------------------------------------------------------------
// Fail fast on any error — before the app does anything else.
// ---------------------------------------------------------------------------
if (errors.length) {
  console.error("\n❌ Configuration error — refusing to start.\n");
  for (const e of errors) console.error(`   ❌ ${e}`);
  console.error("\n   Fix backend/.env (see backend/.env.example) and restart.\n");
  process.exit(1);
}

const isProduction = nodeEnv === "production";
const isDevelopment = nodeEnv === "development";
const providerLabel = llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1);

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  isDevelopment,
  port,
  clientUrl,
  mongoUri,
  logLevel,
  clerk: Object.freeze({
    publishableKey: clerkPublishableKey,
    secretKey: clerkSecretKey,
  }),
  guest: Object.freeze({
    retentionDays: guestRetentionDays,
  }),
  llm: Object.freeze({
    provider: llmProvider,
    providerLabel,
    apiKey,
    defaultModel,
    titleModel,
    modelIds: Object.freeze([...availableModelIds]),
    models: Object.freeze(buildModels(availableModelIds, modelLabels, providerLabel)),
  }),
});

// ---------------------------------------------------------------------------
// Startup diagnostics banner (no secrets are ever printed).
// ---------------------------------------------------------------------------
export function printConfigDiagnostics() {
  const line = "=".repeat(45);
  console.log(line);
  console.log(`NODE_ENV=${config.nodeEnv}`);
  console.log(`PORT=${config.port}`);
  console.log(`CLIENT_URL=${config.clientUrl}`);
  console.log(`LOG_LEVEL=${config.logLevel}`);
  console.log(`LLM_PROVIDER=${config.llm.provider}`);
  console.log(`DEFAULT_MODEL=${config.llm.defaultModel}`);
  console.log(`AVAILABLE_MODELS=${config.llm.modelIds.length} (${config.llm.modelIds.join(", ")})`);
  console.log(`${apiKeyVar}=${config.llm.apiKey ? "configured ✓" : "missing ✗"}`);
  console.log(`CLERK_SECRET_KEY=${config.clerk.secretKey ? "configured ✓" : "missing ✗"}`);
  for (const w of warnings) console.warn(`⚠️  ${w}`);
  console.log(line);
}
