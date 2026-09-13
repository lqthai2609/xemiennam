function normalizedEnvFlag(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

/**
 * Mock data is allowed only for local development / preview environments, unless
 * explicitly overridden with GOCAR_ENABLE_MOCK_FALLBACK.
 *
 * Production must never silently fall back to fixture data when CMS data is empty.
 */
export function shouldUseMockFallback(): boolean {
  const explicit = normalizedEnvFlag(process.env.GOCAR_ENABLE_MOCK_FALLBACK);
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const vercelEnv = normalizedEnvFlag(process.env.VERCEL_ENV);
  if (vercelEnv === "production") return false;
  if (vercelEnv === "preview" || vercelEnv === "development") return true;

  return process.env.NODE_ENV !== "production";
}
