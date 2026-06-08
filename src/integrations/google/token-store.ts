import { validateEnv } from '@/shared/errors';
import { getAccessTokenFromRefreshToken } from './auth';
import type { GoogleOAuth2Credentials } from './types';

const REFRESH_TOKEN_KEY = 'oauth:google_refresh_token';

export async function getActiveRefreshToken(env: {
  GMAIL_RULES_KV: KVNamespace;
  GOOGLE_REFRESH_TOKEN?: string;
}): Promise<string> {
  const kvToken = await env.GMAIL_RULES_KV.get(REFRESH_TOKEN_KEY);
  const token = kvToken ?? env.GOOGLE_REFRESH_TOKEN;
  if (!token) {
    throw new Error('No Google refresh token available. Run /reauth in Telegram.');
  }
  return token;
}

export async function saveRefreshToken(
  env: { GMAIL_RULES_KV: KVNamespace },
  token: string
): Promise<void> {
  await env.GMAIL_RULES_KV.put(REFRESH_TOKEN_KEY, token);
}

export async function getGmailAccessToken(env: {
  GMAIL_RULES_KV: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
}): Promise<string> {
  validateEnv(env, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);

  const refreshToken = await getActiveRefreshToken(env);

  const credentials: GoogleOAuth2Credentials = {
    clientId: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
    refreshToken,
  };

  return getAccessTokenFromRefreshToken(credentials);
}
