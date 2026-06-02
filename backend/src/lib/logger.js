// ===========================================================================
// Minimal leveled logger.
//
// Levels (most → least severe): error < warn < info < debug. A method becomes
// a no-op when its level is more verbose than the configured LOG_LEVEL. Each
// line is prefixed with an ISO timestamp and the level name.
//
// `config.logLevel` is read LAZILY inside every method (never at import time)
// so this module can be imported by anything — including modules that config
// itself never imports — without creating an import cycle.
// ===========================================================================

import { config } from "../config/index.js";

// Severity order, lowest index = most severe. A message at level L is emitted
// only when its index is <= the index of the configured level.
const LEVELS = ["error", "warn", "info", "debug"];

function shouldLog(level) {
  const threshold = LEVELS.indexOf(config.logLevel);
  const requested = LEVELS.indexOf(level);
  // If the configured level is somehow unknown, fail safe and stay quiet
  // (config validation already guarantees a valid value in practice).
  if (threshold === -1) return false;
  return requested <= threshold;
}

function emit(level, sink, args) {
  if (!shouldLog(level)) return;
  const prefix = `${new Date().toISOString()} ${level.toUpperCase()}`;
  sink(prefix, ...args);
}

export const logger = {
  error(...args) {
    emit("error", console.error, args);
  },
  warn(...args) {
    emit("warn", console.warn, args);
  },
  info(...args) {
    emit("info", console.log, args);
  },
  debug(...args) {
    emit("debug", console.log, args);
  },
};
