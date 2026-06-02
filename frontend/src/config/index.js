// Centralized frontend configuration.
//
// This is the ONLY module in the frontend that reads import.meta.env. Every
// other file imports the frozen `config` object below. No URLs, ports, model
// ids, provider names, or fallback values are hardcoded anywhere else.
//
// Required env vars (build fails fast with a clear error if any is missing):
//   VITE_API_URL          base URL of the backend API (trailing "/" stripped)
//   VITE_APP_ENV          deployment environment label
//   VITE_LLM_PROVIDER     provider name surfaced in the UI
//   VITE_DEFAULT_MODEL    default model id (must be one of VITE_AVAILABLE_MODELS)
//   VITE_AVAILABLE_MODELS comma-separated list of model ids
//
// Optional env vars:
//   VITE_SOCKET_URL       websocket URL (defaults to "")
//   VITE_MODEL_LABELS     "id:Label,id2:Label2" display-name overrides

const env = import.meta.env;

/** Read a required env var, throwing a clear error when missing or empty. */
function required(name) {
  const value = env[name];
  if (value == null || String(value).trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Define it in your .env file (see .env.example).`
    );
  }
  return String(value).trim();
}

/** Read an optional env var, falling back to the supplied default. */
function optional(name, fallback = "") {
  const value = env[name];
  if (value == null || String(value).trim() === "") return fallback;
  return String(value).trim();
}

const apiUrl = required("VITE_API_URL").replace(/\/+$/, "");
const socketUrl = optional("VITE_SOCKET_URL", "").replace(/\/+$/, "");
const appEnv = required("VITE_APP_ENV");
const provider = required("VITE_LLM_PROVIDER");
const defaultModel = required("VITE_DEFAULT_MODEL");

// Parse the comma-separated model id list, de-duplicating while preserving order.
const modelIds = [
  ...new Set(
    required("VITE_AVAILABLE_MODELS")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  ),
];

if (modelIds.length === 0) {
  throw new Error(
    "VITE_AVAILABLE_MODELS must contain at least one model id."
  );
}

// Parse optional "id:Label,id2:Label2" display-name overrides.
const modelLabels = optional("VITE_MODEL_LABELS", "")
  .split(",")
  .map((pair) => pair.trim())
  .filter(Boolean)
  .reduce((acc, pair) => {
    const sep = pair.indexOf(":");
    if (sep <= 0) return acc;
    const id = pair.slice(0, sep).trim();
    const label = pair.slice(sep + 1).trim();
    if (id && label) acc[id] = label;
    return acc;
  }, {});

/**
 * Derive a human display name from a model id slug.
 * - strips any provider prefix before "/"
 * - splits on "-" / "_" and title-cases each token
 * - tokens containing a digit are uppercased (e.g. "70b" -> "70B")
 */
function deriveName(id) {
  const slug = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((token) =>
      /\d/.test(token)
        ? token.toUpperCase()
        : token.charAt(0).toUpperCase() + token.slice(1)
    )
    .join(" ");
}

/** Derive a "<n>B" size tag from the id when a "<number>b" token is present. */
function deriveTag(id) {
  const match = id.match(/(\d+(?:\.\d+)?)\s*b\b/i);
  return match ? `${match[1]}B` : "";
}

const models = modelIds.map((id) => {
  const tag = deriveTag(id);
  return {
    id,
    name: modelLabels[id] || deriveName(id),
    tag,
    description: `${tag ? `${tag} model` : "Model"} served via ${provider}.`,
  };
});

// Validate the default model is one of the parsed ids.
if (!modelIds.includes(defaultModel)) {
  throw new Error(
    `VITE_DEFAULT_MODEL "${defaultModel}" is not present in ` +
      `VITE_AVAILABLE_MODELS (${modelIds.join(", ")}).`
  );
}

export const config = Object.freeze({
  apiUrl,
  socketUrl,
  appEnv,
  provider,
  defaultModel,
  modelIds: Object.freeze([...modelIds]),
  models: Object.freeze(models.map((m) => Object.freeze(m))),
});
