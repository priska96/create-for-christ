export const SERVER = {
  jsonBodyLimit: 256 * 1024,
  requestsPerMinute: 100,
  uploadRequestsPerMinute: 10,
  rateWindow: "1 minute",
  imageCacheControl: "public, max-age=3600",
} as const;
export const DATABASE = {
  poolSize: 10,
  connectionTimeoutMs: 3000,
  statementTimeoutMs: 5000,
  migrationLock: 62431001,
} as const;
export const MAIL = {
  connectionTimeoutMs: 5000,
  socketTimeoutMs: 10000,
  pollIntervalMs: 1000,
  maxAttempts: 5,
  retryDelaySeconds: 30,
} as const;
export const AUTH_RATE = {
  windowSeconds: 60,
  maxRequests: 60,
  maxSignIns: 10,
} as const;
