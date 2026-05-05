/**
 * Base error class for all integration errors
 */
export class IntegrationError extends Error {
  constructor(
    public readonly integration: string,
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends IntegrationError {
  constructor(integration: string, message: string, details?: unknown) {
    super(integration, message, 401, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when API rate limits are hit
 */
export class RateLimitError extends IntegrationError {
  constructor(integration: string, retryAfter?: number) {
    super(
      integration,
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
      429,
      'RATE_LIMIT',
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when the integration service is unavailable
 */
export class ServiceUnavailableError extends IntegrationError {
  constructor(integration: string, message?: string) {
    super(integration, message || 'Service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Base interface for integration configuration
 */
export interface IntegrationConfig {
  /**
   * Base URL for the integration API
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Additional headers to include in all requests
   */
  headers?: Record<string, string>;
}

/**
 * Integration represents a connection to an external service
 *
 * Integrations handle:
 * - Authentication
 * - HTTP communication
 * - Error handling and retries
 * - Rate limiting
 *
 * They should NOT contain business logic - that belongs in Operators.
 *
 * @template TConfig - Configuration type for this integration
 *
 * @example
 * ```ts
 * const gmailIntegration: Integration<GmailConfig> = {
 *   name: 'gmail',
 *   create: (config) => new GmailClient(config)
 * };
 * ```
 */
export interface Integration<TConfig extends IntegrationConfig> {
  /**
   * Unique identifier for this integration
   */
  name: string;

  /**
   * Create a new client instance for this integration
   *
   * @param config - Configuration for the client
   * @returns Client instance
   */
  create: (config: TConfig) => unknown;
}
