import { TelegramClient } from '@/integrations/telegram/client';
import type { GoogleTokenResponse } from './types';

export const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

export function buildAuthUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_OAUTH_SCOPES.join(' '),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens({
  clientId,
  clientSecret,
  code,
  redirectUri,
}: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json<GoogleTokenResponse>();
}

export async function getProfileEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Gmail profile: ${error}`);
  }

  const profile = await response.json<{ emailAddress: string }>();
  return profile.emailAddress;
}

export async function sendReauthLink(
  env: {
    GMAIL_RULES_KV: KVNamespace;
    GOOGLE_CLIENT_ID?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
  },
  baseUrl: string
): Promise<void> {
  const state = crypto.randomUUID();
  await env.GMAIL_RULES_KV.put(`oauth:state:${state}`, '1', { expirationTtl: 900 });

  const redirectUri = `${baseUrl}/oauth/callback`;
  const authUrl = buildAuthUrl({
    clientId: env.GOOGLE_CLIENT_ID!,
    redirectUri,
    state,
  });

  const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN!);
  await telegram.sendMessage({
    chat_id: env.TELEGRAM_CHAT_ID!,
    text: `🔐 <a href="${authUrl}">Re-authorize Gmail</a>\n\nThis link expires in 15 minutes.`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}
