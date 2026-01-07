/**
 * Server Component that injects runtime environment variables into the client
 * This allows environment variables to be read at runtime in standalone mode,
 * rather than being baked in at build time.
 */
export function RuntimeConfig() {
  const config = {
    OIDC_ISSUER: process.env.OIDC_ISSUER || '',
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || '',
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(config)};`,
      }}
    />
  );
}
