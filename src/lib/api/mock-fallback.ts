function normalizedEnvFlag(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

export function shouldUseMockFallback(): boolean {
  const vercelEnv = normalizedEnvFlag(process.env.VERCEL_ENV);
  if (vercelEnv === "production") return false;

  const explicit = normalizedEnvFlag(process.env.GOCAR_ENABLE_MOCK_FALLBACK);
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  return process.env.NODE_ENV !== "production";
}
