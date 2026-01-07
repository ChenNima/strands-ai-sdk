/**
 * Required environment variables for the application
 */
const requiredEnvVars = [
  'NEXT_PUBLIC_OIDC_ISSUER',
  'NEXT_PUBLIC_OIDC_CLIENT_ID',
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

/**
 * Validates that all required environment variables are set
 * @throws Error if any required environment variable is missing
 */
export function validateEnv(): void {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Gets an environment variable value
 * @param key - The environment variable key
 * @returns The environment variable value or undefined
 */
export function getEnv(key: RequiredEnvVar): string | undefined {
  return process.env[key];
}

/**
 * Gets an environment variable value or throws if not set
 * @param key - The environment variable key
 * @throws Error if the environment variable is not set
 * @returns The environment variable value
 */
export function requireEnv(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
