#!/usr/bin/env bun

/**
 * Check Gmail Token Health
 *
 * Diagnoses the state of the Google OAuth2 credentials used for Gmail.
 * It does NOT print any secret values — only their presence and the
 * results of live calls against Google.
 *
 * Steps:
 *   1. Verify GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN exist
 *   2. Exchange the refresh token for an access token (oauth2.googleapis.com)
 *   3. Call the Gmail profile endpoint to confirm the token actually works
 *
 * Usage:
 *   bun run scripts/check-gmail-token.ts
 *
 * Reads credentials from .dev.vars (same format the worker uses).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';

interface Credentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Parse a .dev.vars / .env style file into a key/value map.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function mask(value: string): string {
  if (!value) return '(empty)';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}…${value.slice(-4)} (len ${value.length})`;
}

function loadCredentials(): Credentials {
  const projectRoot = path.join(__dirname, '..');
  const devVarsPath = path.join(projectRoot, '.dev.vars');

  if (!fs.existsSync(devVarsPath)) {
    throw new Error(`.dev.vars not found at ${devVarsPath}`);
  }

  const env = { ...parseEnvFile(devVarsPath), ...process.env };

  const clientId = env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET ?? '';
  const refreshToken = env.GOOGLE_REFRESH_TOKEN ?? '';

  console.log('Step 1: Checking credentials presence');
  console.log('==========================================================');
  console.log(`  GOOGLE_CLIENT_ID:      ${clientId ? mask(clientId) : 'MISSING ❌'}`);
  console.log(`  GOOGLE_CLIENT_SECRET:  ${clientSecret ? mask(clientSecret) : 'MISSING ❌'}`);
  console.log(`  GOOGLE_REFRESH_TOKEN:  ${refreshToken ? mask(refreshToken) : 'MISSING ❌'}`);
  console.log('');

  const missing: string[] = [];
  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');

  if (missing.length > 0) {
    throw new Error(`Missing required credentials: ${missing.join(', ')}`);
  }

  return { clientId, clientSecret, refreshToken };
}

async function refreshAccessToken(creds: Credentials): Promise<{
  accessToken: string;
  expiresIn: number;
  scope?: string;
}> {
  console.log('Step 2: Exchanging refresh token for access token');
  console.log('==========================================================');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const text = await response.text();

  if (!response.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = `${parsed.error}: ${parsed.error_description ?? '(no description)'}`;
    } catch {
      // keep raw text
    }
    console.log(`  ❌ Token refresh failed (HTTP ${response.status})`);
    console.log(`     ${detail}`);
    console.log('');
    console.log('  Common causes:');
    console.log('   - invalid_grant      → refresh token revoked/expired, or app removed');
    console.log('   - invalid_client     → wrong client id/secret');
    console.log('   - Re-run: bun run scripts/get-refresh-token.ts to mint a new one');
    throw new Error(`Token refresh failed: ${detail}`);
  }

  const data = JSON.parse(text) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };

  console.log('  ✅ Access token obtained');
  console.log(`     expires_in: ${data.expires_in}s (~${Math.round(data.expires_in / 60)} min)`);
  if (data.scope) console.log(`     scopes: ${data.scope}`);
  console.log('');

  return { accessToken: data.access_token, expiresIn: data.expires_in, scope: data.scope };
}

async function checkGmailProfile(accessToken: string): Promise<void> {
  console.log('Step 3: Calling Gmail profile endpoint');
  console.log('==========================================================');

  const response = await fetch(GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await response.text();

  if (!response.ok) {
    console.log(`  ❌ Gmail API call failed (HTTP ${response.status})`);
    console.log(`     ${text}`);
    console.log('');
    console.log('  Token was minted but Gmail rejected it — likely missing scopes');
    console.log('  (need gmail.modify / gmail.labels) or the Gmail API is disabled.');
    throw new Error(`Gmail profile call failed (HTTP ${response.status})`);
  }

  const profile = JSON.parse(text) as {
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
    historyId: string;
  };

  console.log('  ✅ Gmail API reachable and token valid');
  console.log(`     account:       ${profile.emailAddress}`);
  console.log(`     messagesTotal: ${profile.messagesTotal}`);
  console.log(`     threadsTotal:  ${profile.threadsTotal}`);
  console.log('');
}

async function main() {
  console.log('');
  console.log('==========================================================');
  console.log('   Gmail Token Health Check - Secretario');
  console.log('==========================================================');
  console.log('');

  try {
    const creds = loadCredentials();
    const { accessToken } = await refreshAccessToken(creds);
    await checkGmailProfile(accessToken);

    console.log('==========================================================');
    console.log(' RESULT: ✅ Gmail token is HEALTHY');
    console.log('==========================================================');
    console.log('');
  } catch (error) {
    console.log('');
    console.log('==========================================================');
    console.log(' RESULT: ❌ Gmail token is BROKEN');
    console.log('==========================================================');
    console.error(` ${error instanceof Error ? error.message : error}`);
    console.log('');
    process.exit(1);
  }
}

main();
