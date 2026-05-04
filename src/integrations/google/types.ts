/**
 * Google Service Account credentials
 */
export interface GoogleServiceAccountCredentials {
  /**
   * Service account email (e.g., my-sa@project.iam.gserviceaccount.com)
   */
  email: string;

  /**
   * Private key in PEM format (PKCS8)
   * Should be the full string including headers:
   * -----BEGIN PRIVATE KEY-----
   * ...
   * -----END PRIVATE KEY-----
   */
  privateKey: string;

  /**
   * Email address to impersonate (for domain-wide delegation)
   */
  impersonateEmail: string;
}

/**
 * Google OAuth2 token response
 */
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * JWT claims for Google OAuth2
 */
export interface GoogleJWTClaims {
  iss: string; // Service account email
  sub: string; // Email to impersonate
  scope: string; // Space-separated scopes
  aud: string; // Token endpoint
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
}
