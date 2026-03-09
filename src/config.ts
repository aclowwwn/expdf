export interface WorkerConfig {
  port: number;
  apiKey: string;
  maxHtmlBytes: number;
  renderTimeoutMs: number;
  nodeEnv: string;
}

function getEnvNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return parsed;
}

function getEnvString(name: string, defaultValue?: string): string {
  const raw = process.env[name] ?? defaultValue;
  if (!raw) {
    throw new Error(`Missing required env var ${name}`);
  }
  return raw;
}

export const config: WorkerConfig = {
  port: getEnvNumber("PORT", 3010),
  apiKey: getEnvString("RENDER_API_KEY", "dev-api-key"),
  maxHtmlBytes: getEnvNumber("MAX_HTML_BYTES", 5 * 1024 * 1024),
  renderTimeoutMs: getEnvNumber("RENDER_TIMEOUT_MS", 25_000),
  nodeEnv: process.env.NODE_ENV ?? "production"
};
