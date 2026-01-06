'use client';

import { UserManager, WebStorageStateStore, Log } from 'oidc-client-ts';

// Enable OIDC client logging in development
if (process.env.NODE_ENV === 'development') {
  Log.setLogger(console);
  Log.setLevel(Log.DEBUG);
}

// OIDC configuration - only issuer and client_id are required
// All other endpoints are auto-discovered from .well-known/openid-configuration
const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || '';
const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || '';

export const oidcConfig = {
  authority: issuer, // Authority is the issuer URL
  client_id: clientId,
  redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : '',
  response_type: 'code',
  scope: 'openid profile email',
  post_logout_redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
  userStore: typeof window !== 'undefined' ? new WebStorageStateStore({ store: window.localStorage }) : undefined,
  // PKCE configuration for secure authorization
  code_challenge_method: 'S256' as const,
  automaticSilentRenew: true,
  silent_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/silent-renew` : '',
  // Auto-discovery: UserManager will automatically fetch endpoints from
  // {issuer}/.well-known/openid-configuration
};

let userManagerInstance: UserManager | null = null;

export const getUserManager = (): UserManager => {
  if (!userManagerInstance && typeof window !== 'undefined') {
    userManagerInstance = new UserManager(oidcConfig);
  }
  return userManagerInstance!;
};

export const login = async () => {
  const userManager = getUserManager();
  await userManager.signinRedirect();
};

export const logout = async () => {
  const userManager = getUserManager();
  await userManager.signoutRedirect();
};

export const handleCallback = async () => {
  const userManager = getUserManager();
  const user = await userManager.signinRedirectCallback();
  return user;
};

export const getUser = async () => {
  const userManager = getUserManager();
  return await userManager.getUser();
};

export const getAccessToken = async (): Promise<string | null> => {
  const user = await getUser();
  return user?.access_token || null;
};
