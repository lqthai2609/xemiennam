/** Credentials only for the exact isolated Day 38 WordPress installation. */
const TEST_API_BASE = "https://laquangthai.datxesaigon.com/alo-day38-test/wp-json/wp/v2";
const TEST_BRANCH = "day38-wordpress-isolated-test";

export function day38TestAuthHeader(apiBase: string): string | null {
  const isTestBranch = process.env.VERCEL_GIT_COMMIT_REF === TEST_BRANCH;
  const flagEnabled = process.env.WP_TEST_APPLICATION_AUTH_ENABLED === "1";
  if (!isTestBranch && !flagEnabled && apiBase !== TEST_API_BASE) {
    return null;
  }
  if (process.env.VERCEL_ENV !== "preview" || !isTestBranch || !flagEnabled || apiBase !== TEST_API_BASE) {
    throw new Error("The Day 38 branch must use only the isolated WordPress Preview credentials and URL.");
  }
  const username = process.env.WP_TEST_USERNAME;
  const password = process.env.WP_TEST_APPLICATION_PASSWORD;
  if (!username || !password) {
    throw new Error("Day 38 test WordPress application credentials are missing.");
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
