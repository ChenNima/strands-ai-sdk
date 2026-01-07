/**
 * Runtime configuration injected by server component
 * These values are read from environment variables at runtime (not build time)
 */
interface RuntimeConfig {
  OIDC_ISSUER: string;
  OIDC_CLIENT_ID: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export {};
