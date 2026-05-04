import { AuthenticationError } from '@/integrations/types';
import type {
  GoogleJWTClaims,
  GoogleOAuth2Credentials,
  GoogleServiceAccountCredentials,
  GoogleTokenResponse,
} from './types';

/**
 * Google OAuth2 token endpoint
 */
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Base64url encode (without padding)
 */
function base64urlEncode(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sign a JWT using RS256 (RSASSA-PKCS1-v1_5) with Web Crypto API
 *
 * This implementation works in Cloudflare Workers using the Web Crypto API.
 * No Node.js dependencies required.
 */
async function signJWT(payload: string, privateKeyPem: string): Promise<string> {
  // Remove PEM headers and whitespace
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // Decode base64 to binary
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the payload
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(payload)
  );

  return base64urlEncode(signature);
}

/**
 * Create a JWT for Google OAuth2 service account authentication
 */
async function createJWT(
  credentials: GoogleServiceAccountCredentials,
  scopes: string[]
): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claims: GoogleJWTClaims = {
    iss: credentials.email,
    sub: credentials.impersonateEmail,
    scope: scopes.join(' '),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaims = base64urlEncode(JSON.stringify(claims));

  const payload = `${encodedHeader}.${encodedClaims}`;
  const signature = await signJWT(payload, credentials.privateKey);

  return `${payload}.${signature}`;
}

/**
 * Exchange a JWT for an OAuth2 access token
 */
async function exchangeJWTForToken(jwt: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AuthenticationError('google', `Failed to exchange JWT for token: ${error}`);
  }

  return response.json<GoogleTokenResponse>();
}

/**
 * Get an OAuth2 access token using a refresh token
 *
 * This is the recommended approach for personal Gmail accounts.
 * The refresh token never expires and can be reused indefinitely.
 *
 * @param credentials - OAuth2 credentials with refresh token
 * @returns OAuth2 access token
 */
export async function getAccessTokenFromRefreshToken(
  credentials: GoogleOAuth2Credentials
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AuthenticationError('google', `Failed to refresh access token: ${error}`);
  }

  const tokenResponse = await response.json<GoogleTokenResponse>();
  return tokenResponse.access_token;
}

/**
 * Get an OAuth2 access token using a Google Service Account
 *
 * This function:
 * 1. Creates a JWT signed with the service account's private key
 * 2. Exchanges the JWT for an access token
 *
 * The access token can then be used to call Google APIs on behalf of the impersonated user.
 * Requires Google Workspace and domain-wide delegation.
 *
 * @param credentials - Service account credentials
 * @param scopes - Array of OAuth2 scopes (e.g., ['https://www.googleapis.com/auth/gmail.readonly'])
 * @returns OAuth2 access token
 */
export async function getGoogleAccessToken(
  credentials: GoogleServiceAccountCredentials,
  scopes: string[]
): Promise<string> {
  try {
    const jwt = await createJWT(credentials, scopes);
    const tokenResponse = await exchangeJWTForToken(jwt);
    return tokenResponse.access_token;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      'google',
      `Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
